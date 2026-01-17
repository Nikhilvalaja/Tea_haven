import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const { cart, loading, error, updateCartItem, removeFromCart, fetchCart, cartTotal, cartCount } = useCart();
  const navigate = useNavigate();
  const [shippingEstimate, setShippingEstimate] = useState('5.99');

  useEffect(() => {
    fetchCart();
  }, []);

  useEffect(() => {
    if (cart?.cart?.items) {
      calculateShippingEstimate();
    }
  }, [cart]);

  const calculateShippingEstimate = () => {
    const items = cart?.cart?.items || [];
    const hasImported = items.some(item => item.product?.isImported);
    const subtotal = parseFloat(cartTotal);

    if (subtotal >= 50) {
      setShippingEstimate('FREE');
    } else if (hasImported) {
      setShippingEstimate('7.99');
    } else {
      setShippingEstimate('4.99');
    }
  };

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    await updateCartItem(itemId, newQuantity);
  };

  const handleRemove = async (itemId) => {
    if (window.confirm('Remove this item from cart?')) {
      await removeFromCart(itemId);
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (loading && !cart) {
    return (
      <div className="container-modern">
        <div className="loading-modern">Loading cart...</div>
      </div>
    );
  }

  const cartItems = cart?.cart?.items || [];
  const subtotal = parseFloat(cartTotal);
  const estimatedTotal = shippingEstimate === 'FREE' ? subtotal : subtotal + parseFloat(shippingEstimate);

  // Show empty state only when we're sure cart is empty (not loading and cart data exists with 0 items)
  const isCartEmpty = cart && !loading && cartItems.length === 0;

  return (
    <div className="cart-page-modern">
      <div className="container-modern">
        <h1 className="cart-title-modern">Shopping Cart</h1>

        {error && <div className="error-message-modern">{error}</div>}

        {isCartEmpty ? (
          <div className="empty-state-modern">
            <p className="empty-icon-large">🛒</p>
            <h2>Your cart is empty</h2>
            <p>Start adding your favorite teas to get started.</p>
            <Link to="/products" className="btn-primary-large-modern">
              Shop Now
            </Link>
          </div>
        ) : cartItems.length > 0 ? (
          <div className="cart-layout-modern" style={{ position: 'relative' }}>
            {/* Loading Overlay */}
            {loading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '2rem' }}>⏳ Updating...</div>
              </div>
            )}

            {/* Cart Items */}
            <div className="cart-items-modern">
              {cartItems.map(item => (
                <div key={item.id} className="cart-item-modern">
                  <div className="cart-item-image-modern">
                    <div className="cart-placeholder-image">
                      <span className="cart-emoji">🍵</span>
                    </div>
                  </div>

                  <div className="cart-item-info-modern">
                    <h3 className="cart-item-name">{item.product?.name}</h3>
                    {item.product?.isImported && (
                      <span className="imported-label-small">Imported</span>
                    )}
                    <p className="cart-item-price">${parseFloat(item.priceAtAdd).toFixed(2)} each</p>
                    {item.product?.packetSize && (
                      <p className="cart-item-size">{item.product.packetSize}</p>
                    )}
                  </div>

                  <div className="cart-item-quantity-modern">
                    <label className="qty-label-modern">Qty:</label>
                    <div className="quantity-controls-modern">
                      <button
                        className="qty-btn-modern"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        disabled={loading || item.quantity <= 1}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        className="qty-input-modern"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          handleQuantityChange(item.id, val);
                        }}
                        min="1"
                        disabled={loading}
                      />
                      <button
                        className="qty-btn-modern"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        disabled={loading}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="cart-item-total-modern">
                    <p className="item-total-price">${(parseFloat(item.priceAtAdd) * item.quantity).toFixed(2)}</p>
                    <button
                      className="btn-remove-modern"
                      onClick={() => handleRemove(item.id)}
                      disabled={loading}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="cart-summary-modern">
              <h2 className="summary-title-modern">Order Summary</h2>

              <div className="summary-details-modern">
                <div className="summary-row-modern">
                  <span>Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'}):</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                <div className="summary-row-modern">
                  <span>Shipping estimate:</span>
                  <span>{shippingEstimate === 'FREE' ? 'FREE' : `$${shippingEstimate}`}</span>
                </div>

                {shippingEstimate !== 'FREE' && subtotal < 50 && (
                  <div className="shipping-note-modern">
                    Add ${(50 - subtotal).toFixed(2)} more for free shipping
                  </div>
                )}

                <div className="summary-divider-modern"></div>

                <div className="summary-row-modern summary-total-modern">
                  <strong>Estimated Total:</strong>
                  <strong>${estimatedTotal.toFixed(2)}</strong>
                </div>

                <p className="tax-note-modern">Tax calculated at checkout</p>
              </div>

              <button
                className="checkout-btn-modern"
                onClick={handleCheckout}
                disabled={loading}
              >
                Proceed to Checkout
              </button>

              <Link to="/products" className="continue-shopping-modern">
                ← Continue Shopping
              </Link>

              {/* Trust Signals */}
              <div className="cart-trust-modern">
                <div className="trust-item-small">✓ Secure Checkout</div>
                <div className="trust-item-small">✓ Free Returns</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="loading-modern" style={{ padding: '4rem', textAlign: 'center' }}>
            Loading cart...
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
