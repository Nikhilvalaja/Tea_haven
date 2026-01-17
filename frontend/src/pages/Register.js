// ============================================
// REGISTER PAGE
// ============================================
// Handles new user registration
// Includes client-side validation that mirrors server validation

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  // ----------------------------------------
  // Hooks
  // ----------------------------------------
  const { register, loading, error, setError } = useAuth();
  const navigate = useNavigate();
  
  // ----------------------------------------
  // Form State
  // ----------------------------------------
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // ----------------------------------------
  // Handle Input Change
  // ----------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    if (error) setError(null);
  };
  
  // ----------------------------------------
  // Validate Form
  // ----------------------------------------
  const validateForm = () => {
    const errors = {};
    
    // First name
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.length > 100) {
      errors.firstName = 'First name must be less than 100 characters';
    }
    
    // Last name
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.length > 100) {
      errors.lastName = 'Last name must be less than 100 characters';
    }
    
    // Email
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (!/\d/.test(formData.password)) {
      errors.password = 'Password must contain at least one number';
    }
    
    // Confirm password
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // ----------------------------------------
  // Handle Form Submit
  // ----------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const result = await register(
      formData.email,
      formData.password,
      formData.firstName,
      formData.lastName
    );
    
    if (result.success) {
      navigate('/');
    }
  };
  
  // ----------------------------------------
  // Password Strength Indicator
  // ----------------------------------------
  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { level: 0, text: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;
    
    if (strength < 2) return { level: 1, text: 'Weak', color: '#f44336' };
    if (strength < 4) return { level: 2, text: 'Medium', color: '#ff9800' };
    return { level: 3, text: 'Strong', color: '#4caf50' };
  };
  
  const passwordStrength = getPasswordStrength();
  
  // ----------------------------------------
  // Render
  // ----------------------------------------
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join TeaHaven and start exploring</p>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}
        
        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Name Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                className={formErrors.firstName ? 'input-error' : ''}
                disabled={loading}
                autoComplete="given-name"
                autoFocus
              />
              {formErrors.firstName && (
                <span className="error-message">{formErrors.firstName}</span>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Doe"
                className={formErrors.lastName ? 'input-error' : ''}
                disabled={loading}
                autoComplete="family-name"
              />
              {formErrors.lastName && (
                <span className="error-message">{formErrors.lastName}</span>
              )}
            </div>
          </div>
          
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
                placeholder="Min 6 characters, include a number"
                className={formErrors.password ? 'input-error' : ''}
                disabled={loading}
                autoComplete="new-password"
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
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bars">
                  <div className={`bar ${passwordStrength.level >= 1 ? 'active' : ''}`} 
                       style={{ backgroundColor: passwordStrength.level >= 1 ? passwordStrength.color : '' }}></div>
                  <div className={`bar ${passwordStrength.level >= 2 ? 'active' : ''}`}
                       style={{ backgroundColor: passwordStrength.level >= 2 ? passwordStrength.color : '' }}></div>
                  <div className={`bar ${passwordStrength.level >= 3 ? 'active' : ''}`}
                       style={{ backgroundColor: passwordStrength.level >= 3 ? passwordStrength.color : '' }}></div>
                </div>
                <span style={{ color: passwordStrength.color }}>{passwordStrength.text}</span>
              </div>
            )}
          </div>
          
          {/* Confirm Password Field */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                className={formErrors.confirmPassword ? 'input-error' : ''}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {formErrors.confirmPassword && (
              <span className="error-message">{formErrors.confirmPassword}</span>
            )}
          </div>
          
          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        {/* Footer */}
        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;