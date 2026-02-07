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

  // Check stock availability for each item
  const getItemStockStatus = (item) => {
    const product = item.product;
    if (!product) return { available: 0, isOutOfStock: true, isLowStock: false };

    const availableStock = product.stockQuantity - (product.reservedStock || 0);
    const isOutOfStock = availableStock <= 0;
    const isLowStock = availableStock > 0 && availableStock < item.quantity;
    const exceedsStock = item.quantity > availableStock;

    return { available: availableStock, isOutOfStock, isLowStock, exceedsStock };
  };

  // Check if any items have stock issues
  const hasStockIssues = cartItems.some(item => {
    const status = getItemStockStatus(item);
    return status.isOutOfStock || status.exceedsStock;
  });

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

            {/* Stock Warning Banner */}
            {hasStockIssues && (
              <div className="stock-warning-banner">
                <span className="warning-icon">⚠️</span>
                <span>Some items in your cart have stock availability issues. Please review before checkout.</span>
              </div>
            )}

            {/* Cart Items */}
            <div className="cart-items-modern">
              {cartItems.map(item => {
                const stockStatus = getItemStockStatus(item);

                return (
                  <div key={item.id} className={`cart-item-modern ${stockStatus.isOutOfStock ? 'cart-item-out-of-stock' : ''}`}>
                    <div className="cart-item-image-modern">
                      <div className={`cart-placeholder-image ${stockStatus.isOutOfStock ? 'grayscale' : ''}`}>
                        <span className="cart-emoji">🍵</span>
                      </div>
                      {stockStatus.isOutOfStock && (
                        <span className="cart-item-stock-badge out-of-stock">Out of Stock</span>
                      )}
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

                      {/* Stock status message */}
                      {stockStatus.isOutOfStock && (
                        <p className="cart-stock-warning">This item is no longer available</p>
                      )}
                      {stockStatus.exceedsStock && !stockStatus.isOutOfStock && (
                        <p className="cart-stock-warning">Only {stockStatus.available} available (you have {item.quantity})</p>
                      )}
                      {stockStatus.isLowStock && !stockStatus.exceedsStock && (
                        <p className="cart-stock-low">Only {stockStatus.available} left in stock</p>
                      )}
                    </div>

                    <div className="cart-item-quantity-modern">
                      <label className="qty-label-modern">Qty:</label>
                      <div className="quantity-controls-modern">
                        <button
                          className="qty-btn-modern"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={loading || item.quantity <= 1 || stockStatus.isOutOfStock}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          className={`qty-input-modern ${stockStatus.exceedsStock ? 'qty-exceeds-stock' : ''}`}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            handleQuantityChange(item.id, val);
                          }}
                          min="1"
                          max={stockStatus.available || 1}
                          disabled={loading || stockStatus.isOutOfStock}
                        />
                        <button
                          className="qty-btn-modern"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          disabled={loading || stockStatus.isOutOfStock || item.quantity >= stockStatus.available}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="cart-item-total-modern">
                      <p className={`item-total-price ${stockStatus.isOutOfStock ? 'price-strikethrough' : ''}`}>
                        ${(parseFloat(item.priceAtAdd) * item.quantity).toFixed(2)}
                      </p>
                      <button
                        className="btn-remove-modern"
                        onClick={() => handleRemove(item.id)}
                        disabled={loading}
                      >
                        {stockStatus.isOutOfStock ? 'Remove' : 'Remove'}
                      </button>
                    </div>
                  </div>
                );
              })}
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
                className={`checkout-btn-modern ${hasStockIssues ? 'btn-disabled-warning' : ''}`}
                onClick={handleCheckout}
                disabled={loading || hasStockIssues}
              >
                {hasStockIssues ? 'Fix Stock Issues to Checkout' : 'Proceed to Checkout'}
              </button>

              {hasStockIssues && (
                <p className="checkout-warning-text">
                  Please remove or adjust out-of-stock items before checkout
                </p>
              )}

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
