import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Orders = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FF9900',
      confirmed: '#007185',
      processing: '#565959',
      shipped: '#0066C0',
      delivered: '#007600',
      cancelled: '#C40000',
      refunded: '#B12704'
    };
    return colors[status] || '#565959';
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

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">Loading your orders...</div>
      </div>
    );
  }

  return (
    <div className="container orders-page">
      <div className="orders-header">
        <div>
          <h1>Your Orders</h1>
          {user && user.createdAt && (
            <p className="member-since">Member since {formatMemberSince(user.createdAt)}</p>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">📦</p>
          <h2>No orders yet</h2>
          <p>You haven't placed any orders with us yet.</p>
          <Link to="/products" className="btn btn-primary btn-large">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="orders-list-compact">
          {orders.map(order => {
            const isExpanded = expandedOrderId === order.id;
            return (
              <div key={order.id} className="order-card-compact">
                {/* Compact Header - Always Visible */}
                <div
                  className="order-compact-header"
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="order-compact-info">
                    <div className="order-id-date">
                      <span className="order-number-compact">#{order.orderNumber}</span>
                      <span className="order-date-compact">{formatDateTime(order.created_at || order.createdAt)}</span>
                    </div>
                    <span
                      className="status-badge-compact"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="order-compact-summary">
                    <span className="order-total-compact">${parseFloat(order.totalAmount).toFixed(2)}</span>
                    <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded Details - Show on Click */}
                {isExpanded && (
                  <div className="order-expanded-details">
                    <div className="order-ship-to">
                      <strong>Ship to:</strong> {order.address?.fullName}
                    </div>

                    <div className="order-items-list">
                      <h4>Items:</h4>
                      {order.items?.map(item => (
                        <div key={item.id} className="order-item-compact">
                          <div className="item-details">
                            <span className="item-name">{item.productName}</span>
                            <span className="item-quantity">Qty: {item.quantity} × ${parseFloat(item.priceAtPurchase).toFixed(2)}</span>
                          </div>
                          <span className="item-total">${parseFloat(item.totalPrice).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="order-summary-compact">
                      <div className="summary-row">
                        <span>Subtotal:</span>
                        <span>${parseFloat(order.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="summary-row">
                        <span>Shipping:</span>
                        <span>${parseFloat(order.shippingCost).toFixed(2)}</span>
                      </div>
                      <div className="summary-row">
                        <span>Tax:</span>
                        <span>${parseFloat(order.taxAmount).toFixed(2)}</span>
                      </div>
                      <div className="summary-row total-row">
                        <strong>Total:</strong>
                        <strong>${parseFloat(order.totalAmount).toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="order-actions-compact">
                      {order.trackingNumber && (
                        <button className="btn btn-secondary-sm">
                          Track Order
                        </button>
                      )}
                      {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'processing') &&
                       order.paymentStatus === 'paid' && (
                        <Link
                          to={`/orders/${order.id}/refund`}
                          className="btn btn-danger-sm"
                        >
                          Request Refund
                        </Link>
                      )}
                      {order.paymentStatus === 'refunded' && (
                        <span className="refund-badge-sm">✓ Refunded</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;
