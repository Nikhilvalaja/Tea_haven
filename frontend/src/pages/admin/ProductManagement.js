import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProductManagement = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const skuInputRef = useRef(null);

  // Quick lookup state
  const [showQuickLookup, setShowQuickLookup] = useState(false);
  const [skuInput, setSkuInput] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // Modal state for add/edit
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  // Stock adjustment modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockAction, setStockAction] = useState('add'); // 'add' or 'remove'
  const [stockProduct, setStockProduct] = useState(null);
  const [stockAmount, setStockAmount] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [stockSaving, setStockSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    // Pricing
    mrp: '',
    price: '',
    discount: '',
    // Category & Type
    category: '',
    teaType: 'loose_leaf',
    packagingType: '',
    // Package
    packetSize: '',
    packetSizeGrams: '',
    // Origin & Shipping
    originCountry: '',
    isImported: false,
    shippingDays: 3,
    // Tea characteristics
    caffeineLevel: '',
    flavourNotes: '',
    brewingInstructions: '',
    brewingTemp: '',
    brewingTime: '',
    // Supplier
    supplier: '',
    supplierCode: '',
    // Inventory
    sku: '',
    barcode: '',
    stockQuantity: 0,
    warehouseStock: 0,
    reorderLevel: 10,
    lowStockThreshold: 5,
    purchaseCost: '',
    // Image & Status
    imageUrl: '',
    isActive: true
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products/admin/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setProducts(data.products || []);
        const uniqueCategories = [...new Set(data.products.map(p => p.category).filter(Boolean))];
        setCategories(uniqueCategories);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Focus SKU input when quick lookup opens
  useEffect(() => {
    if (showQuickLookup && skuInputRef.current) {
      skuInputRef.current.focus();
    }
  }, [showQuickLookup]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Quick SKU/Barcode lookup
  const handleSkuLookup = async (e) => {
    e.preventDefault();
    if (!skuInput.trim()) return;

    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);

    try {
      const response = await fetch(`/api/products/admin/barcode/${encodeURIComponent(skuInput.trim())}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setLookupResult(data.data);
      } else {
        setLookupError(data.message || 'Product not found');
      }
    } catch (err) {
      setLookupError('Failed to lookup product');
    } finally {
      setLookupLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      mrp: '',
      price: '',
      discount: '',
      category: '',
      teaType: 'loose_leaf',
      packagingType: '',
      packetSize: '',
      packetSizeGrams: '',
      originCountry: '',
      isImported: false,
      shippingDays: 3,
      caffeineLevel: '',
      flavourNotes: '',
      brewingInstructions: '',
      brewingTemp: '',
      brewingTime: '',
      supplier: '',
      supplierCode: '',
      sku: '',
      barcode: '',
      stockQuantity: 0,
      warehouseStock: 0,
      reorderLevel: 10,
      lowStockThreshold: 5,
      purchaseCost: '',
      imageUrl: '',
      isActive: true
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      mrp: product.mrp || '',
      price: product.price || '',
      discount: product.discount || '',
      category: product.category || '',
      teaType: product.teaType || 'loose_leaf',
      packagingType: product.packagingType || '',
      packetSize: product.packetSize || '',
      packetSizeGrams: product.packetSizeGrams || '',
      originCountry: product.originCountry || '',
      isImported: product.isImported || false,
      shippingDays: product.shippingDays || 3,
      caffeineLevel: product.caffeineLevel || '',
      flavourNotes: product.flavourNotes || '',
      brewingInstructions: product.brewingInstructions || '',
      brewingTemp: product.brewingTemp || '',
      brewingTime: product.brewingTime || '',
      supplier: product.supplier || '',
      supplierCode: product.supplierCode || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      stockQuantity: product.stockQuantity || 0,
      warehouseStock: product.warehouseStock || 0,
      reorderLevel: product.reorderLevel || 10,
      lowStockThreshold: product.lowStockThreshold || 5,
      purchaseCost: product.purchaseCost || '',
      imageUrl: product.imageUrl || '',
      isActive: product.isActive !== false
    });
    setShowModal(true);
    setShowQuickLookup(false);
  };

  // Open stock adjustment modal
  const openStockModal = (product, action) => {
    setStockProduct(product);
    setStockAction(action);
    setStockAmount('');
    setStockReason('');
    setShowStockModal(true);
  };

  // Handle stock adjustment
  const handleStockAdjustment = async (e) => {
    e.preventDefault();
    if (!stockAmount || parseInt(stockAmount) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    setStockSaving(true);
    try {
      const endpoint = stockAction === 'add'
        ? `/api/products/admin/inventory/${stockProduct.id}/add-stock`
        : `/api/products/admin/inventory/${stockProduct.id}/remove-stock`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: parseInt(stockAmount),
          reason: stockReason || (stockAction === 'add' ? 'Stock replenishment' : 'Stock adjustment')
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Stock ${stockAction === 'add' ? 'added' : 'removed'} successfully!`);
        setShowStockModal(false);
        fetchProducts();
      } else {
        alert(data.message || 'Failed to update stock');
      }
    } catch (err) {
      console.error('Stock adjustment error:', err);
      alert('Failed to update stock');
    } finally {
      setStockSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingProduct
        ? `/api/products/admin/${editingProduct.id}`
        : '/api/products/admin';

      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        alert(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
        setShowModal(false);
        fetchProducts();
      } else {
        alert(data.message || 'Failed to save product');
      }
    } catch (err) {
      console.error('Save product error:', err);
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/products/admin/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        alert('Product deleted successfully!');
        fetchProducts();
      } else {
        alert(data.message || 'Failed to delete product');
      }
    } catch (err) {
      console.error('Delete product error:', err);
      alert('Failed to delete product');
    }
  };

  const toggleProductStatus = async (product) => {
    try {
      const response = await fetch(`/api/products/admin/${product.id}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        fetchProducts();
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="product-management">
      <div className="page-header">
        <div className="header-content">
          <h1>Product Management</h1>
          <p className="page-subtitle">Manage your tea products catalog</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => { setShowQuickLookup(true); setSkuInput(''); setLookupResult(null); setLookupError(''); }}
          >
            Scan/Lookup SKU
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add New Product
          </button>
        </div>
      </div>

      {/* Quick SKU Lookup Panel */}
      {showQuickLookup && (
        <div className="quick-lookup-panel">
          <div className="lookup-header">
            <h3>Quick Product Lookup</h3>
            <button className="close-btn" onClick={() => setShowQuickLookup(false)}>x</button>
          </div>
          <form onSubmit={handleSkuLookup} className="lookup-form">
            <div className="lookup-input-group">
              <input
                ref={skuInputRef}
                type="text"
                placeholder="Scan barcode or enter SKU..."
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                className="lookup-input"
                autoFocus
              />
              <button type="submit" className="btn btn-primary" disabled={lookupLoading}>
                {lookupLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
            <p className="lookup-hint">Tip: Use a barcode scanner or manually enter SKU/barcode</p>
          </form>

          {lookupError && (
            <div className="lookup-error">
              <span>{lookupError}</span>
              <button className="btn btn-primary btn-sm" onClick={openAddModal}>
                + Add New Product
              </button>
            </div>
          )}

          {lookupResult && (
            <div className="lookup-result">
              <div className="result-product">
                {lookupResult.imageUrl ? (
                  <img src={lookupResult.imageUrl} alt={lookupResult.name} className="result-image" />
                ) : (
                  <div className="result-image-placeholder">No Image</div>
                )}
                <div className="result-info">
                  <h4>{lookupResult.name}</h4>
                  <p className="result-sku">SKU: {lookupResult.sku || 'N/A'}</p>
                  <p className="result-category">{lookupResult.category}</p>
                  <div className="result-stats">
                    <span className="stat">
                      <strong>Price:</strong> {formatCurrency(lookupResult.price)}
                    </span>
                    <span className="stat">
                      <strong>Stock:</strong> {lookupResult.stockQuantity}
                    </span>
                    <span className={`stat status-${lookupResult.isActive ? 'active' : 'inactive'}`}>
                      {lookupResult.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="result-actions">
                <button className="btn btn-primary" onClick={() => openEditModal(lookupResult)}>
                  Edit Product
                </button>
                <button className="btn btn-secondary" onClick={() => {
                  setSkuInput('');
                  setLookupResult(null);
                  skuInputRef.current?.focus();
                }}>
                  Scan Another
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="filter-info">
          <span className="info-badge">{filteredProducts.length} products</span>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="loading-state">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <h3>No products found</h3>
          <p>Get started by adding your first product</p>
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add New Product
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Stock Status</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => {
                const isOutOfStock = product.stockQuantity === 0;
                const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= (product.lowStockThreshold || 5);

                return (
                  <tr key={product.id} className={!product.isActive ? 'row-inactive' : ''}>
                    <td>
                      <div className="product-cell">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="product-thumb" />
                        ) : (
                          <div className="product-thumb-placeholder">No Img</div>
                        )}
                        <div className="product-info">
                          <Link to={`/admin/products/${product.id}`} className="product-name-link">
                            {product.name}
                          </Link>
                          <span className="product-sku">{product.sku || 'No SKU'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{product.category || '-'}</td>
                    <td>
                      <div>
                        <strong>{formatCurrency(product.price)}</strong>
                        {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                          <div className="mrp-price"><s>{formatCurrency(product.mrp)}</s></div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="stock-cell">
                        <span className={isOutOfStock ? 'text-danger' : isLowStock ? 'text-warning' : ''}>
                          {product.stockQuantity}
                        </span>
                        <div className="stock-buttons">
                          <button
                            className="btn-xs btn-success"
                            onClick={() => openStockModal(product, 'add')}
                            title="Add Stock"
                          >
                            +
                          </button>
                          <button
                            className="btn-xs btn-warning"
                            onClick={() => openStockModal(product, 'remove')}
                            title="Remove Stock"
                            disabled={product.stockQuantity === 0}
                          >
                            -
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>
                      {isOutOfStock ? (
                        <span className="stock-badge stock-out">OUT OF STOCK</span>
                      ) : isLowStock ? (
                        <span className="stock-badge stock-low">LOW STOCK</span>
                      ) : (
                        <span className="stock-badge stock-ok">In Stock</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${product.isActive ? 'status-active' : 'status-inactive'}`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-sm btn-primary"
                          onClick={() => openEditModal(product)}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          className={`btn-sm ${product.isActive ? 'btn-warning' : 'btn-success'}`}
                          onClick={() => toggleProductStatus(product)}
                          title={product.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {product.isActive ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>x</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  {/* Basic Info */}
                  <div className="form-section">
                    <h3>Basic Information</h3>
                    <div className="form-group">
                      <label>Product Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                        placeholder="e.g., Earl Grey Classic"
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="form-textarea"
                        rows="3"
                        placeholder="Product description..."
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Category *</label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          required
                          className="form-select"
                        >
                          <option value="">Select Category</option>
                          <option value="Black Tea">Black Tea</option>
                          <option value="Green Tea">Green Tea</option>
                          <option value="Herbal Tea">Herbal Tea</option>
                          <option value="Oolong Tea">Oolong Tea</option>
                          <option value="White Tea">White Tea</option>
                          <option value="Pu-erh Tea">Pu-erh Tea</option>
                          <option value="Chai">Chai</option>
                          <option value="Matcha">Matcha</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Tea Type *</label>
                        <select
                          name="teaType"
                          value={formData.teaType}
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          <option value="loose_leaf">Loose Leaf</option>
                          <option value="tea_bags">Tea Bags</option>
                          <option value="both">Both Available</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="form-section">
                    <h3>Pricing</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>MRP ($)</label>
                        <input
                          type="number"
                          name="mrp"
                          value={formData.mrp}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          className="form-input"
                          placeholder="19.99"
                        />
                      </div>
                      <div className="form-group">
                        <label>Selling Price ($) *</label>
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          required
                          min="0"
                          step="0.01"
                          className="form-input"
                          placeholder="14.99"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Discount (%)</label>
                        <input
                          type="number"
                          name="discount"
                          value={formData.discount}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                          step="0.01"
                          className="form-input"
                          placeholder="10"
                        />
                      </div>
                      <div className="form-group">
                        <label>Cost Price ($)</label>
                        <input
                          type="number"
                          name="purchaseCost"
                          value={formData.purchaseCost}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          className="form-input"
                          placeholder="8.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Supplier Info */}
                  <div className="form-section">
                    <h3>Supplier Information</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Supplier Name</label>
                        <input
                          type="text"
                          name="supplier"
                          value={formData.supplier}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Tea Supplier Co."
                        />
                      </div>
                      <div className="form-group">
                        <label>Supplier Code</label>
                        <input
                          type="text"
                          name="supplierCode"
                          value={formData.supplierCode}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="SUP-001"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Inventory */}
                  <div className="form-section">
                    <h3>Inventory & SKU</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>SKU (Stock Keeping Unit)</label>
                        <input
                          type="text"
                          name="sku"
                          value={formData.sku}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="TEA-EG-100"
                        />
                      </div>
                      <div className="form-group">
                        <label>Barcode</label>
                        <input
                          type="text"
                          name="barcode"
                          value={formData.barcode}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Scan or enter barcode"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>{editingProduct ? 'Current Stock' : 'Initial Stock'}</label>
                        <input
                          type="number"
                          name="stockQuantity"
                          value={formData.stockQuantity}
                          onChange={handleInputChange}
                          min="0"
                          className="form-input"
                          disabled={!!editingProduct}
                        />
                        {editingProduct && (
                          <small className="form-hint">Use +/- buttons in table to adjust stock</small>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Warehouse Stock</label>
                        <input
                          type="number"
                          name="warehouseStock"
                          value={formData.warehouseStock}
                          onChange={handleInputChange}
                          min="0"
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Low Stock Alert (units)</label>
                        <input
                          type="number"
                          name="lowStockThreshold"
                          value={formData.lowStockThreshold}
                          onChange={handleInputChange}
                          min="0"
                          className="form-input"
                          placeholder="5"
                        />
                      </div>
                      <div className="form-group">
                        <label>Reorder Level (units)</label>
                        <input
                          type="number"
                          name="reorderLevel"
                          value={formData.reorderLevel}
                          onChange={handleInputChange}
                          min="0"
                          className="form-input"
                          placeholder="10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Package Info */}
                  <div className="form-section">
                    <h3>Package Information</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Packet Size</label>
                        <input
                          type="text"
                          name="packetSize"
                          value={formData.packetSize}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="e.g., 100g, 50 Tea Bags"
                        />
                      </div>
                      <div className="form-group">
                        <label>Size in Grams</label>
                        <input
                          type="number"
                          name="packetSizeGrams"
                          value={formData.packetSizeGrams}
                          onChange={handleInputChange}
                          min="0"
                          className="form-input"
                          placeholder="100"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Packaging Type</label>
                      <select
                        name="packagingType"
                        value={formData.packagingType}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        <option value="">Select Packaging</option>
                        <option value="pouch">Pouch</option>
                        <option value="box">Box</option>
                        <option value="tin">Tin</option>
                        <option value="jar">Jar</option>
                        <option value="sachet">Sachet</option>
                        <option value="gift_box">Gift Box</option>
                      </select>
                    </div>
                  </div>

                  {/* Tea Characteristics */}
                  <div className="form-section">
                    <h3>Tea Characteristics</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Caffeine Level</label>
                        <select
                          name="caffeineLevel"
                          value={formData.caffeineLevel}
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          <option value="">Select Level</option>
                          <option value="caffeine_free">Caffeine Free</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Brewing Temperature</label>
                        <input
                          type="text"
                          name="brewingTemp"
                          value={formData.brewingTemp}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="e.g., 85°C / 185°F"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Brewing Time</label>
                        <input
                          type="text"
                          name="brewingTime"
                          value={formData.brewingTime}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="e.g., 3-5 minutes"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Flavour Notes</label>
                      <textarea
                        name="flavourNotes"
                        value={formData.flavourNotes}
                        onChange={handleInputChange}
                        className="form-textarea"
                        rows="2"
                        placeholder="e.g., Floral, citrus, earthy undertones..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Brewing Instructions</label>
                      <textarea
                        name="brewingInstructions"
                        value={formData.brewingInstructions}
                        onChange={handleInputChange}
                        className="form-textarea"
                        rows="2"
                        placeholder="How to brew this tea..."
                      />
                    </div>
                  </div>

                  {/* Origin & Shipping */}
                  <div className="form-section">
                    <h3>Origin & Shipping</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Origin Country</label>
                        <select
                          name="originCountry"
                          value={formData.originCountry}
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          <option value="">Select Country</option>
                          <option value="India">India</option>
                          <option value="China">China</option>
                          <option value="Japan">Japan</option>
                          <option value="Sri Lanka">Sri Lanka</option>
                          <option value="Taiwan">Taiwan</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="South Africa">South Africa</option>
                          <option value="USA">USA</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Shipping Days</label>
                        <input
                          type="number"
                          name="shippingDays"
                          value={formData.shippingDays}
                          onChange={handleInputChange}
                          min="1"
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          name="isImported"
                          checked={formData.isImported}
                          onChange={handleInputChange}
                        />
                        This is an imported product
                      </label>
                    </div>
                  </div>

                  {/* Image & Status */}
                  <div className="form-section full-width">
                    <h3>Image & Status</h3>
                    <div className="form-group">
                      <label>Image URL</label>
                      <input
                        type="url"
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleInputChange}
                        />
                        Product is active (visible to customers)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && stockProduct && (
        <div className="modal-overlay" onClick={() => setShowStockModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{stockAction === 'add' ? 'Add Stock' : 'Remove Stock'}</h2>
              <button className="modal-close" onClick={() => setShowStockModal(false)}>x</button>
            </div>
            <form onSubmit={handleStockAdjustment}>
              <div className="modal-body">
                <div className="stock-product-info">
                  <strong>{stockProduct.name}</strong>
                  <p>Current Stock: <span className={stockProduct.stockQuantity <= 5 ? 'text-warning' : ''}>{stockProduct.stockQuantity}</span></p>
                </div>

                <div className="form-group">
                  <label>Quantity to {stockAction === 'add' ? 'Add' : 'Remove'} *</label>
                  <input
                    type="number"
                    value={stockAmount}
                    onChange={(e) => setStockAmount(e.target.value)}
                    min="1"
                    max={stockAction === 'remove' ? stockProduct.stockQuantity : undefined}
                    required
                    className="form-input"
                    placeholder="Enter quantity"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Reason (optional)</label>
                  <input
                    type="text"
                    value={stockReason}
                    onChange={(e) => setStockReason(e.target.value)}
                    className="form-input"
                    placeholder={stockAction === 'add' ? 'e.g., New shipment received' : 'e.g., Damaged items'}
                  />
                </div>

                {stockAction === 'add' && stockAmount && (
                  <div className="stock-preview">
                    New stock will be: <strong>{stockProduct.stockQuantity + parseInt(stockAmount || 0)}</strong>
                  </div>
                )}
                {stockAction === 'remove' && stockAmount && (
                  <div className="stock-preview">
                    New stock will be: <strong>{Math.max(0, stockProduct.stockQuantity - parseInt(stockAmount || 0))}</strong>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStockModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${stockAction === 'add' ? 'btn-success' : 'btn-warning'}`}
                  disabled={stockSaving}
                >
                  {stockSaving ? 'Saving...' : (stockAction === 'add' ? 'Add Stock' : 'Remove Stock')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
