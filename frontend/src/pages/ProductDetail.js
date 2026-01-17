import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchProduct();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${id}`);
      const data = await response.json();
      if (data.success) {
        setProduct(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch product:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setAdding(true);
    const success = await addToCart(product.id, quantity);
    if (success) {
      alert(`${quantity}x ${product.name} added to cart!`);
    }
    setAdding(false);
  };

  if (loading) {
    return <div className="container-modern loading-modern">Loading product...</div>;
  }

  if (!product) {
    return <div className="container-modern">Product not found</div>;
  }

  const availableStock = product.stockQuantity - (product.reservedStock || 0);
  const estimatedDays = product.isImported ? `${product.shippingDays || 10}+ days` : '2-3 days';

  return (
    <div className="product-detail-page">
      <div className="container-modern">
        <div className="product-detail-grid">
          {/* Gallery Section */}
          <div className="product-gallery">
            <div className="gallery-main">
              <div className="product-image-placeholder">
                <span className="product-emoji-large">🍵</span>
              </div>
            </div>
            <div className="gallery-thumbnails">
              <div className="thumbnail active">
                <span className="product-emoji-sm">🍵</span>
              </div>
              <div className="thumbnail">
                <span className="product-emoji-sm">📦</span>
              </div>
              <div className="thumbnail">
                <span className="product-emoji-sm">🌿</span>
              </div>
            </div>
          </div>

          {/* Product Info Section */}
          <div className="product-info-section">
            <h1 className="product-title-detail">{product.name}</h1>

            {product.isImported && (
              <span className="imported-badge-detail">Imported from {product.originCountry}</span>
            )}

            <div className="product-rating-detail">
              <span className="stars-detail">★★★★★</span>
              <span className="rating-count">(127 reviews)</span>
            </div>

            <div className="product-price-detail">
              <span className="price-large">${parseFloat(product.price).toFixed(2)}</span>
              <span className="price-unit">/ {product.packetSize}</span>
            </div>

            <div className="product-meta-detail">
              <div className="meta-row-detail">
                <span className="meta-label-detail">Type:</span>
                <span className="meta-value-detail">
                  {product.teaType === 'loose_leaf' ? 'Loose Leaf' :
                   product.teaType === 'tea_bags' ? 'Tea Bags' : 'Both Available'}
                </span>
              </div>
              <div className="meta-row-detail">
                <span className="meta-label-detail">Size:</span>
                <span className="meta-value-detail">{product.packetSize}</span>
              </div>
              {product.originCountry && (
                <div className="meta-row-detail">
                  <span className="meta-label-detail">Origin:</span>
                  <span className="meta-value-detail">{product.originCountry}</span>
                </div>
              )}
              <div className="meta-row-detail">
                <span className="meta-label-detail">Stock:</span>
                <span className="meta-value-detail">
                  {availableStock > 0 ? `${availableStock} available` : 'Out of stock'}
                </span>
              </div>
            </div>

            <div className="product-description-detail">
              <h3>About this tea</h3>
              <p>{product.description || 'Premium quality tea, carefully selected and packaged to preserve freshness and flavor.'}</p>
            </div>

            {/* Add to Cart Section */}
            <div className="add-to-cart-section">
              <div className="quantity-selector-detail">
                <label>Quantity:</label>
                <div className="quantity-controls-detail">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="qty-btn"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max={availableStock}
                    className="qty-input"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                    className="qty-btn"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={adding || availableStock === 0}
                className="add-to-cart-btn-detail"
              >
                {adding ? 'Adding...' : availableStock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>

            {/* Trust Badges */}
            <div className="trust-badges-detail">
              <div className="trust-badge-item">
                <span className="trust-icon-detail">✓</span>
                <span>100% Authentic</span>
              </div>
              <div className="trust-badge-item">
                <span className="trust-icon-detail">✓</span>
                <span>Money-Back Guarantee</span>
              </div>
              <div className="trust-badge-item">
                <span className="trust-icon-detail">✓</span>
                <span>Secure Checkout</span>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="delivery-info-detail">
              <h4>Delivery Information</h4>
              <div className="delivery-item">
                <span className="delivery-icon">🚚</span>
                <div>
                  <p><strong>Estimated Delivery: {estimatedDays}</strong></p>
                  <p className="delivery-subtext">
                    {product.isImported
                      ? 'Imported directly from origin. Extended shipping time applies.'
                      : 'Ships from our Ohio warehouse. Fast local delivery.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="reviews-section-detail">
          <h2>Customer Reviews</h2>
          <div className="reviews-summary">
            <div className="average-rating">
              <span className="avg-rating-number">4.8</span>
              <div>
                <div className="stars-large">★★★★★</div>
                <p>Based on 127 reviews</p>
              </div>
            </div>
          </div>

          <div className="reviews-list-detail">
            <div className="review-item-detail">
              <div className="review-header-item">
                <span className="stars-detail">★★★★★</span>
                <span className="review-date">2 weeks ago</span>
              </div>
              <h4 className="review-title-item">Excellent quality!</h4>
              <p className="review-text-item">
                This is the best green tea I've ever had. Fresh aroma, perfect color, and delicious taste. Will definitely order again.
              </p>
              <p className="review-author-item">- Jennifer S.</p>
            </div>

            <div className="review-item-detail">
              <div className="review-header-item">
                <span className="stars-detail">★★★★★</span>
                <span className="review-date">1 month ago</span>
              </div>
              <h4 className="review-title-item">Authentic taste</h4>
              <p className="review-text-item">
                Tastes exactly like the tea I had in Japan. Very authentic and high quality.
              </p>
              <p className="review-author-item">- Michael T.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
