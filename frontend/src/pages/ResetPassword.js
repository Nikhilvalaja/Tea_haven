// ============================================
// RESET PASSWORD PAGE
// ============================================

import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password: formData.password
      });

      setMessage(response.data.message || 'Password reset successful!');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Reset Password</h1>
          <p>Enter your new password below</p>
        </div>

        {message && (
          <div className="alert alert-success">
            <span>✓</span> {message}
            <p style={{ fontSize: '14px', marginTop: '10px' }}>
              Redirecting to login...
            </p>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  disabled={loading}
                  autoComplete="new-password"
                  autoFocus
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
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>
            <Link to="/login">Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
