import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../CheckoutStyles.css';

const Addresses = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromCheckout = location.state?.fromCheckout;
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  // Debug: Log token on component mount and when it changes
  useEffect(() => {
    console.log('🔑 Token status:', {
      exists: !!token,
      length: token?.length,
      value: token ? token.substring(0, 20) + '...' : 'null'
    });
  }, [token]);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    addressType: 'home',
    isDefault: false
  });

  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    console.log('Google Maps API Key status:', {
      exists: !!apiKey,
      length: apiKey?.length,
      firstChars: apiKey?.substring(0, 10) + '...'
    });

    if (!apiKey) {
      console.error('Missing Google Maps API key');
      setError('Google Maps API key not configured');
      return;
    }

    // Check if already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('Google Maps already loaded');
      setGoogleMapsLoaded(true);
      return;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    window.initGoogleMaps = () => {
      console.log('✓ Google Maps loaded successfully');
      setGoogleMapsLoaded(true);
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setError('Failed to load Google Maps. Check your API key and internet connection.');
    };

    document.head.appendChild(script);

    return () => {
      delete window.initGoogleMaps;
    };
  }, []);

  useEffect(() => {
    fetchAddresses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debug: Log addresses when they change
  useEffect(() => {
    console.log('📋 Addresses state updated:', addresses);
    console.log('📋 Number of addresses:', addresses.length);
  }, [addresses]);

  useEffect(() => {
    console.log('Autocomplete check:', { googleMapsLoaded, showForm, hasInput: !!addressInputRef.current });

    if (googleMapsLoaded && showForm && addressInputRef.current) {
      // Clear existing autocomplete if switching between add/edit
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }

      console.log('Initializing Google Maps Autocomplete...');

      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            componentRestrictions: { country: 'us' },
            fields: ['address_components', 'geometry', 'formatted_address', 'place_id']
          }
        );

        autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
        console.log('✓ Google Maps Autocomplete initialized successfully');
      } catch (error) {
        console.error('Failed to initialize autocomplete:', error);
        setError('Failed to initialize address autocomplete');
      }
    }

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [googleMapsLoaded, showForm]);

  const handlePlaceSelect = () => {
    console.log('Place changed event triggered');
    const place = autocompleteRef.current.getPlace();
    console.log('Selected place:', place);

    if (!place.address_components) {
      console.warn('No address components found');
      return;
    }

    let streetNumber = '';
    let route = '';
    let city = '';
    let state = '';
    let zipCode = '';
    let country = '';

    place.address_components.forEach(component => {
      const types = component.types;

      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        route = component.long_name;
      }
      if (types.includes('locality')) {
        city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.short_name;
      }
      if (types.includes('postal_code')) {
        zipCode = component.long_name;
      }
      if (types.includes('country')) {
        country = component.long_name;
      }
    });

    const addressLine1 = `${streetNumber} ${route}`.trim();

    console.log('Parsed address:', { addressLine1, city, state, zipCode, country });

    setFormData(prev => ({
      ...prev,
      addressLine1,
      city,
      state,
      zipCode,
      country: country || 'USA',
      latitude: place.geometry?.location?.lat(),
      longitude: place.geometry?.location?.lng(),
      placeId: place.place_id
    }));
  };

  const fetchAddresses = async () => {
    console.log('📍 Fetching addresses...');
    console.log('Token exists:', !!token);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/addresses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        console.log(`✅ Fetched ${data.data.length} addresses`);
        console.log('Addresses:', data.data);
        setAddresses(data.data);
      } else {
        console.error('❌ Fetch failed:', data.message);
        setError(data.message);
      }
    } catch (err) {
      console.error('❌ Failed to fetch addresses:', err);
      setError('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const url = editingId ? `/api/addresses/${editingId}` : '/api/addresses';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        console.log('✅ Address saved successfully!');
        setShowForm(false);
        setEditingId(null);
        resetForm();

        // Refresh addresses list
        await fetchAddresses();
        console.log('✅ Address list refreshed');

        // If came from checkout, redirect back to checkout
        if (fromCheckout) {
          navigate('/checkout');
        }
      } else {
        console.error('❌ Save failed:', data.message);
        setError(data.message || 'Failed to save address');
      }
    } catch (err) {
      console.error('❌ Failed to save address:', err);
      setError(`Failed to save address: ${err.message}`);
    }
  };

  const handleEdit = (address) => {
    setFormData({
      fullName: address.fullName,
      phoneNumber: address.phoneNumber,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      addressType: address.addressType,
      isDefault: address.isDefault
    });
    setEditingId(address.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;

    try {
      const response = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        await fetchAddresses();
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Failed to delete address:', err);
      setError('Failed to delete address');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const response = await fetch(`/api/addresses/${id}/default`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        await fetchAddresses();
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Failed to set default:', err);
      setError('Failed to set default address');
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      phoneNumber: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
      addressType: 'home',
      isDefault: false
    });
    setEditingId(null);
  };

  if (loading && addresses.length === 0) {
    return (
      <div className="container">
        <div className="loading-state">Loading addresses...</div>
      </div>
    );
  }

  return (
    <div className="container addresses-page">
      {fromCheckout && (
        <div className="checkout-from-cart-notice">
          <strong>📍 Checkout in Progress</strong>
          <span>Add or select a shipping address to continue with your order</span>
        </div>
      )}

      <div className="page-header">
        <h1>My Addresses</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancel' : 'Add New Address'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="address-form-container">
          <h2>{editingId ? 'Edit Address' : 'Add New Address'}</h2>
          <form onSubmit={handleSubmit} className="address-form">
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Address Line 1 *</label>
              <input
                ref={addressInputRef}
                type="text"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleInputChange}
                placeholder={googleMapsLoaded ? "Start typing your address..." : "Street address, P.O. box, company name"}
                required
              />
              {!googleMapsLoaded && <small style={{color: '#666', fontSize: '12px'}}>Loading Google Maps...</small>}
              {googleMapsLoaded && <small style={{color: '#007185', fontSize: '12px'}}>✓ Google autocomplete enabled - start typing</small>}
            </div>

            <div className="form-group">
              <label>Address Line 2</label>
              <input
                type="text"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleInputChange}
                placeholder="Apartment, suite, unit, building, floor, etc."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>State *</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="e.g., OH"
                  required
                />
              </div>

              <div className="form-group">
                <label>ZIP Code *</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Address Type</label>
                <select
                  name="addressType"
                  value={formData.addressType}
                  onChange={handleInputChange}
                >
                  <option value="home">Home</option>
                  <option value="work">Work</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                  />
                  Set as default address
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update Address' : 'Save Address'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {fromCheckout && addresses.length > 0 && !showForm && (
        <div style={{ marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/checkout')}
            style={{ padding: '14px 40px', fontSize: '16px' }}
          >
            ← Back to Checkout
          </button>
        </div>
      )}

      <div className="addresses-list">
        {addresses.length === 0 ? (
          <p>No addresses saved yet</p>
        ) : (
          addresses.map(address => (
            <div key={address.id} className={`address-card ${address.isDefault ? 'default' : ''}`}>
              {address.isDefault && <span className="default-badge">Default</span>}
              <div className="address-content">
                <h3>{address.fullName}</h3>
                <p>{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>{address.city}, {address.state} {address.zipCode}</p>
                <p>{address.country}</p>
                <p className="phone">Phone: {address.phoneNumber}</p>
                <span className="address-type">{address.addressType}</span>
              </div>
              <div className="address-actions">
                {!address.isDefault && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleSetDefault(address.id)}
                  >
                    Set as Default
                  </button>
                )}
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleEdit(address)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(address.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Addresses;
