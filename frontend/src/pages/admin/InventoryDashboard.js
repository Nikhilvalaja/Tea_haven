import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import ProductManagement from './ProductManagement';

const InventoryDashboard = () => {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [salesAnalytics, setSalesAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState('30days');

  // Stock adjustment modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchDashboard();
      fetchInventory();
      fetchSalesAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchInventory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchTerm, token]);

  useEffect(() => {
    if (token) {
      fetchSalesAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, token]);

  const fetchDashboard = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/inventory/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('Dashboard API response:', data);
      if (data.success) {
        setDashboard(data.data);
      } else {
        console.error('Dashboard API error:', data.message);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  };

  const fetchInventory = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        search: searchTerm,
        limit: 100
      });
      const response = await fetch(`/api/inventory?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setInventory(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesAnalytics = async () => {
    if (!token) return;
    try {
      const response = await fetch(`/api/inventory/analytics/sales?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSalesAnalytics(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch sales analytics:', err);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedProduct || adjustmentQty <= 0) return;

    setAdjusting(true);
    try {
      const endpoint = adjustmentType === 'add' ? '/api/inventory/add-stock' : '/api/inventory/adjust-stock';
      const body = {
        productId: selectedProduct.id,
        quantity: adjustmentType === 'subtract' ? -adjustmentQty : adjustmentQty,
        reason: adjustmentReason,
        action: adjustmentType
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (data.success) {
        alert(`Stock ${adjustmentType === 'add' ? 'added' : 'adjusted'} successfully!`);
        setShowAdjustModal(false);
        setSelectedProduct(null);
        setAdjustmentQty(0);
        setAdjustmentReason('');
        fetchInventory();
        fetchDashboard();
      } else {
        alert(data.message || 'Failed to adjust stock');
      }
    } catch (err) {
      console.error('Stock adjustment error:', err);
      alert('Failed to adjust stock');
    } finally {
      setAdjusting(false);
    }
  };

  const openAdjustModal = (product, type = 'add') => {
    setSelectedProduct(product);
    setAdjustmentType(type);
    setAdjustmentQty(0);
    setAdjustmentReason('');
    setShowAdjustModal(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  const getStockStatusClass = (status) => {
    switch (status) {
      case 'out_of_stock': return 'status-out-of-stock';
      case 'low_stock': return 'status-low-stock';
      default: return 'status-in-stock';
    }
  };

  return (
    <div className="inventory-dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Inventory Dashboard</h1>
          <p className="dashboard-subtitle">Manage stock levels, track sales, and monitor inventory</p>
        </div>

        {/* Tab Navigation */}
        <div className="dashboard-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            Products
          </button>
          <button
            className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            Sales Analytics
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && !dashboard && (
          <div className="loading-state">
            <p>Loading inventory overview...</p>
          </div>
        )}
        {activeTab === 'overview' && dashboard && (
          <div className="dashboard-overview">
            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-content">
                  <h3>Total Products</h3>
                  <p className="stat-value">{dashboard.overview.totalProducts}</p>
                </div>
              </div>
              <div className="stat-card stat-success">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <h3>In Stock</h3>
                  <p className="stat-value">{dashboard.overview.inStock}</p>
                </div>
              </div>
              <div className="stat-card stat-warning">
                <div className="stat-icon">⚠️</div>
                <div className="stat-content">
                  <h3>Low Stock</h3>
                  <p className="stat-value">{dashboard.overview.lowStock}</p>
                </div>
              </div>
              <div className="stat-card stat-danger">
                <div className="stat-icon">❌</div>
                <div className="stat-content">
                  <h3>Out of Stock</h3>
                  <p className="stat-value">{dashboard.overview.outOfStock}</p>
                </div>
              </div>
            </div>

            {/* Value Stats */}
            <div className="value-stats">
              <div className="value-card">
                <h4>Total Units in Stock</h4>
                <p className="value-number">{dashboard.overview.totalUnits?.toLocaleString() || 0}</p>
              </div>
              <div className="value-card">
                <h4>Inventory Cost Value</h4>
                <p className="value-number">{formatCurrency(dashboard.overview.totalCostValue)}</p>
              </div>
              <div className="value-card">
                <h4>Retail Value</h4>
                <p className="value-number">{formatCurrency(dashboard.overview.totalRetailValue)}</p>
              </div>
            </div>

            {/* Top Selling Products */}
            <div className="dashboard-section">
              <h2>Top Selling Products (Last 30 Days)</h2>
              <div className="top-products-list">
                {dashboard.topSelling?.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Units Sold</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.topSelling.map((item, index) => (
                        <tr key={index}>
                          <td>{item.productName}</td>
                          <td>{item.totalSold}</td>
                          <td>{formatCurrency(item.totalRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-data">No sales data available</p>
                )}
              </div>
            </div>

            {/* Products Needing Reorder */}
            <div className="dashboard-section">
              <h2>Products Needing Reorder</h2>
              <div className="reorder-list">
                {dashboard.needsReorder?.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Current Stock</th>
                        <th>Reorder Level</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.needsReorder.map((product) => (
                        <tr key={product.id} className={product.stockQuantity === 0 ? 'row-danger' : 'row-warning'}>
                          <td>{product.name}</td>
                          <td>{product.sku || '-'}</td>
                          <td>{product.stockQuantity}</td>
                          <td>{product.reorderLevel}</td>
                          <td>
                            <button
                              className="btn-sm btn-primary"
                              onClick={() => openAdjustModal(product, 'add')}
                            >
                              Add Stock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-data">All products are well stocked!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Products Tab - Uses ProductManagement Component */}
        {activeTab === 'inventory' && (
          <ProductManagement />
        )}

        {/* Sales Analytics Tab */}
        {activeTab === 'sales' && (
          <div className="sales-analytics-section">
            {/* Period Selector */}
            <div className="period-selector">
              <label>Time Period:</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="period-select"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="365days">Last Year</option>
              </select>
            </div>

            {salesAnalytics && (
              <>
                {/* Sales Summary */}
                <div className="sales-summary">
                  <div className="sales-stat-card">
                    <h4>Total Orders</h4>
                    <p className="sales-stat-value">{salesAnalytics.summary.totalOrders}</p>
                  </div>
                  <div className="sales-stat-card">
                    <h4>Total Revenue</h4>
                    <p className="sales-stat-value">{formatCurrency(salesAnalytics.summary.totalRevenue)}</p>
                  </div>
                  <div className="sales-stat-card">
                    <h4>Avg Order Value</h4>
                    <p className="sales-stat-value">{formatCurrency(salesAnalytics.summary.avgOrderValue)}</p>
                  </div>
                  <div className="sales-stat-card">
                    <h4>Units Sold</h4>
                    <p className="sales-stat-value">{salesAnalytics.summary.totalUnitsSold}</p>
                  </div>
                </div>

                {/* Sales by Period */}
                <div className="dashboard-section">
                  <h2>Sales by {salesAnalytics.period === 'daily' ? 'Day' : salesAnalytics.period === 'weekly' ? 'Week' : 'Month'}</h2>
                  {salesAnalytics.salesByPeriod?.length > 0 ? (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th>Orders</th>
                          <th>Revenue</th>
                          <th>Avg Order</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesAnalytics.salesByPeriod.map((row, index) => (
                          <tr key={index}>
                            <td>{row.period}</td>
                            <td>{row.orderCount}</td>
                            <td>{formatCurrency(row.totalSales)}</td>
                            <td>{formatCurrency(row.avgOrderValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="no-data">No sales data for this period</p>
                  )}
                </div>

                {/* Sales by Category */}
                <div className="dashboard-section">
                  <h2>Sales by Category</h2>
                  {salesAnalytics.salesByCategory?.length > 0 ? (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Units Sold</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesAnalytics.salesByCategory.map((row, index) => (
                          <tr key={index}>
                            <td>{row['product.category'] || 'Uncategorized'}</td>
                            <td>{row.totalSold}</td>
                            <td>{formatCurrency(row.totalRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="no-data">No category data available</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Stock Adjustment Modal */}
        {showAdjustModal && selectedProduct && (
          <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{adjustmentType === 'add' ? 'Add Stock' : 'Adjust Stock'}</h2>
                <button className="modal-close" onClick={() => setShowAdjustModal(false)}>×</button>
              </div>
              <form onSubmit={handleAdjustStock}>
                <div className="modal-body">
                  <div className="product-info-modal">
                    <strong>{selectedProduct.name}</strong>
                    <p>Current Stock: {selectedProduct.stockQuantity}</p>
                    <p>SKU: {selectedProduct.sku || 'N/A'}</p>
                  </div>

                  <div className="form-group">
                    <label>Action:</label>
                    <select
                      value={adjustmentType}
                      onChange={(e) => setAdjustmentType(e.target.value)}
                      className="form-select"
                    >
                      <option value="add">Add Stock</option>
                      <option value="subtract">Remove Stock</option>
                      <option value="set">Set Exact Quantity</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Quantity:</label>
                    <input
                      type="number"
                      min="0"
                      value={adjustmentQty}
                      onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Reason (optional):</label>
                    <textarea
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="e.g., New shipment received, Inventory count adjustment..."
                      className="form-textarea"
                    />
                  </div>

                  <div className="adjustment-preview">
                    <strong>Preview:</strong>
                    <p>
                      {adjustmentType === 'set'
                        ? `Stock will be set to ${adjustmentQty}`
                        : adjustmentType === 'add'
                        ? `Stock: ${selectedProduct.stockQuantity} + ${adjustmentQty} = ${selectedProduct.stockQuantity + adjustmentQty}`
                        : `Stock: ${selectedProduct.stockQuantity} - ${adjustmentQty} = ${Math.max(0, selectedProduct.stockQuantity - adjustmentQty)}`}
                    </p>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={adjusting || adjustmentQty <= 0}>
                    {adjusting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryDashboard;
