import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [product, setProduct] = useState(null);
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState(null);

  // Stock adjustment
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockAction, setStockAction] = useState('add');
  const [stockAmount, setStockAmount] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [stockSaving, setStockSaving] = useState(false);

  // Check if user can edit (role-based)
  const canEdit = user && ['admin', 'super_admin', 'manager'].includes(user.role);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/admin/${id}/edit`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setProduct(data.data.product);
        setEditedProduct(data.data.product);
        setInventoryHistory(data.data.inventoryHistory || []);
      } else {
        setError(data.message || 'Failed to load product');
      }
    } catch (err) {
      console.error('Failed to fetch product:', err);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditedProduct(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    if (!canEdit) {
      alert('You do not have permission to edit products');
      return;
    }

    setSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch(`/api/products/admin/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedProduct)
      });

      const data = await response.json();

      if (data.success) {
        setProduct(data.product || editedProduct);
        setIsEditing(false);
        setSaveMessage('Product updated successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        alert(data.message || 'Failed to update product');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProduct(product);
    setIsEditing(false);
  };

  const handleStockAdjustment = async (e) => {
    e.preventDefault();
    if (!stockAmount || parseInt(stockAmount) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    setStockSaving(true);
    try {
      const endpoint = stockAction === 'add'
        ? `/api/products/admin/inventory/${id}/add-stock`
        : `/api/products/admin/inventory/${id}/remove-stock`;

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
        setShowStockModal(false);
        setStockAmount('');
        setStockReason('');
        fetchProduct(); // Refresh data
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

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/admin/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        alert('Product deleted successfully');
        navigate('/admin/products');
      } else {
        alert(data.message || 'Failed to delete product');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete product');
    }
  };

  const toggleProductStatus = async () => {
    try {
      const response = await fetch(`/api/products/admin/${id}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        fetchProduct();
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

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStockStatusBadge = () => {
    if (!product) return null;
    if (product.stockQuantity === 0) {
      return <span className="stock-badge stock-out">OUT OF STOCK</span>;
    } else if (product.stockQuantity <= (product.lowStockThreshold || 5)) {
      return <span className="stock-badge stock-low">LOW STOCK</span>;
    }
    return <span className="stock-badge stock-ok">In Stock</span>;
  };

  const getCaffeineBadge = (level) => {
    const colors = {
      'caffeine_free': { bg: '#d1fae5', color: '#065f46' },
      'low': { bg: '#fef3c7', color: '#92400e' },
      'medium': { bg: '#fed7aa', color: '#9a3412' },
      'high': { bg: '#fecaca', color: '#991b1b' }
    };
    const style = colors[level] || { bg: '#e5e7eb', color: '#374151' };
    const label = level ? level.replace('_', ' ').toUpperCase() : 'N/A';
    return (
      <span style={{ background: style.bg, color: style.color, padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="loading-state">Loading product details...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <div className="error-state">
          <h3>Error</h3>
          <p>{error || 'Product not found'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/admin/products')}>
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const currentData = isEditing ? editedProduct : product;

  return (
    <div className="product-detail-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <button className="btn-back" onClick={() => navigate('/admin/products')}>
            ← Back to Products
          </button>
          <h1>{currentData.name}</h1>
          <div className="header-badges">
            {getStockStatusBadge()}
            <span className={`status-badge ${product.isActive ? 'status-active' : 'status-inactive'}`}>
              {product.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="header-actions">
          {saveMessage && <span className="save-message success">{saveMessage}</span>}
          {canEdit && !isEditing && (
            <>
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                Edit Product
              </button>
              <button
                className={`btn ${product.isActive ? 'btn-warning' : 'btn-success'}`}
                onClick={toggleProductStatus}
              >
                {product.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="permission-notice">
          You have view-only access. Contact an administrator to make changes.
        </div>
      )}

      <div className="detail-grid">
        {/* Main Info Card */}
        <div className="detail-card main-info">
          <div className="card-header">
            <h2>Product Information</h2>
          </div>
          <div className="card-body">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={currentData.name || ''}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={currentData.description || ''}
                    onChange={handleInputChange}
                    className="form-textarea"
                    rows="3"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      name="category"
                      value={currentData.category || ''}
                      onChange={handleInputChange}
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
                    <label>Tea Type</label>
                    <select
                      name="teaType"
                      value={currentData.teaType || 'loose_leaf'}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="loose_leaf">Loose Leaf</option>
                      <option value="tea_bags">Tea Bags</option>
                      <option value="both">Both Available</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Image URL</label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={currentData.imageUrl || ''}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="https://..."
                  />
                </div>
              </div>
            ) : (
              <div className="product-hero">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="product-image" />
                ) : (
                  <div className="product-image-placeholder">No Image</div>
                )}
                <div className="product-summary">
                  <h3>{product.name}</h3>
                  <p className="product-category">{product.category || 'Uncategorized'}</p>
                  <div className="product-pricing">
                    <span className="current-price">{formatCurrency(product.price)}</span>
                    {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                      <span className="mrp-price"><s>{formatCurrency(product.mrp)}</s></span>
                    )}
                    {product.discount > 0 && (
                      <span className="discount-badge">{product.discount}% OFF</span>
                    )}
                  </div>
                  <p className="product-description">{product.description || 'No description available'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Card */}
        <div className="detail-card">
          <div className="card-header">
            <h2>Pricing</h2>
          </div>
          <div className="card-body">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>MRP ($)</label>
                    <input
                      type="number"
                      name="mrp"
                      value={currentData.mrp || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Selling Price ($) *</label>
                    <input
                      type="number"
                      name="price"
                      value={currentData.price || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="form-input"
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Discount (%)</label>
                    <input
                      type="number"
                      name="discount"
                      value={currentData.discount || ''}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Cost Price ($)</label>
                    <input
                      type="number"
                      name="purchaseCost"
                      value={currentData.purchaseCost || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">MRP</span>
                  <span className="info-value">{product.mrp ? formatCurrency(product.mrp) : '-'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Selling Price</span>
                  <span className="info-value">{formatCurrency(product.price)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Discount</span>
                  <span className="info-value">{product.discount ? `${product.discount}%` : '-'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Cost Price</span>
                  <span className="info-value">{product.purchaseCost ? formatCurrency(product.purchaseCost) : '-'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stock Card */}
        <div className="detail-card stock-info">
          <div className="card-header">
            <h2>Inventory</h2>
            {canEdit && (
              <div className="card-actions">
                <button className="btn btn-success btn-sm" onClick={() => { setStockAction('add'); setShowStockModal(true); }}>
                  + Add Stock
                </button>
                <button
                  className="btn btn-warning btn-sm"
                  onClick={() => { setStockAction('remove'); setShowStockModal(true); }}
                  disabled={product.stockQuantity === 0}
                >
                  - Remove
                </button>
              </div>
            )}
          </div>
          <div className="card-body">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Low Stock Alert (units)</label>
                    <input
                      type="number"
                      name="lowStockThreshold"
                      value={currentData.lowStockThreshold || 5}
                      onChange={handleInputChange}
                      min="0"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Reorder Level (units)</label>
                    <input
                      type="number"
                      name="reorderLevel"
                      value={currentData.reorderLevel || 10}
                      onChange={handleInputChange}
                      min="0"
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Warehouse Stock</label>
                  <input
                    type="number"
                    name="warehouseStock"
                    value={currentData.warehouseStock || 0}
                    onChange={handleInputChange}
                    min="0"
                    className="form-input"
                  />
                </div>
                <p className="form-hint">Note: To adjust main stock, use the +/- buttons above.</p>
              </div>
            ) : (
              <div className="stock-stats">
                <div className="stat-item">
                  <span className="stat-label">Available Stock</span>
                  <span className={`stat-value ${product.stockQuantity <= 5 ? 'text-warning' : ''} ${product.stockQuantity === 0 ? 'text-danger' : ''}`}>
                    {product.stockQuantity}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Warehouse Stock</span>
                  <span className="stat-value">{product.warehouseStock || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Reserved</span>
                  <span className="stat-value">{product.reservedStock || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Low Stock Alert</span>
                  <span className="stat-value">{product.lowStockThreshold || 5} units</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Reorder Level</span>
                  <span className="stat-value">{product.reorderLevel || 10} units</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Last Restocked</span>
                  <span className="stat-value">{formatDate(product.lastRestockedAt)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Identifiers Card */}
        <div className="detail-card">
          <div className="card-header">
            <h2>Product Identifiers</h2>
          </div>
          <div className="card-body">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>SKU</label>
                    <input
                      type="text"
                      name="sku"
                      value={currentData.sku || ''}
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
                      value={currentData.barcode || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Scan or enter barcode"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">SKU</span>
                  <span className="info-value code">{product.sku || 'Not set'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Barcode</span>
                  <span className="info-value code">{product.barcode || 'Not set'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Product ID</span>
                  <span className="info-value code">#{product.id}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tea Details Card */}
        <div className="detail-card">
          <div className="card-header">
            <h2>Tea Details</h2>
          </div>
          <div className="card-body">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Caffeine Level</label>
                    <select
                      name="caffeineLevel"
                      value={currentData.caffeineLevel || ''}
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
                    <label>Origin Country</label>
                    <select
                      name="originCountry"
                      value={currentData.originCountry || ''}
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
                </div>
                <div className="form-group">
                  <label>Flavour Notes</label>
                  <textarea
                    name="flavourNotes"
                    value={currentData.flavourNotes || ''}
                    onChange={handleInputChange}
                    className="form-textarea"
                    rows="2"
                    placeholder="e.g., Floral, citrus, earthy undertones..."
                  />
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="isImported"
                      checked={currentData.isImported || false}
                      onChange={handleInputChange}
                    />
                    This is an imported product
                  </label>
                </div>
              </div>
            ) : (
              <>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Tea Type</span>
                    <span className="info-value">
                      {product.teaType === 'tea_bags' ? 'Tea Bags' :
                       product.teaType === 'both' ? 'Loose Leaf & Tea Bags' : 'Loose Leaf'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Caffeine Level</span>
                    <span className="info-value">{getCaffeineBadge(product.caffeineLevel)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Origin</span>
                    <span className="info-value">{product.originCountry || 'Not specified'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Imported</span>
                    <span className="info-value">{product.isImported ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                {product.flavourNotes && (
                  <div className="info-block">
                    <span className="info-label">Flavour Notes</span>
                    <p className="info-text">{product.flavourNotes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Brewing Instructions Card */}
        <div className="detail-card">
          <div className="card-header">
            <h2>Brewing Guide</h2>
          </div>
          <div className="card-body">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Brewing Temperature</label>
                    <input
                      type="text"
                      name="brewingTemp"
                      value={currentData.brewingTemp || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., 85°C / 185°F"
                    />
                  </div>
                  <div className="form-group">
                    <label>Brewing Time</label>
                    <input
                      type="text"
                      name="brewingTime"
                      value={currentData.brewingTime || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., 3-5 minutes"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Brewing Instructions</label>
                  <textarea
                    name="brewingInstructions"
                    value={currentData.brewingInstructions || ''}
                    onChange={handleInputChange}
                    className="form-textarea"
                    rows="3"
                    placeholder="How to brew this tea..."
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Temperature</span>
                    <span className="info-value">{product.brewingTemp || 'Not specified'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Steep Time</span>
                    <span className="info-value">{product.brewingTime || 'Not specified'}</span>
                  </div>
                </div>
                {product.brewingInstructions && (
                  <div className="info-block">
                    <span className="info-label">Instructions</span>
                    <p className="info-text">{product.brewingInstructions}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Packaging Card */}
        <div className="detail-card">
          <div className="card-header">
            <h2>Packaging & Shipping</h2>
          </div>
          <div className="card-body">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Package Size</label>
                    <input
                      type="text"
                      name="packetSize"
                      value={currentData.packetSize || ''}
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
                      value={currentData.packetSizeGrams || ''}
                      onChange={handleInputChange}
                      min="0"
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Packaging Type</label>
                    <select
                      name="packagingType"
                      value={currentData.packagingType || ''}
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
                  <div className="form-group">
                    <label>Shipping Days</label>
                    <input
                      type="number"
                      name="shippingDays"
                      value={currentData.shippingDays || 3}
                      onChange={handleInputChange}
                      min="1"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Package Size</span>
                  <span className="info-value">{product.packetSize || 'Not specified'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Weight</span>
                  <span className="info-value">{product.packetSizeGrams ? `${product.packetSizeGrams}g` : 'Not specified'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Packaging Type</span>
                  <span className="info-value" style={{ textTransform: 'capitalize' }}>
                    {product.packagingType?.replace('_', ' ') || 'Not specified'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Shipping Days</span>
                  <span className="info-value">{product.shippingDays || 3} days</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Supplier Card */}
        <div className="detail-card">
          <div className="card-header">
            <h2>Supplier Information</h2>
          </div>
          <div className="card-body">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Supplier Name</label>
                    <input
                      type="text"
                      name="supplier"
                      value={currentData.supplier || ''}
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
                      value={currentData.supplierCode || ''}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="SUP-001"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Supplier</span>
                  <span className="info-value">{product.supplier || 'Not specified'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Supplier Code</span>
                  <span className="info-value code">{product.supplierCode || 'Not set'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Purchase Cost</span>
                  <span className="info-value">{product.purchaseCost ? formatCurrency(product.purchaseCost) : 'Not set'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Profit Margin</span>
                  <span className="info-value">{product.profitMargin ? `${product.profitMargin}%` : 'Not calculated'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inventory History Card */}
        <div className="detail-card full-width">
          <div className="card-header">
            <h2>Recent Inventory Changes</h2>
          </div>
          <div className="card-body">
            {inventoryHistory.length === 0 ? (
              <p className="no-data">No inventory changes recorded</p>
            ) : (
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Change</th>
                    <th>Previous</th>
                    <th>New</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryHistory.map((log, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(log.created_at || log.createdAt)}</td>
                      <td>
                        <span className={`action-badge action-${log.action}`}>
                          {log.action?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={log.quantityChange > 0 ? 'text-success' : 'text-danger'}>
                        {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                      </td>
                      <td>{log.previousStock}</td>
                      <td>{log.newStock}</td>
                      <td>{log.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Timestamps Card */}
        <div className="detail-card">
          <div className="card-header">
            <h2>Record Info</h2>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Created</span>
                <span className="info-value">{formatDate(product.created_at || product.createdAt)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Last Updated</span>
                <span className="info-value">{formatDate(product.updated_at || product.updatedAt)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Average Rating</span>
                <span className="info-value">{product.averageRating || 0} / 5 ({product.reviewCount || 0} reviews)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Status Card */}
        <div className="detail-card">
          <div className="card-header">
            <h2>Visibility Settings</h2>
          </div>
          <div className="card-body">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={currentData.isActive !== false}
                      onChange={handleInputChange}
                    />
                    Product is active (visible to customers)
                  </label>
                </div>
              </div>
            ) : (
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Status</span>
                  <span className={`status-badge ${product.isActive ? 'status-active' : 'status-inactive'}`}>
                    {product.isActive ? 'Active - Visible to customers' : 'Inactive - Hidden from customers'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {showStockModal && (
        <div className="modal-overlay" onClick={() => setShowStockModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{stockAction === 'add' ? 'Add Stock' : 'Remove Stock'}</h2>
              <button className="modal-close" onClick={() => setShowStockModal(false)}>×</button>
            </div>
            <form onSubmit={handleStockAdjustment}>
              <div className="modal-body">
                <div className="stock-product-info">
                  <strong>{product.name}</strong>
                  <p>Current Stock: <span className={product.stockQuantity <= 5 ? 'text-warning' : ''}>{product.stockQuantity}</span></p>
                </div>

                <div className="form-group">
                  <label>Quantity to {stockAction === 'add' ? 'Add' : 'Remove'} *</label>
                  <input
                    type="number"
                    value={stockAmount}
                    onChange={(e) => setStockAmount(e.target.value)}
                    min="1"
                    max={stockAction === 'remove' ? product.stockQuantity : undefined}
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

                {stockAmount && (
                  <div className="stock-preview">
                    New stock will be: <strong>
                      {stockAction === 'add'
                        ? product.stockQuantity + parseInt(stockAmount || 0)
                        : Math.max(0, product.stockQuantity - parseInt(stockAmount || 0))}
                    </strong>
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

export default ProductDetail;
