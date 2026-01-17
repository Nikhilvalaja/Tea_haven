import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Orders = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
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
      cancelled: '#C40000'
    };
    return colors[status] || '#565959';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
      <h1>Your Orders</h1>

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
        <div className="orders-list-full">
          {orders.map(order => (
            <div key={order.id} className="order-card-full">
              <div className="order-header-full">
                <div className="order-meta">
                  <div className="meta-item">
                    <span className="meta-label">ORDER PLACED</span>
                    <span className="meta-value">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">TOTAL</span>
                    <span className="meta-value">${parseFloat(order.totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">SHIP TO</span>
                    <span className="meta-value">{order.address?.fullName}</span>
                  </div>
                </div>
                <div className="order-number">
                  <span className="meta-label">ORDER # {order.orderNumber}</span>
                </div>
              </div>

              <div className="order-status-row">
                <span
                  className="status-badge-lg"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status.toUpperCase()}
                </span>
                {order.trackingNumber && (
                  <span className="tracking-info">
                    Tracking: {order.trackingNumber}
                  </span>
                )}
              </div>

              <div className="order-items-list">
                {order.items?.map(item => (
                  <div key={item.id} className="order-item-full">
                    <div className="item-details">
                      <h4>{item.productName}</h4>
                      <p className="item-meta">Quantity: {item.quantity} | Price: ${parseFloat(item.priceAtPurchase).toFixed(2)} each</p>
                    </div>
                    <div className="item-total">
                      ${parseFloat(item.totalPrice).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-summary">
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

              {order.customerNotes && (
                <div className="order-notes">
                  <strong>Your Notes:</strong> {order.customerNotes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
