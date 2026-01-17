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

    setAdding(true);
    const success = await addToCart(product.id, 1);
    setAdding(false);

    if (success) {
      alert(`${product.name} added to cart!`);
    }
  };

  const availableStock = product.stockQuantity - (product.reservedStock || 0);

  return (
    <div className="product-card-modern">
      <Link to={`/products/${product.id}`} className="product-card-link">
        {/* Product Image */}
        <div className="product-image-modern">
          <div className="product-image-placeholder-modern">
            <span className="product-emoji-modern">🍵</span>
          </div>
          {product.isImported && (
            <span className="imported-badge-modern">Imported</span>
          )}
          {availableStock < 10 && availableStock > 0 && (
            <span className="stock-badge-low">Low Stock</span>
          )}
        </div>

        {/* Product Info */}
        <div className="product-card-body">
          <h3 className="product-name-modern">{product.name}</h3>

          <div className="product-rating-modern">
            <span className="stars-modern">★★★★★</span>
            <span className="rating-count-modern">(24)</span>
          </div>

          <div className="product-price-modern">
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
          className="btn-add-cart-modern"
          onClick={handleAddToCart}
          disabled={availableStock === 0 || adding}
        >
          {availableStock === 0 ? 'Out of Stock' : (adding ? 'Adding...' : 'Add to Cart')}
        </button>
        <Link to={`/products/${product.id}`} className="btn-view-detail-modern">
          View Details
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;
