import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import '../ProductsPage.css';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [priceRange, setPriceRange] = useState([0, 50]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedOrigins, setSelectedOrigins] = useState([]);
  const [sortBy, setSortBy] = useState('popularity');
  const [showFilters, setShowFilters] = useState(true);

  const searchQuery = searchParams.get('search');
  const categoryParam = searchParams.get('category');
  const filterParam = searchParams.get('filter');

  useEffect(() => {
    fetchProducts();
  }, []);

  // Initialize filters from URL params
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategories([categoryParam]);
    }
  }, [categoryParam]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products');
      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filters
  const getUniqueCategories = () => {
    return [...new Set(products.map(p => p.category))].filter(Boolean);
  };

  const getUniqueTypes = () => {
    const types = products.map(p => p.teaType).filter(Boolean);
    const typeLabels = {
      'loose_leaf': 'Loose Leaf',
      'tea_bags': 'Tea Bags',
      'both': 'Both Available'
    };
    return [...new Set(types)].map(t => ({ value: t, label: typeLabels[t] || t }));
  };

  const getUniqueOrigins = () => {
    return [...new Set(products.map(p => p.originCountry))].filter(Boolean).sort();
  };

  // Apply all filters
  const getFilteredProducts = () => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(p =>
        selectedCategories.includes(p.category)
      );
    }

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(p =>
        selectedTypes.includes(p.teaType)
      );
    }

    // Origin filter
    if (selectedOrigins.length > 0) {
      filtered = filtered.filter(p =>
        selectedOrigins.includes(p.originCountry)
      );
    }

    // Price range filter
    filtered = filtered.filter(p => {
      const price = parseFloat(p.price);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Imported/Local filter from URL
    if (filterParam === 'imported') {
      filtered = filtered.filter(p => p.isImported === true);
    } else if (filterParam === 'local') {
      filtered = filtered.filter(p => !p.isImported);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return parseFloat(a.price) - parseFloat(b.price);
        case 'price-high':
          return parseFloat(b.price) - parseFloat(a.price);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popularity':
        default:
          return 0; // Keep original order
      }
    });

    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleOrigin = (origin) => {
    setSelectedOrigins(prev =>
      prev.includes(origin)
        ? prev.filter(o => o !== origin)
        : [...prev, origin]
    );
  };

  const clearAllFilters = () => {
    setPriceRange([0, 50]);
    setSelectedCategories([]);
    setSelectedTypes([]);
    setSelectedOrigins([]);
    setSortBy('popularity');
    setSearchParams({});
  };

  const getPageTitle = () => {
    if (searchQuery) return `Search results for "${searchQuery}"`;
    if (categoryParam) return `${categoryParam} Tea`;
    if (filterParam === 'imported') return 'Imported Teas';
    if (filterParam === 'local') return 'Local Stock';
    return 'All Teas';
  };

  const getPageDescription = () => {
    if (searchQuery) return `Found ${filteredProducts.length} products matching your search`;
    if (categoryParam) return 'Premium quality teas, carefully selected for freshness and flavor';
    return 'Browse our collection of premium teas from around the world';
  };

  const activeFilterCount =
    selectedCategories.length +
    selectedTypes.length +
    selectedOrigins.length +
    (priceRange[0] !== 0 || priceRange[1] !== 50 ? 1 : 0);

  return (
    <div className="products-page">
      <div className="products-container">
        {/* Header */}
        <div className="products-header">
          <div className="header-content">
            <h1>{getPageTitle()}</h1>
            <p className="header-description">{getPageDescription()}</p>
          </div>
          <div className="header-actions">
            <button
              className="filter-toggle-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? '✕ Hide Filters' : `🔍 Show Filters ${activeFilterCount > 0 ? `(${activeFilterCount})` : ''}`}
            </button>
          </div>
        </div>

        <div className="products-layout">
          {/* Sidebar Filters */}
          {showFilters && (
            <aside className="filters-sidebar">
              <div className="filters-header">
                <h3>Filters</h3>
                {activeFilterCount > 0 && (
                  <button className="clear-filters-btn" onClick={clearAllFilters}>
                    Clear All ({activeFilterCount})
                  </button>
                )}
              </div>

              {/* Price Range Filter */}
              <div className="filter-section">
                <h4>Price Range</h4>
                <div className="price-range-inputs">
                  <div className="price-input-group">
                    <label>Min</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                      className="price-input"
                    />
                  </div>
                  <span className="price-separator">-</span>
                  <div className="price-input-group">
                    <label>Max</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 50])}
                      className="price-input"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="price-slider"
                />
                <div className="price-range-display">
                  ${priceRange[0]} - ${priceRange[1]}
                </div>
              </div>

              {/* Category Filter */}
              <div className="filter-section">
                <h4>Category</h4>
                <div className="filter-options">
                  {getUniqueCategories().map(category => (
                    <label key={category} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                      />
                      <span>{category}</span>
                      <span className="filter-count">
                        ({products.filter(p => p.category === category).length})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tea Type Filter */}
              <div className="filter-section">
                <h4>Tea Type</h4>
                <div className="filter-options">
                  {getUniqueTypes().map(({ value, label }) => (
                    <label key={value} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(value)}
                        onChange={() => toggleType(value)}
                      />
                      <span>{label}</span>
                      <span className="filter-count">
                        ({products.filter(p => p.teaType === value).length})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Origin Filter */}
              <div className="filter-section">
                <h4>Origin Country</h4>
                <div className="filter-options scrollable">
                  {getUniqueOrigins().map(origin => (
                    <label key={origin} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedOrigins.includes(origin)}
                        onChange={() => toggleOrigin(origin)}
                      />
                      <span>{origin}</span>
                      <span className="filter-count">
                        ({products.filter(p => p.originCountry === origin).length})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <main className={`products-main ${!showFilters ? 'full-width' : ''}`}>
            {/* Toolbar */}
            <div className="products-toolbar">
              <div className="results-count">
                <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'product' : 'products'}
                {activeFilterCount > 0 && <span className="filtered-badge">Filtered</span>}
              </div>

              <div className="sort-controls">
                <label>Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="popularity">Most Popular</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name: A-Z</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner">🍵</div>
                <p>Loading teas...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="products-grid">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h2>No products found</h2>
                <p>Try adjusting your filters or search criteria</p>
                {activeFilterCount > 0 && (
                  <button className="btn-primary" onClick={clearAllFilters}>
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Products;
