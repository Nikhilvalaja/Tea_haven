import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../CheckoutStyles.css';

const OrderSuccess = () => {
  const { token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const verifyPayment = async () => {
    try {
      const response = await fetch(`/api/payment/verify-session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success && data.order) {
        setOrder(data.order);
      } else if (!data.success && data.message === 'Payment was not completed') {
        // Payment was cancelled - redirect back to checkout
        navigate('/checkout?payment=cancelled');
      } else {
        setError('Unable to verify payment. Please check your order history.');
      }
    } catch (err) {
      console.error('Failed to verify payment:', err);
      setError('Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 OrderSuccess - Auth state:', {
      authLoading,
      hasToken: !!token,
      sessionId,
      localStorageToken: localStorage.getItem('teahaven_token') ? 'exists' : 'missing'
    });

    // Wait for auth to initialize
    if (authLoading) {
      console.log('⏳ Waiting for auth to initialize...');
      return;
    }

    if (!sessionId) {
      console.log('❌ No session ID in URL');
      setError('Invalid session');
      setLoading(false);
      return;
    }

    if (!token) {
      console.log('❌ No token - redirecting to login');
      // User not logged in - redirect to login with return URL
      navigate(`/login?returnUrl=/order-success?session_id=${sessionId}`);
      return;
    }

    console.log('✅ Have token and session ID - verifying payment');
    verifyPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token, authLoading]);

  if (loading) {
    return (
      <div className="order-success-page">
        <div className="success-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Verifying your payment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-success-page">
        <div className="success-container error">
          <div className="error-icon">❌</div>
          <h1>Payment Verification Failed</h1>
          <p>{error || 'Unable to verify your order'}</p>
          <div className="success-actions">
            <button className="btn-primary" onClick={() => navigate('/orders')}>
              View Order History
            </button>
            <button className="btn-secondary" onClick={() => navigate('/products')}>
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-success-page">
      <div className="success-container">
        {/* Success Icon */}
        <div className="success-icon-animated">
          <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
            <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
            <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="success-title">Payment Successful! 🎉</h1>
        <p className="success-subtitle">Thank you for your order</p>

        {/* Order Details */}
        <div className="order-summary-card">
          <div className="summary-header">
            <h2>Order Confirmation</h2>
            <span className="order-number">#{order.orderNumber}</span>
          </div>

          <div className="summary-section">
            <h3>Order Details</h3>
            <div className="summary-row">
              <span>Order Date:</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="summary-row">
              <span>Payment Status:</span>
              <span className="status-badge paid">PAID</span>
            </div>
            <div className="summary-row">
              <span>Order Status:</span>
              <span className="status-badge pending">{order.status.toUpperCase()}</span>
            </div>
          </div>

          <div className="summary-section">
            <h3>Items Ordered</h3>
            <div className="order-items-list">
              {order.items?.map((item, index) => (
                <div key={index} className="order-item-row">
                  <div className="item-info">
                    {item.product?.imageUrl && (
                      <img src={item.product.imageUrl} alt={item.productName} className="item-image" />
                    )}
                    <div>
                      <div className="item-name">{item.productName}</div>
                      <div className="item-quantity">Quantity: {item.quantity}</div>
                    </div>
                  </div>
                  <div className="item-price">${(item.priceAtPurchase * item.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="summary-section">
            <h3>Shipping Address</h3>
            {order.address && (
              <div className="address-info">
                <p>{order.address.fullName}</p>
                <p>{order.address.addressLine1}</p>
                {order.address.addressLine2 && <p>{order.address.addressLine2}</p>}
                <p>{order.address.city}, {order.address.state} {order.address.zipCode}</p>
                <p>{order.address.phoneNumber}</p>
              </div>
            )}
          </div>

          <div className="summary-section totals-section">
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
              <span>Total Paid:</span>
              <span>${parseFloat(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Confirmation Email Notice */}
        <div className="email-notice">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <p>A confirmation email with your invoice has been sent to your email address</p>
        </div>

        {/* Action Buttons */}
        <div className="success-actions">
          <button className="btn-primary" onClick={() => navigate('/orders')}>
            View Order Details
          </button>
          <button className="btn-secondary" onClick={() => navigate('/products')}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
