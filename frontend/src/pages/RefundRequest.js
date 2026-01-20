import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RefundRequest = () => {
  const { orderId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [selectedItems, setSelectedItems] = useState([]);
  const [refundReason, setRefundReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [review, setReview] = useState('');
  const [agreeToPolicy, setAgreeToPolicy] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setOrder(data.data);
        // Pre-select all items
        setSelectedItems(data.data.items.map(item => item.id));
      } else {
        setError('Failed to load order details');
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (selectedItems.length === 0) {
      setError('Please select at least one item to refund');
      return;
    }

    if (!refundReason) {
      setError('Please select a refund reason');
      return;
    }

    if (refundReason === 'other' && !customReason.trim()) {
      setError('Please provide a reason for your refund');
      return;
    }

    if (!agreeToPolicy) {
      setError('Please agree to the refund policy');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const reasonText = refundReason === 'other' ? customReason : refundReason;

      const response = await fetch(`/api/payment/refund/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: reasonText,
          selectedItems,
          review: review.trim() || null
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Refund request submitted successfully! You will receive confirmation via email.');
        navigate('/orders');
      } else {
        setError(data.message || 'Failed to submit refund request');
      }
    } catch (err) {
      console.error('Refund submission error:', err);
      setError('Failed to submit refund request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateRefundAmount = () => {
    if (!order || !order.items) return 0;

    const selectedItemsTotal = order.items
      .filter(item => selectedItems.includes(item.id))
      .reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);

    // If all items are selected, include shipping and tax
    if (selectedItems.length === order.items.length) {
      return parseFloat(order.totalAmount);
    }

    return selectedItemsTotal;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container">
        <div className="error-state">Order not found</div>
      </div>
    );
  }

  const refundAmount = calculateRefundAmount();

  return (
    <div className="container refund-request-page">
      <div className="refund-header">
        <h1>Request Refund</h1>
        <p className="order-ref">Order #{order.orderNumber}</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="refund-form">
        {/* Order Summary */}
        <div className="refund-section">
          <h2>Order Summary</h2>
          <div className="order-summary-box">
            <div className="summary-row">
              <span>Order Date:</span>
              <span>{new Date(order.created_at || order.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="summary-row">
              <span>Order Total:</span>
              <strong>${parseFloat(order.totalAmount).toFixed(2)}</strong>
            </div>
            <div className="summary-row">
              <span>Payment Status:</span>
              <span className="status-tag">{order.paymentStatus}</span>
            </div>
          </div>
        </div>

        {/* Select Items to Refund */}
        <div className="refund-section">
          <h2>Select Items to Refund</h2>
          <p className="section-description">Choose which items you'd like to return</p>

          <div className="items-selection-list">
            {order.items.map(item => (
              <label key={item.id} className="item-checkbox-row">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => handleItemToggle(item.id)}
                />
                <div className="item-info">
                  <span className="item-name-ref">{item.productName}</span>
                  <span className="item-details-ref">
                    Qty: {item.quantity} × ${parseFloat(item.priceAtPurchase).toFixed(2)}
                  </span>
                </div>
                <span className="item-total-ref">${parseFloat(item.totalPrice).toFixed(2)}</span>
              </label>
            ))}
          </div>

          <div className="refund-amount-display">
            <strong>Refund Amount:</strong>
            <span className="refund-amount">${refundAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Refund Reason */}
        <div className="refund-section">
          <h2>Reason for Refund</h2>
          <p className="section-description">Help us understand why you're returning these items</p>

          <div className="form-group">
            <select
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="form-select"
              required
            >
              <option value="">-- Select a reason --</option>
              <option value="Defective or damaged product">Defective or damaged product</option>
              <option value="Wrong item received">Wrong item received</option>
              <option value="Product did not match description">Product did not match description</option>
              <option value="No longer needed">No longer needed</option>
              <option value="Found better price elsewhere">Found better price elsewhere</option>
              <option value="Quality not as expected">Quality not as expected</option>
              <option value="other">Other (please specify)</option>
            </select>
          </div>

          {refundReason === 'other' && (
            <div className="form-group">
              <label htmlFor="customReason">Please specify your reason:</label>
              <textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Tell us why you're requesting a refund..."
                rows="3"
                className="form-textarea"
                required
              />
            </div>
          )}
        </div>

        {/* Optional Review */}
        <div className="refund-section">
          <h2>Product Review (Optional)</h2>
          <p className="section-description">Share your experience to help us improve</p>

          <div className="form-group">
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="What did you think of the product? Your feedback helps us serve you better."
              rows="4"
              className="form-textarea"
            />
          </div>
        </div>

        {/* Refund Policy */}
        <div className="refund-section refund-policy-section">
          <h2>Refund Policy</h2>
          <div className="policy-content">
            <h3>Return & Refund Terms</h3>
            <ul>
              <li><strong>Timeframe:</strong> Items must be returned within 30 days of delivery</li>
              <li><strong>Condition:</strong> Products must be unused, in original packaging with all tags attached</li>
              <li><strong>Processing Time:</strong> Refunds are processed within 5-7 business days after we receive the returned items</li>
              <li><strong>Refund Method:</strong> Original payment method will be credited</li>
              <li><strong>Return Shipping:</strong>
                <ul>
                  <li>Free return shipping for defective or incorrect items</li>
                  <li>Customer responsible for return shipping in other cases</li>
                </ul>
              </li>
              <li><strong>Non-Refundable Items:</strong> Opened tea packages, gift cards, and sale items are final sale</li>
              <li><strong>Partial Refunds:</strong> Items not in original condition or missing parts may receive a partial refund</li>
            </ul>

            <h3>How It Works</h3>
            <ol>
              <li>Submit this refund request</li>
              <li>We'll review your request within 24 hours</li>
              <li>You'll receive return shipping instructions via email</li>
              <li>Ship the items back using provided label (if applicable)</li>
              <li>Refund will be issued once we receive and inspect the items</li>
            </ol>

            <p className="policy-note">
              <strong>Note:</strong> By submitting this refund request, you agree to our return policy terms.
              If you have any questions, please contact our customer service at support@teahaven.com
            </p>
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={agreeToPolicy}
              onChange={(e) => setAgreeToPolicy(e.target.checked)}
              required
            />
            <span>I have read and agree to the refund policy terms</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="refund-actions">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-danger"
            disabled={submitting || selectedItems.length === 0 || !agreeToPolicy}
          >
            {submitting ? 'Submitting...' : `Submit Refund Request ($${refundAmount.toFixed(2)})`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RefundRequest;
