// ============================================
// LOGIN PAGE
// ============================================
// Handles user login with email and password
//
// KEY CONCEPTS:
// - Controlled inputs: React controls form values via state
// - Form submission: Prevent default, handle via JavaScript
// - Navigation: useNavigate to redirect after login
// ============================================

import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Login = () => {
  // ----------------------------------------
  // Hooks
  // ----------------------------------------
  const { login, loading, error, setError } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get the page user was trying to access before login
  // Check both location.state and URL params (for Stripe redirects)
  const returnUrl = searchParams.get('returnUrl');
  const from = returnUrl || location.state?.from?.pathname || '/';
  
  // ----------------------------------------
  // Form State
  // ----------------------------------------
  // useState for each form field (controlled inputs)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  
  // ----------------------------------------
  // Handle Input Change
  // ----------------------------------------
  // This function runs every time user types in an input
  // [e.target.name] = dynamic key based on input's name attribute
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,        // Keep other fields
      [name]: value   // Update changed field
    }));
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear global error
    if (error) setError(null);
  };
  
  // ----------------------------------------
  // Validate Form
  // ----------------------------------------
  const validateForm = () => {
    const errors = {};
    
    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // ----------------------------------------
  // Handle Form Submit
  // ----------------------------------------
  const handleSubmit = async (e) => {
    // Prevent default form submission (page reload)
    e.preventDefault();

    // Validate first
    if (!validateForm()) return;

    // Attempt login
    const result = await login(formData.email, formData.password);

    if (result.success) {
      const user = result.user;
      const isAdminRole = ['super_admin', 'admin', 'manager'].includes(user?.role);

      // Show toast notification with role info
      const roleLabels = {
        super_admin: 'Super Admin',
        admin: 'Admin',
        manager: 'Manager',
        customer: ''
      };
      const roleLabel = roleLabels[user?.role] || '';
      const welcomeMsg = roleLabel
        ? `Welcome back, ${user.firstName}! (${roleLabel})`
        : `Welcome back, ${user?.firstName || 'User'}!`;

      showSuccess(welcomeMsg);

      // Admin users go directly to admin panel
      if (isAdminRole) {
        navigate('/admin', { replace: true });
      } else {
        // Regular customers go to their intended destination or home
        navigate(from, { replace: true });
      }
    }
    // If login fails, error is set in AuthContext
  };
  
  // ----------------------------------------
  // Render
  // ----------------------------------------
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your TeaHaven account</p>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}
        
        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={formErrors.email ? 'input-error' : ''}
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
            {formErrors.email && (
              <span className="error-message">{formErrors.email}</span>
            )}
          </div>
          
          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={formErrors.password ? 'input-error' : ''}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {formErrors.password && (
              <span className="error-message">{formErrors.password}</span>
            )}
          </div>
          
          {/* Forgot Password Link */}
          <div style={{ textAlign: 'right', marginBottom: '15px' }}>
            <Link to="/forgot-password" style={{ fontSize: '14px', color: '#2E7D32' }}>
              Forgot Password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        {/* Footer Links */}
        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;