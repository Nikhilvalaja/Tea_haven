import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';

const ProductCard = ({ product }) => {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (availableStock <= 0) {
      return;
    }

    setAdding(true);
    const success = await addToCart(product.id, 1);
    setAdding(false);

    if (success) {
      alert(`${product.name} added to cart!`);
    }
  };

  const availableStock = product.stockQuantity - (product.reservedStock || 0);
  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock > 0 && availableStock <= 10;

  return (
    <div className={`product-card-modern ${isOutOfStock ? 'out-of-stock' : ''}`}>
      <Link to={`/products/${product.id}`} className="product-card-link">
        {/* Product Image */}
        <div className="product-image-modern">
          <div className={`product-image-placeholder-modern ${isOutOfStock ? 'grayscale' : ''}`}>
            <span className="product-emoji-modern">🍵</span>
          </div>
          {isOutOfStock && (
            <div className="out-of-stock-overlay">
              <span className="out-of-stock-badge">Out of Stock</span>
            </div>
          )}
          {product.isImported && !isOutOfStock && (
            <span className="imported-badge-modern">Imported</span>
          )}
          {isLowStock && (
            <span className="stock-badge-low">Only {availableStock} left</span>
          )}
        </div>

        {/* Product Info */}
        <div className="product-card-body">
          <h3 className="product-name-modern">{product.name}</h3>

          <div className="product-rating-modern">
            <span className="stars-modern">★★★★★</span>
            <span className="rating-count-modern">(24)</span>
          </div>

          <div className={`product-price-modern ${isOutOfStock ? 'price-out-of-stock' : ''}`}>
            <span className="price-amount">${parseFloat(product.price).toFixed(2)}</span>
            <span className="price-size"> / {product.packetSize}</span>
          </div>

          {product.originCountry && (
            <p className="product-origin-modern">From {product.originCountry}</p>
          )}
        </div>
      </Link>

      {/* Action Buttons */}
      <div className="product-card-actions">
        <button
          className={`btn-add-cart-modern ${isOutOfStock ? 'btn-disabled' : ''}`}
          onClick={handleAddToCart}
          disabled={isOutOfStock || adding}
        >
          {isOutOfStock ? 'Out of Stock' : (adding ? 'Adding...' : 'Add to Cart')}
        </button>
        <Link to={`/products/${product.id}`} className="btn-view-detail-modern">
          View Details
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;
