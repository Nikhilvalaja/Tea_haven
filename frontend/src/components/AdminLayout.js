import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { showInfo } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    const userName = user?.firstName || 'Admin';
    await logout();
    showInfo(`Goodbye, ${userName}! You have been logged out.`);
    navigate('/login');
  };

  const getRoleLabel = () => {
    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      manager: 'Manager'
    };
    return labels[user?.role] || 'Staff';
  };

  const getRoleColor = () => {
    const colors = {
      super_admin: '#7B1FA2',
      admin: '#1976D2',
      manager: '#F57C00'
    };
    return colors[user?.role] || '#666';
  };

  const menuItems = [
    {
      path: '/admin',
      icon: '📊',
      label: 'Dashboard',
      exact: true
    },
    {
      path: '/admin/products',
      icon: '🍵',
      label: 'Products'
    },
    {
      path: '/admin/inventory',
      icon: '📦',
      label: 'Inventory'
    },
    {
      path: '/admin/orders',
      icon: '🛒',
      label: 'Orders'
    },
    {
      path: '/admin/users',
      icon: '👥',
      label: 'Users',
      roles: ['admin', 'super_admin']
    },
    {
      path: '/admin/reports',
      icon: '📈',
      label: 'Reports'
    },
    {
      path: '/admin/settings',
      icon: '⚙️',
      label: 'Settings',
      roles: ['super_admin']
    }
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const canAccess = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="admin-sidebar-header">
          <Link to="/admin" className="admin-logo">
            <span className="admin-logo-icon">🍵</span>
            {!sidebarCollapsed && <span className="admin-logo-text">TeaHaven</span>}
          </Link>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* User Info */}
        <div className="admin-user-info">
          <div className="admin-avatar">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          {!sidebarCollapsed && (
            <div className="admin-user-details">
              <span className="admin-user-name">{user?.firstName} {user?.lastName}</span>
              <span className="admin-user-role" style={{ color: getRoleColor() }}>
                {getRoleLabel()}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="admin-nav">
          {menuItems.filter(canAccess).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
              title={sidebarCollapsed ? item.label : ''}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="admin-nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-nav-item" title="View Store">
            <span className="admin-nav-icon">🏪</span>
            {!sidebarCollapsed && <span className="admin-nav-label">View Store</span>}
          </Link>
          <button onClick={handleLogout} className="admin-nav-item logout-btn">
            <span className="admin-nav-icon">🚪</span>
            {!sidebarCollapsed && <span className="admin-nav-label">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <h1 className="admin-page-title">
              {menuItems.find(item => isActive(item.path, item.exact))?.label || 'Admin'}
            </h1>
          </div>
          <div className="admin-topbar-right">
            <span className="admin-date">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            <div className="admin-topbar-user">
              <span>{user?.email}</span>
              <div
                className="admin-role-badge"
                style={{ backgroundColor: getRoleColor() }}
              >
                {getRoleLabel()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
