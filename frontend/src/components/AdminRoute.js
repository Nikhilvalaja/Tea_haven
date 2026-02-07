import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  // Admin roles that have access
  const adminRoles = ['manager', 'admin', 'super_admin'];

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to admin login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check if user has admin role
  const isAdmin = user?.role && adminRoles.includes(user.role);

  // Redirect to access denied if not admin
  if (!isAdmin) {
    return (
      <div className="admin-access-denied">
        <div className="access-denied-card">
          <span className="access-denied-icon">🚫</span>
          <h1>Access Denied</h1>
          <p>You don't have permission to access the admin panel.</p>
          <p className="access-denied-detail">
            This area is restricted to administrators only.
          </p>
          <div className="access-denied-actions">
            <a href="/" className="btn-back-home">← Back to Store</a>
            <a href="/admin/login" className="btn-admin-login">Admin Login</a>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
