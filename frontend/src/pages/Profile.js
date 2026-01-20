import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Link } from 'react-router-dom';

const Profile = () => {
  const { user, token } = useAuth();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => {
    if (location.state?.orderSuccess) {
      setOrderSuccess(location.state.orderNumber);
      setTimeout(() => setOrderSuccess(null), 5000);
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, addressesRes] = await Promise.all([
        fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/addresses', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const ordersData = await ordersRes.json();
      const addressesData = await addressesRes.json();

      if (ordersData.success) setOrders(ordersData.data);
      if (addressesData.success) setAddresses(addressesData.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMemberSince = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const recentOrders = orders.slice(0, 3);
  const defaultAddress = addresses.find(a => a.isDefault);

  return (
    <div className="profile-page-modern">
      <div className="container-modern">
        {orderSuccess && (
          <div className="success-banner-modern">
            ✓ Order {orderSuccess} placed successfully! Check your orders below.
          </div>
        )}

        <div className="profile-welcome-modern">
          <h1>Hello, {user.firstName}!</h1>
          <p>Welcome to your account dashboard</p>
        </div>

        <div className="profile-stats-modern">
          <div className="stat-card-modern">
            <div className="stat-number">{orders.length}</div>
            <div className="stat-label">Total Orders</div>
          </div>
          <div className="stat-card-modern">
            <div className="stat-number">{addresses.length}</div>
            <div className="stat-label">Saved Addresses</div>
          </div>
          <div className="stat-card-modern">
            <div className="stat-number">
              {orders.filter(o => o.status === 'delivered').length}
            </div>
            <div className="stat-label">Delivered</div>
          </div>
        </div>

        <div className="profile-grid-modern">
          <div className="profile-sidebar-modern">
            <h3 className="sidebar-title-modern">Quick Actions</h3>
            <div className="quick-actions-modern">
              <Link to="/orders" className="action-button-modern">
                <span className="action-icon-modern">📦</span>
                <div>
                  <div className="action-title">Your Orders</div>
                  <div className="action-subtitle">Track & manage orders</div>
                </div>
              </Link>

              <Link to="/addresses" className="action-button-modern">
                <span className="action-icon-modern">📍</span>
                <div>
                  <div className="action-title">Addresses</div>
                  <div className="action-subtitle">Manage delivery addresses</div>
                </div>
              </Link>

              <Link to="/cart" className="action-button-modern">
                <span className="action-icon-modern">🛒</span>
                <div>
                  <div className="action-title">Shopping Cart</div>
                  <div className="action-subtitle">View cart items</div>
                </div>
              </Link>

              <Link to="/products" className="action-button-modern">
                <span className="action-icon-modern">🍵</span>
                <div>
                  <div className="action-title">Browse Teas</div>
                  <div className="action-subtitle">Explore our collection</div>
                </div>
              </Link>
            </div>
          </div>

          <div className="profile-content-modern">
            <div className="profile-section-modern">
              <div className="section-header-flex">
                <h2>Recent Orders</h2>
                {orders.length > 0 && (
                  <Link to="/orders" className="view-all-link-modern">View All →</Link>
                )}
              </div>

              {loading ? (
                <div className="loading-modern">Loading...</div>
              ) : orders.length === 0 ? (
                <div className="empty-box-modern">
                  <span className="empty-icon-md">📦</span>
                  <p>No orders yet</p>
                  <Link to="/products" className="btn-small-modern">Start Shopping</Link>
                </div>
              ) : (
                <div className="orders-mini-list">
                  {recentOrders.map(order => (
                    <div key={order.id} className="order-mini-card">
                      <div className="order-mini-header">
                        <span className="order-mini-number">#{order.orderNumber}</span>
                        <span className={`order-mini-status status-${order.status}`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="order-mini-details">
                        <div className="order-mini-date">
                          {formatDateTime(order.created_at || order.createdAt)}
                        </div>
                        <div className="order-mini-total">
                          ${parseFloat(order.totalAmount).toFixed(2)}
                        </div>
                      </div>
                      <div className="order-mini-items">
                        {order.items?.slice(0, 2).map(item => (
                          <div key={item.id} className="order-mini-item">
                            • {item.productName}
                          </div>
                        ))}
                        {order.items?.length > 2 && (
                          <div className="order-mini-item">
                            +{order.items.length - 2} more items
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="profile-section-modern">
              <div className="section-header-flex">
                <h2>Default Address</h2>
                <Link to="/addresses" className="view-all-link-modern">Manage →</Link>
              </div>

              {defaultAddress ? (
                <div className="address-display-card">
                  <div className="address-display-header">
                    <span className="address-display-icon">📍</span>
                    <span className="default-badge-sm">Default</span>
                  </div>
                  <div className="address-display-name">{defaultAddress.fullName}</div>
                  <div className="address-display-text">
                    {defaultAddress.addressLine1}
                    {defaultAddress.addressLine2 && <>, {defaultAddress.addressLine2}</>}
                  </div>
                  <div className="address-display-text">
                    {defaultAddress.city}, {defaultAddress.state} {defaultAddress.zipCode}
                  </div>
                  <div className="address-display-phone">
                    {defaultAddress.phoneNumber}
                  </div>
                </div>
              ) : (
                <div className="empty-box-modern">
                  <span className="empty-icon-md">📍</span>
                  <p>No default address set</p>
                  <Link to="/addresses" className="btn-small-modern">Add Address</Link>
                </div>
              )}
            </div>

            <div className="profile-section-modern">
              <h2>Account Information</h2>
              <div className="account-info-grid">
                <div className="info-item-modern">
                  <div className="info-label-modern">Name</div>
                  <div className="info-value-modern">{user.firstName} {user.lastName}</div>
                </div>
                <div className="info-item-modern">
                  <div className="info-label-modern">Email</div>
                  <div className="info-value-modern">{user.email}</div>
                </div>
                <div className="info-item-modern">
                  <div className="info-label-modern">Member Since</div>
                  <div className="info-value-modern">
                    {formatMemberSince(user.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
