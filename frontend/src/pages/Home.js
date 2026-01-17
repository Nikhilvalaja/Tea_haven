import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        if (data.success) {
          setBestSellers(data.data.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBestSellers();
  }, []);

  return (
    <div className="modern-home">
      {/* Hero Section */}
      <section className="modern-hero">
        <div className="hero-overlay"></div>
        <div className="hero-container">
          <div className="hero-text">
            <h1 className="hero-headline">Premium Tea, Delivered to Your Door</h1>
            <p className="hero-subtext">Handpicked from the world's finest tea gardens</p>
            <Link to="/products" className="hero-cta">
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="trust-section">
        <div className="container-modern">
          <div className="trust-grid">
            <div className="trust-item">
              <div className="trust-icon">✓</div>
              <div className="trust-text">Free Shipping Over $50</div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">✓</div>
              <div className="trust-text">Direct From Origin</div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">✓</div>
              <div className="trust-text">30-Day Money Back</div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">✓</div>
              <div className="trust-text">Expert Curated</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="categories-modern">
        <div className="container-modern">
          <h2 className="section-title-modern">Shop by Category</h2>
          <div className="categories-grid-modern">
            <Link to="/products?category=Green Tea" className="category-modern">
              <div className="category-image-placeholder" style={{backgroundColor: '#c8e6c9'}}>
                <span className="category-emoji">🍵</span>
              </div>
              <h3 className="category-name">Green Tea</h3>
            </Link>
            <Link to="/products?category=Black Tea" className="category-modern">
              <div className="category-image-placeholder" style={{backgroundColor: '#d7ccc8'}}>
                <span className="category-emoji">☕</span>
              </div>
              <h3 className="category-name">Black Tea</h3>
            </Link>
            <Link to="/products?category=Herbal Tea" className="category-modern">
              <div className="category-image-placeholder" style={{backgroundColor: '#f8bbd0'}}>
                <span className="category-emoji">🌸</span>
              </div>
              <h3 className="category-name">Herbal Tea</h3>
            </Link>
            <Link to="/products?category=Oolong Tea" className="category-modern">
              <div className="category-image-placeholder" style={{backgroundColor: '#ffe0b2'}}>
                <span className="category-emoji">🫖</span>
              </div>
              <h3 className="category-name">Oolong Tea</h3>
            </Link>
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="bestsellers-modern">
        <div className="container-modern">
          <div className="bestsellers-header">
            <h2 className="section-title-modern">Best Sellers</h2>
            <Link to="/products" className="view-all-link-modern">View All</Link>
          </div>

          {loading ? (
            <div className="loading-modern">Loading products...</div>
          ) : (
            <div className="products-grid-modern">
              {bestSellers.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Social Proof */}
      <section className="social-proof-modern">
        <div className="container-modern">
          <h2 className="section-title-modern">What Our Customers Say</h2>
          <div className="reviews-grid-modern">
            <div className="review-card-modern">
              <div className="review-stars">★★★★★</div>
              <p className="review-text">"The best tea I've ever ordered online. Fresh, authentic, and delivered fast."</p>
              <p className="review-author">- Sarah M.</p>
            </div>
            <div className="review-card-modern">
              <div className="review-stars">★★★★★</div>
              <p className="review-text">"Amazing quality and customer service. My new go-to for premium tea."</p>
              <p className="review-author">- James L.</p>
            </div>
            <div className="review-card-modern">
              <div className="review-stars">★★★★★</div>
              <p className="review-text">"Authentic flavors from Japan and China. You can really taste the difference."</p>
              <p className="review-author">- Maria G.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why TeaHaven */}
      <section className="why-section-modern">
        <div className="container-modern">
          <h2 className="section-title-modern">Why TeaHaven?</h2>
          <div className="why-grid-modern">
            <div className="why-card-modern">
              <h3>Direct Sourcing</h3>
              <p>We work directly with tea farmers in Japan, China, India, and Sri Lanka</p>
            </div>
            <div className="why-card-modern">
              <h3>Quality Assured</h3>
              <p>Every batch is tested for purity and flavor by our expert tea sommeliers</p>
            </div>
            <div className="why-card-modern">
              <h3>Fast Delivery</h3>
              <p>Local stock ships in 2-3 days. Imported teas available with tracking</p>
            </div>
            <div className="why-card-modern">
              <h3>Fair Trade</h3>
              <p>Supporting sustainable farming practices and fair wages for growers</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
