import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
  const { token, user } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalUsers: 0,
    totalRevenue: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch stats in parallel
      const [inventoryRes, ordersRes, usersRes] = await Promise.all([
        fetch('/api/inventory/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ ok: false })),
        fetch('/api/orders/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ ok: false })),
        fetch('/api/admin/users/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ ok: false }))
      ]);

      // Process inventory stats
      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        if (inventoryData.success) {
          setStats(prev => ({
            ...prev,
            totalProducts: inventoryData.stats?.totalProducts || 0,
            lowStockProducts: inventoryData.stats?.lowStockCount || 0
          }));
          setLowStockItems(inventoryData.stats?.lowStockItems || []);
        }
      }

      // Process orders stats
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (ordersData.success) {
          setStats(prev => ({
            ...prev,
            totalOrders: ordersData.stats?.totalOrders || 0,
            pendingOrders: ordersData.stats?.pendingOrders || 0,
            totalRevenue: ordersData.stats?.totalRevenue || 0
          }));
          setRecentOrders(ordersData.stats?.recentOrders || []);
        }
      }

      // Process users stats
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.success) {
          setStats(prev => ({
            ...prev,
            totalUsers: usersData.stats?.totalUsers || 0
          }));
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Welcome Section */}
      <div className="dashboard-welcome">
        <h2>{getGreeting()}, {user?.firstName}!</h2>
        <p>Here's what's happening with your store today.</p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon products">📦</div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalProducts}</span>
            <span className="stat-label">Total Products</span>
          </div>
          <Link to="/admin/inventory" className="stat-link">View All →</Link>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon low-stock">⚠️</div>
          <div className="stat-content">
            <span className="stat-value">{stats.lowStockProducts}</span>
            <span className="stat-label">Low Stock Items</span>
          </div>
          <Link to="/admin/inventory?filter=low-stock" className="stat-link">View Items →</Link>
        </div>

        <div className="stat-card">
          <div className="stat-icon orders">🛒</div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalOrders}</span>
            <span className="stat-label">Total Orders</span>
          </div>
          <Link to="/admin/orders" className="stat-link">View All →</Link>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon pending">⏳</div>
          <div className="stat-content">
            <span className="stat-value">{stats.pendingOrders}</span>
            <span className="stat-label">Pending Orders</span>
          </div>
          <Link to="/admin/orders?status=pending" className="stat-link">Process →</Link>
        </div>

        <div className="stat-card">
          <div className="stat-icon users">👥</div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalUsers}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <Link to="/admin/users" className="stat-link">Manage →</Link>
        </div>

        <div className="stat-card success">
          <div className="stat-icon revenue">💰</div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(stats.totalRevenue)}</span>
            <span className="stat-label">Total Revenue</span>
          </div>
          <Link to="/admin/reports" className="stat-link">Reports →</Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          <Link to="/admin/inventory/add" className="action-btn primary">
            <span>➕</span> Add Product
          </Link>
          <Link to="/admin/orders?status=pending" className="action-btn">
            <span>📋</span> Process Orders
          </Link>
          <Link to="/admin/inventory?filter=low-stock" className="action-btn warning">
            <span>🔄</span> Restock Items
          </Link>
          <Link to="/admin/reports" className="action-btn">
            <span>📊</span> View Reports
          </Link>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="dashboard-grid">
        {/* Recent Orders */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3>Recent Orders</h3>
            <Link to="/admin/orders" className="view-all-link">View All</Link>
          </div>
          <div className="orders-list">
            {recentOrders.length > 0 ? (
              recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="order-item">
                  <div className="order-info">
                    <span className="order-id">#{order.id}</span>
                    <span className="order-customer">{order.customerName}</span>
                  </div>
                  <div className="order-meta">
                    <span className={`order-status status-${order.status}`}>
                      {order.status}
                    </span>
                    <span className="order-amount">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <span>📭</span>
                <p>No recent orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3>Low Stock Alert</h3>
            <Link to="/admin/inventory?filter=low-stock" className="view-all-link">View All</Link>
          </div>
          <div className="low-stock-list">
            {lowStockItems.length > 0 ? (
              lowStockItems.slice(0, 5).map((item) => (
                <div key={item.id} className="low-stock-item">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-sku">SKU: {item.sku}</span>
                  </div>
                  <div className="item-stock">
                    <span className={`stock-count ${item.quantity <= 5 ? 'critical' : 'warning'}`}>
                      {item.quantity} left
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state success">
                <span>✅</span>
                <p>All items well stocked!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
