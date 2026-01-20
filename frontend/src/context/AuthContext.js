// ============================================
// AUTH CONTEXT
// ============================================
// React Context allows us to share state across components
// without passing props through every level ("prop drilling").
//
// HOW IT WORKS:
// 1. Create a context (a container for shared data)
// 2. Wrap your app with a Provider (makes data available)
// 3. Use useContext hook to access data in any component
//
// WHAT THIS PROVIDES:
// - user: Current logged-in user data (or null)
// - token: JWT token (or null)
// - login: Function to log in
// - logout: Function to log out
// - register: Function to create account
// - loading: Boolean for loading states
// ============================================

import React, { createContext, useState, useContext, useEffect } from 'react';

// ----------------------------------------
// Step 1: Create the Context
// ----------------------------------------
// This creates an empty context container
const AuthContext = createContext(null);

// ----------------------------------------
// Step 2: Create Custom Hook
// ----------------------------------------
// This makes it easy to use auth context in components
// Usage: const { user, login, logout } = useAuth();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ----------------------------------------
// Step 3: Create the Provider Component
// ----------------------------------------
// This component wraps your app and provides auth data

export const AuthProvider = ({ children }) => {
  // ----------------------------------------
  // State Variables
  // ----------------------------------------
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // True while checking stored token
  const [error, setError] = useState(null);
  
  // ----------------------------------------
  // On Mount: Check for Existing Token
  // ----------------------------------------
  // When app loads, check if user was previously logged in
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check localStorage for saved token
        const savedToken = localStorage.getItem('teahaven_token');
        const savedUser = localStorage.getItem('teahaven_user');

        console.log('🔑 Auth initialization:', {
          hasToken: !!savedToken,
          hasUser: !!savedUser,
          tokenPreview: savedToken ? savedToken.substring(0, 20) + '...' : 'none'
        });

        if (savedToken && savedUser) {
          // Always restore token from localStorage first
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          console.log('✅ Token restored from localStorage');

          // Verify token is still valid (optional check)
          try {
            const response = await fetch('/api/auth/verify', {
              headers: {
                'Authorization': `Bearer ${savedToken}`
              }
            });

            console.log('✅ Token verification response:', response.ok, response.status);

            // Only clear if explicitly unauthorized (401)
            if (response.status === 401) {
              console.log('❌ Token expired - clearing storage');
              localStorage.removeItem('teahaven_token');
              localStorage.removeItem('teahaven_user');
              setToken(null);
              setUser(null);
            }
          } catch (verifyErr) {
            // Network error - keep the token, don't clear it
            console.log('⚠️ Token verification failed (network), keeping token:', verifyErr.message);
          }
        } else {
          console.log('ℹ️ No saved session found');
        }
      } catch (err) {
        console.error('❌ Auth initialization error:', err);
        // Don't clear storage on general errors
      } finally {
        setLoading(false);
        console.log('🏁 Auth initialization complete');
      }
    };

    initializeAuth();
  }, []); // Empty array = run once on mount
  
  // ----------------------------------------
  // Register Function
  // ----------------------------------------
  const register = async (email, password, firstName, lastName) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      // Success! Save token and user data
      const { token: newToken, user: newUser } = data.data;
      
      setToken(newToken);
      setUser(newUser);
      
      // Save to localStorage for persistence
      localStorage.setItem('teahaven_token', newToken);
      localStorage.setItem('teahaven_user', JSON.stringify(newUser));
      
      return { success: true, data };
      
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };
  
  // ----------------------------------------
  // Login Function
  // ----------------------------------------
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Success! Save token and user data
      const { token: newToken, user: newUser } = data.data;
      
      setToken(newToken);
      setUser(newUser);
      
      // Save to localStorage
      localStorage.setItem('teahaven_token', newToken);
      localStorage.setItem('teahaven_user', JSON.stringify(newUser));
      
      return { success: true, data };
      
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };
  
  // ----------------------------------------
  // Logout Function
  // ----------------------------------------
  const logout = async () => {
    try {
      // Optional: Call logout endpoint
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Always clear local state
      setToken(null);
      setUser(null);
      localStorage.removeItem('teahaven_token');
      localStorage.removeItem('teahaven_user');
    }
  };
  
  // ----------------------------------------
  // Context Value
  // ----------------------------------------
  // This is what components can access via useAuth()
  const value = {
    user,           // Current user object or null
    token,          // JWT token or null
    loading,        // True during async operations
    error,          // Error message or null
    isAuthenticated: !!user, // Boolean: is user logged in?
    register,       // Function to register
    login,          // Function to login
    logout,         // Function to logout
    setError        // Function to clear/set errors
  };
  
  // ----------------------------------------
  // Render Provider
  // ----------------------------------------
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;