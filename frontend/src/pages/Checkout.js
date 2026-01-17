import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import '../CheckoutStyles.css';

const Checkout = () => {
  const { token, user } = useAuth();
  const { cart, cartTotal, cartCount, clearCart } = useCart();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [customerNotes, setCustomerNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderSummary, setOrderSummary] = useState(null);

  // New state for enhanced checkout
  const [currentStep, setCurrentStep] = useState(1); // 1: Shipping, 2: Payment, 3: Review
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState('');
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('card');

  useEffect(() => {
    fetchAddresses();
  }, []);

  useEffect(() => {
    if (selectedAddressId && cart) {
      calculateOrderSummary();
    }
  }, [selectedAddressId, cart, shippingMethod]);

  useEffect(() => {
    if (user?.email) {
      setContactEmail(user.email);
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/addresses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setAddresses(data.data);
        const defaultAddress = data.data.find(addr => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        } else if (data.data.length > 0) {
          setSelectedAddressId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    }
  };

  const calculateOrderSummary = async () => {
    if (!selectedAddressId) return;

    const address = addresses.find(a => a.id === selectedAddressId);
    if (!address) return;

    const cartItems = cart?.cart?.items || [];
    const hasImported = cartItems.some(item => item.product?.isImported);

    let shippingCost = calculateShippingCost(address.state, parseFloat(cartTotal), cartCount, hasImported);

    // Express shipping adds 50% more
    if (shippingMethod === 'express') {
      shippingCost = shippingCost * 1.5 + 5.00;
    }

    setOrderSummary({
      subtotal: parseFloat(cartTotal),
      shipping: shippingCost,
      tax: calculateTax(address.state, parseFloat(cartTotal)),
      hasImported
    });
  };

  const calculateShippingCost = (state, subtotal, itemCount, hasImported) => {
    const zones = {
      local: ['OH', 'PA', 'WV', 'KY', 'IN', 'MI'],
      regional: ['IL', 'WI', 'NY', 'NJ', 'MD', 'VA', 'NC', 'SC', 'TN', 'MO', 'IA', 'MN'],
      national: ['CA', 'WA', 'OR', 'TX', 'FL', 'GA', 'AL', 'LA', 'AZ', 'NV', 'CO', 'UT'],
      remote: ['AK', 'HI', 'ME', 'VT', 'NH', 'MT', 'WY', 'ND', 'SD', 'NM', 'ID']
    };

    let zone = 'national';
    if (zones.local.includes(state)) zone = 'local';
    else if (zones.regional.includes(state)) zone = 'regional';
    else if (zones.remote.includes(state)) zone = 'remote';

    const rates = {
      local: { base: 4.99, perItem: 0.50, freeThreshold: 50 },
      regional: { base: 7.99, perItem: 0.75, freeThreshold: 75 },
      national: { base: 9.99, perItem: 1.00, freeThreshold: 100 },
      remote: { base: 14.99, perItem: 1.50, freeThreshold: 150 }
    };

    const rate = rates[zone];

    if (subtotal >= rate.freeThreshold) {
      return 0;
    }

    return rate.base + (rate.perItem * itemCount);
  };

  const calculateTax = (state, subtotal) => {
    const taxRates = {
      'OH': 0.0575,
      'PA': 0.06,
      'NY': 0.08,
      'CA': 0.0725,
      'TX': 0.0625,
      'FL': 0.06,
      'WA': 0.065
    };

    const rate = taxRates[state] || 0.06;
    return subtotal * rate;
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError('Please select a shipping address');
      return;
    }

    if (!contactEmail) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          addressId: selectedAddressId,
          customerNotes
        })
      });

      const data = await response.json();

      if (data.success) {
        await clearCart();
        navigate('/profile', {
          state: { orderSuccess: true, orderNumber: data.data.orderNumber }
        });
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Failed to place order:', err);
      setError('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cartItems = cart?.cart?.items || [];

  if (cartItems.length === 0) {
    return (
      <div className="checkout-empty">
        <div className="empty-cart-message">
          <div className="empty-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Add some delicious teas to get started!</p>
          <button className="btn-primary" onClick={() => navigate('/products')}>
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);
  const total = orderSummary
    ? orderSummary.subtotal + orderSummary.shipping + orderSummary.tax
    : parseFloat(cartTotal);

  const getShippingTime = () => {
    if (shippingMethod === 'express') return '2-3 business days';
    if (orderSummary?.hasImported) return '10-14 business days';
    return '4-7 business days';
  };

  return (
    <div className="checkout-page-new">
      {/* Progress Bar */}
      <div className="checkout-progress-bar">
        <div className="progress-container">
          <div className="progress-step active completed">
            <div className="step-number">1</div>
            <div className="step-label">Shipping</div>
          </div>
          <div className="progress-line active"></div>
          <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Payment</div>
          </div>
          <div className={`progress-line ${currentStep >= 3 ? 'active' : ''}`}></div>
          <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Review & Confirm</div>
          </div>
        </div>
      </div>

      <div className="checkout-container">
        <div className="checkout-main-content">
          {/* Secure Checkout Header */}
          <div className="secure-header">
            <div className="secure-icon">🔒</div>
            <h1>Secure Checkout</h1>
          </div>

          {error && <div className="checkout-error">{error}</div>}

          {/* Contact Information */}
          <section className="checkout-section-new">
            <div className="section-header">
              <h2>Contact Information</h2>
              <div className="section-number">1</div>
            </div>
            <div className="section-content">
              <div className="form-row">
                <div className="form-group">
                  <label>Email <span className="required">*</span></label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="form-input"
                  />
                  <small>For order confirmation and tracking</small>
                </div>
                <div className="form-group">
                  <label>Phone (Optional)</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="form-input"
                  />
                  <small>For delivery updates</small>
                </div>
              </div>
            </div>
          </section>

          {/* Shipping Address */}
          <section className="checkout-section-new">
            <div className="section-header">
              <h2>Shipping Address</h2>
              <div className="section-number">2</div>
            </div>
            <div className="section-content">
              {addresses.length === 0 ? (
                <div className="no-address-state">
                  <p>No saved addresses found</p>
                  <button
                    className="btn-secondary"
                    onClick={() => navigate('/addresses', { state: { fromCheckout: true } })}
                  >
                    + Add Shipping Address
                  </button>
                </div>
              ) : (
                <>
                  <div className="address-list">
                    {addresses.map(address => (
                      <label key={address.id} className={`address-card ${selectedAddressId === address.id ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="address"
                          value={address.id}
                          checked={selectedAddressId === address.id}
                          onChange={() => setSelectedAddressId(address.id)}
                        />
                        <div className="address-content">
                          <div className="address-name">{address.fullName}</div>
                          <div className="address-line">{address.addressLine1}</div>
                          {address.addressLine2 && <div className="address-line">{address.addressLine2}</div>}
                          <div className="address-line">{address.city}, {address.state} {address.zipCode}</div>
                          <div className="address-phone">{address.phoneNumber}</div>
                        </div>
                        {selectedAddressId === address.id && (
                          <div className="selected-indicator">✓</div>
                        )}
                      </label>
                    ))}
                  </div>
                  <button
                    className="btn-link"
                    onClick={() => navigate('/addresses', { state: { fromCheckout: true } })}
                  >
                    + Add a new address
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Shipping Method */}
          <section className="checkout-section-new">
            <div className="section-header">
              <h2>Shipping Method</h2>
              <div className="section-number">3</div>
            </div>
            <div className="section-content">
              <div className="shipping-options">
                <label className={`shipping-option ${shippingMethod === 'standard' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    value="standard"
                    checked={shippingMethod === 'standard'}
                    onChange={() => setShippingMethod('standard')}
                  />
                  <div className="shipping-info">
                    <div className="shipping-name">Standard Shipping</div>
                    <div className="shipping-time">Arrives in {getShippingTime()}</div>
                  </div>
                  <div className="shipping-price">
                    {orderSummary && orderSummary.shipping === 0 ? 'FREE' : `$${orderSummary?.shipping.toFixed(2) || '0.00'}`}
                  </div>
                </label>
                <label className={`shipping-option ${shippingMethod === 'express' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    value="express"
                    checked={shippingMethod === 'express'}
                    onChange={() => setShippingMethod('express')}
                  />
                  <div className="shipping-info">
                    <div className="shipping-name">Express Shipping</div>
                    <div className="shipping-time">Arrives in 2-3 business days</div>
                  </div>
                  <div className="shipping-price">
                    ${orderSummary ? ((orderSummary.shipping === 0 ? 5 : orderSummary.shipping) * 1.5 + 5).toFixed(2) : '0.00'}
                  </div>
                </label>
              </div>
              {orderSummary?.hasImported && (
                <div className="shipping-notice-box">
                  <div className="notice-icon">⚠️</div>
                  <div className="notice-text">
                    <strong>Note:</strong> Your order contains imported items which may require additional shipping time.
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Payment Method */}
          <section className="checkout-section-new">
            <div className="section-header">
              <h2>Payment Method</h2>
              <div className="section-number">4</div>
            </div>
            <div className="section-content">
              {/* Payment Options */}
              <div className="payment-methods">
                <label className={`payment-method ${paymentMethod === 'card' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                  />
                  <div className="payment-info">
                    <div className="payment-name">Credit / Debit Card</div>
                    <div className="payment-logos">
                      <div className="card-logo visa">VISA</div>
                      <div className="card-logo mastercard">MC</div>
                      <div className="card-logo amex">AMEX</div>
                      <div className="card-logo discover">DISC</div>
                    </div>
                  </div>
                </label>

                <label className={`payment-method ${paymentMethod === 'paypal' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={() => setPaymentMethod('paypal')}
                  />
                  <div className="payment-info">
                    <div className="payment-name">PayPal</div>
                    <div className="payment-logo paypal-logo">PayPal</div>
                  </div>
                </label>

                <label className={`payment-method ${paymentMethod === 'applepay' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="applepay"
                    checked={paymentMethod === 'applepay'}
                    onChange={() => setPaymentMethod('applepay')}
                  />
                  <div className="payment-info">
                    <div className="payment-name">Apple Pay</div>
                    <div className="payment-logo apple-logo">Apple Pay</div>
                  </div>
                </label>

                <label className={`payment-method ${paymentMethod === 'googlepay' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="googlepay"
                    checked={paymentMethod === 'googlepay'}
                    onChange={() => setPaymentMethod('googlepay')}
                  />
                  <div className="payment-info">
                    <div className="payment-name">Google Pay</div>
                    <div className="payment-logo google-logo">G Pay</div>
                  </div>
                </label>
              </div>

              {/* Payment Integration Notice */}
              <div className="payment-notice">
                <div className="notice-icon">ℹ️</div>
                <div className="notice-text">
                  Payment gateway integration coming soon. For now, orders will be placed for processing.
                </div>
              </div>

              {/* Security Badges */}
              <div className="security-badges">
                <div className="security-badge">
                  <div className="badge-icon">🔒</div>
                  <div className="badge-text">SSL Encrypted</div>
                </div>
                <div className="security-badge">
                  <div className="badge-icon">✓</div>
                  <div className="badge-text">Secure Checkout</div>
                </div>
                <div className="security-badge">
                  <div className="badge-icon">🛡️</div>
                  <div className="badge-text">Buyer Protection</div>
                </div>
              </div>
            </div>
          </section>

          {/* Order Notes */}
          <section className="checkout-section-new">
            <div className="section-header">
              <h2>Order Notes (Optional)</h2>
              <div className="section-number">5</div>
            </div>
            <div className="section-content">
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Add any special instructions for your order (e.g., gift message, delivery preferences)..."
                rows="4"
                className="notes-textarea"
              />
            </div>
          </section>
        </div>

        {/* Order Summary Sidebar */}
        <div className="checkout-sidebar-new">
          <div className="summary-card">
            <h3>Order Summary</h3>

            {/* Items Preview */}
            <div className="summary-items">
              {cartItems.slice(0, 3).map(item => (
                <div key={item.id} className="summary-item">
                  <div className="item-details">
                    <div className="item-name">{item.product?.name}</div>
                    <div className="item-qty">Qty: {item.quantity}</div>
                  </div>
                  <div className="item-price">
                    ${(parseFloat(item.priceAtAdd) * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
              {cartItems.length > 3 && (
                <div className="more-items">+ {cartItems.length - 3} more item(s)</div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="summary-breakdown">
              <div className="summary-row">
                <span>Subtotal ({cartCount} items)</span>
                <span>${cartTotal}</span>
              </div>
              {orderSummary && (
                <>
                  <div className="summary-row">
                    <span>Shipping</span>
                    <span className="shipping-cost">
                      {orderSummary.shipping === 0 ? (
                        <span className="free-badge">FREE</span>
                      ) : (
                        `$${orderSummary.shipping.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Tax</span>
                    <span>${orderSummary.tax.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="summary-row total-row">
                <span>Total</span>
                <span className="total-amount">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              className="btn-place-order"
              onClick={handlePlaceOrder}
              disabled={loading || !selectedAddressId || !contactEmail}
            >
              {loading ? (
                <>
                  <span className="spinner">⏳</span> Processing...
                </>
              ) : (
                <>
                  <span className="lock-icon">🔒</span> Pay ${total.toFixed(2)} Securely
                </>
              )}
            </button>

            {/* Trust Indicators */}
            <div className="trust-indicators">
              <div className="trust-item">
                <span className="trust-icon">✓</span>
                <span>30-Day Money Back</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">✓</span>
                <span>Free Returns</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">✓</span>
                <span>Secure Payments</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
