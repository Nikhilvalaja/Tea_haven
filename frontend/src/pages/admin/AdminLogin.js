import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const AdminLogin = () => {
  const { login, loading, error, setError } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (error) setError(null);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const result = await login(formData.email, formData.password);

    if (result.success) {
      const user = result.user;
      const isAdminRole = ['super_admin', 'admin', 'manager'].includes(user?.role);

      if (!isAdminRole) {
        // Not an admin - show error and logout
        showError('Access denied. This login is for administrators only.');
        // Clear session
        localStorage.removeItem('teahaven_token');
        localStorage.removeItem('teahaven_user');
        return;
      }

      // Admin login successful
      const roleLabels = {
        super_admin: 'Super Admin',
        admin: 'Admin',
        manager: 'Manager'
      };
      showSuccess(`Welcome, ${user.firstName}! (${roleLabels[user.role]})`);
      navigate('/admin', { replace: true });
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-login-logo">
              <span>🍵</span>
              <h1>TeaHaven</h1>
            </div>
            <h2>Admin Portal</h2>
            <p>Sign in to access the administration panel</p>
          </div>

          {error && (
            <div className="admin-login-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="admin-form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@teahaven.com"
                className={formErrors.email ? 'input-error' : ''}
                disabled={loading}
                autoComplete="email"
                autoFocus
              />
              {formErrors.email && (
                <span className="error-text">{formErrors.email}</span>
              )}
            </div>

            <div className="admin-form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
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
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {formErrors.password && (
                <span className="error-text">{formErrors.password}</span>
              )}
            </div>

            <button
              type="submit"
              className="admin-login-btn"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In to Admin'}
            </button>
          </form>

          <div className="admin-login-footer">
            <a href="/">← Back to Store</a>
          </div>
        </div>

        <div className="admin-login-info">
          <h3>Administrator Access Only</h3>
          <p>This portal is restricted to authorized personnel only.</p>
          <ul>
            <li>Super Admins - Full system access</li>
            <li>Admins - User & inventory management</li>
            <li>Managers - Inventory & order management</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
