import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const { showInfo } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Check if user is admin (manager, admin, or super_admin)
  const isAdmin = user && ['manager', 'admin', 'super_admin'].includes(user.role);

  const handleLogout = async () => {
    const userName = user?.firstName || 'User';
    await logout();
    showInfo(`Goodbye, ${userName}! You have been logged out.`);
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const categories = [
    { name: 'Green Tea', value: 'green' },
    { name: 'Black Tea', value: 'black' },
    { name: 'Herbal Tea', value: 'herbal' },
    { name: 'Oolong Tea', value: 'oolong' },
    { name: 'White Tea', value: 'white' }
  ];

  const getRoleBanner = () => {
    if (!user?.role) return null;
    const roleConfig = {
      super_admin: { label: 'Super Admin', color: '#7B1FA2' },
      admin: { label: 'Admin', color: '#1976D2' },
      manager: { label: 'Manager', color: '#F57C00' }
    };
    const config = roleConfig[user.role];
    if (!config) return null;
    return config;
  };

  const roleBanner = getRoleBanner();

  return (
    <nav className="modern-navbar">
      {/* Admin Role Banner */}
      {roleBanner && (
        <div className="admin-role-banner" style={{ background: roleBanner.color }}>
          <span>🔐 Logged in as <strong>{roleBanner.label}</strong> ({user.email})</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="navbar-top">
        <div className="navbar-container-modern">
          {/* Logo */}
          <Link to="/" className="navbar-logo-modern">
            <span className="logo-icon-modern">🍵</span>
            <span className="logo-text-modern">TeaHaven</span>
          </Link>

          {/* Search Bar */}
          <form className="navbar-search" onSubmit={handleSearch}>
            <input
              type="text"
              className="search-input-modern"
              placeholder="Search for teas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-button-modern">
              🔍
            </button>
          </form>

          {/* Right Icons */}
          <div className="navbar-icons-modern">
            {isAuthenticated ? (
              <>
                <Link to="/cart" className="navbar-icon-modern" title="Cart">
                  <span className="icon-symbol">🛒</span>
                  {cartCount > 0 && <span className="icon-badge-modern">{cartCount}</span>}
                </Link>
                <Link to="/profile" className="navbar-icon-modern" title={`Hi, ${user.firstName}`}>
                  <span className="icon-symbol">👤</span>
                </Link>
                <button onClick={handleLogout} className="logout-link-modern">
                  Logout
                </button>
              </>
            ) : (
              <div className="navbar-auth-modern">
                <Link to="/login" className="login-link-modern">Sign In</Link>
                <Link to="/register" className="register-btn-modern">Get Started</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar - Categories */}
      <div className="navbar-bottom">
        <div className="navbar-container-modern">
          <div className="navbar-categories">
            <div
              className="category-dropdown-trigger"
              onMouseEnter={() => setShowCategoryDropdown(true)}
              onMouseLeave={() => setShowCategoryDropdown(false)}
            >
              <button className="categories-btn-modern">
                All Categories ▼
              </button>
              {showCategoryDropdown && (
                <div className="category-dropdown-modern">
                  {categories.map(cat => (
                    <Link
                      key={cat.value}
                      to={`/products?category=${cat.value}`}
                      className="category-dropdown-item"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link to="/products" className="nav-link-modern">All Products</Link>
            <Link to="/products?filter=imported" className="nav-link-modern">Imported Teas</Link>
            <Link to="/products?filter=local" className="nav-link-modern">Local Stock</Link>

            {/* Admin Panel Link */}
            {isAdmin && (
              <Link to="/admin" className="admin-panel-link">
                ⚙️ Admin Panel
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
