import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const ReportsPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30days');
  const [salesData, setSalesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [userStats, setUserStats] = useState(null);

  const fetchSalesAnalytics = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/inventory/analytics/sales?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSalesData(data.data);
      }
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
    }
  }, [token, period]);

  const fetchInventoryDashboard = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/inventory/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInventoryData(data.data);
      }
    } catch (error) {
      console.error('Error fetching inventory dashboard:', error);
    }
  }, [token]);

  const fetchUserStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/users/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }, [token]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchSalesAnalytics(),
        fetchInventoryDashboard(),
        fetchUserStats()
      ]);
      setLoading(false);
    };
    fetchAll();
  }, [fetchSalesAnalytics, fetchInventoryDashboard, fetchUserStats]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="admin-reports-page">
      <div className="reports-header">
        <h2>Reports & Analytics</h2>
        <div className="period-selector">
          <label>Time Period:</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="365days">Last Year</option>
          </select>
        </div>
      </div>

      {/* Sales Summary */}
      <section className="report-section">
        <h3>Sales Summary</h3>
        <div className="summary-cards">
          <div className="summary-card revenue">
            <span className="card-icon">💰</span>
            <div className="card-content">
              <span className="card-value">{formatCurrency(salesData?.summary?.totalRevenue)}</span>
              <span className="card-label">Total Revenue</span>
            </div>
          </div>
          <div className="summary-card orders">
            <span className="card-icon">📦</span>
            <div className="card-content">
              <span className="card-value">{salesData?.summary?.totalOrders || 0}</span>
              <span className="card-label">Total Orders</span>
            </div>
          </div>
          <div className="summary-card avg">
            <span className="card-icon">📊</span>
            <div className="card-content">
              <span className="card-value">{formatCurrency(salesData?.summary?.avgOrderValue)}</span>
              <span className="card-label">Avg Order Value</span>
            </div>
          </div>
          <div className="summary-card units">
            <span className="card-icon">🛒</span>
            <div className="card-content">
              <span className="card-value">{salesData?.summary?.totalUnitsSold || 0}</span>
              <span className="card-label">Units Sold</span>
            </div>
          </div>
        </div>
      </section>

      {/* Sales by Period Chart Data */}
      {salesData?.salesByPeriod && salesData.salesByPeriod.length > 0 && (
        <section className="report-section">
          <h3>Sales Trend ({salesData?.period || 'daily'})</h3>
          <div className="sales-trend-table admin-card">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {salesData.salesByPeriod.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.period}</td>
                    <td>{row.orderCount}</td>
                    <td>{formatCurrency(row.totalSales)}</td>
                    <td>{formatCurrency(row.avgOrderValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Inventory Overview */}
      <section className="report-section">
        <h3>Inventory Overview</h3>
        <div className="summary-cards">
          <div className="summary-card">
            <span className="card-icon">📦</span>
            <div className="card-content">
              <span className="card-value">{inventoryData?.overview?.totalProducts || 0}</span>
              <span className="card-label">Total Products</span>
            </div>
          </div>
          <div className="summary-card success">
            <span className="card-icon">✅</span>
            <div className="card-content">
              <span className="card-value">{inventoryData?.overview?.inStock || 0}</span>
              <span className="card-label">In Stock</span>
            </div>
          </div>
          <div className="summary-card warning">
            <span className="card-icon">⚠️</span>
            <div className="card-content">
              <span className="card-value">{inventoryData?.overview?.lowStock || 0}</span>
              <span className="card-label">Low Stock</span>
            </div>
          </div>
          <div className="summary-card danger">
            <span className="card-icon">❌</span>
            <div className="card-content">
              <span className="card-value">{inventoryData?.overview?.outOfStock || 0}</span>
              <span className="card-label">Out of Stock</span>
            </div>
          </div>
        </div>

        <div className="inventory-value admin-card">
          <h4>Inventory Value</h4>
          <div className="value-grid">
            <div className="value-item">
              <span className="label">Total Units in Stock:</span>
              <span className="value">{inventoryData?.overview?.totalUnits || 0}</span>
            </div>
            <div className="value-item">
              <span className="label">Cost Value:</span>
              <span className="value">{formatCurrency(inventoryData?.overview?.totalCostValue)}</span>
            </div>
            <div className="value-item">
              <span className="label">Retail Value:</span>
              <span className="value">{formatCurrency(inventoryData?.overview?.totalRetailValue)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Top Selling Products */}
      {inventoryData?.topSelling && inventoryData.topSelling.length > 0 && (
        <section className="report-section">
          <h3>Top Selling Products (Last 30 Days)</h3>
          <div className="top-products admin-card">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {inventoryData.topSelling.map((product, idx) => (
                  <tr key={idx}>
                    <td>{product.productName}</td>
                    <td>{product.totalSold}</td>
                    <td>{formatCurrency(product.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Products Needing Reorder */}
      {inventoryData?.needsReorder && inventoryData.needsReorder.length > 0 && (
        <section className="report-section">
          <h3>Products Needing Reorder</h3>
          <div className="reorder-list admin-card">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryData.needsReorder.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>{product.stockQuantity}</td>
                    <td>{product.reorderLevel}</td>
                    <td>
                      <span className={`status-badge ${product.stockQuantity === 0 ? 'danger' : 'warning'}`}>
                        {product.stockQuantity === 0 ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* User Statistics */}
      <section className="report-section">
        <h3>User Statistics</h3>
        <div className="summary-cards">
          <div className="summary-card">
            <span className="card-icon">👥</span>
            <div className="card-content">
              <span className="card-value">{userStats?.totalUsers || 0}</span>
              <span className="card-label">Total Users</span>
            </div>
          </div>
          <div className="summary-card">
            <span className="card-icon">🛍️</span>
            <div className="card-content">
              <span className="card-value">{userStats?.byRole?.customers || 0}</span>
              <span className="card-label">Customers</span>
            </div>
          </div>
          <div className="summary-card">
            <span className="card-icon">👔</span>
            <div className="card-content">
              <span className="card-value">{(userStats?.byRole?.managers || 0) + (userStats?.byRole?.admins || 0) + (userStats?.byRole?.superAdmins || 0)}</span>
              <span className="card-label">Staff Members</span>
            </div>
          </div>
          <div className="summary-card success">
            <span className="card-icon">📈</span>
            <div className="card-content">
              <span className="card-value">{userStats?.newUsersMonth || 0}</span>
              <span className="card-label">New This Month</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ReportsPage;
