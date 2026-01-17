// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================
// Wraps routes that require authentication
// Redirects to login if user is not authenticated
//
// USAGE:
// <Route path="/profile" element={
//   <ProtectedRoute>
//     <ProfilePage />
//   </ProtectedRoute>
// } />
// ============================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();
  
  // ----------------------------------------
  // Show loading while checking auth status
  // ----------------------------------------
  // This prevents flash of login page while
  // checking if user is already logged in
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <span className="spinner-icon">🍵</span>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  // ----------------------------------------
  // Not authenticated? Redirect to login
  // ----------------------------------------
  // We save the attempted location so we can
  // redirect back after successful login
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }
  
  // ----------------------------------------
  // Admin required but user is not admin?
  // ----------------------------------------
  if (requireAdmin && user.role !== 'admin') {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }
  
  // ----------------------------------------
  // All checks passed - render the protected content
  // ----------------------------------------
  return children;
};

export default ProtectedRoute;