import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const OrdersManagement = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const res = await fetch(`/api/orders/admin/by-date?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
        setPagination(data.pagination || { total: 0, page: 1, totalPages: 1 });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching order stats:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [fetchOrders, fetchStats]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleStatusUpdate = async (orderId, newStatus, trackingNumber = '') => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/orders/admin/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, trackingNumber })
      });

      if (res.ok) {
        fetchOrders();
        fetchStats();
        setShowStatusModal(false);
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      confirmed: '#17a2b8',
      processing: '#6f42c1',
      shipped: '#007bff',
      delivered: '#28a745',
      cancelled: '#dc3545',
      refunded: '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  return (
    <div className="admin-orders-management">
      {/* Stats Overview */}
      {stats && (
        <div className="orders-stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.totalOrders}</span>
            <span className="stat-label">Total Orders</span>
          </div>
          <div className="stat-card pending">
            <span className="stat-value">{stats.pendingOrders}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card processing">
            <span className="stat-value">{stats.processingOrders || 0}</span>
            <span className="stat-label">Processing</span>
          </div>
          <div className="stat-card shipped">
            <span className="stat-value">{stats.shippedOrders}</span>
            <span className="stat-label">Shipped</span>
          </div>
          <div className="stat-card delivered">
            <span className="stat-value">{stats.deliveredOrders}</span>
            <span className="stat-label">Delivered</span>
          </div>
          <div className="stat-card revenue">
            <span className="stat-value">{formatCurrency(stats.totalRevenue)}</span>
            <span className="stat-label">Total Revenue</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="orders-filters admin-card">
        <h3>Filter Orders</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-group">
            <label>Per Page</label>
            <select name="limit" value={filters.limit} onChange={handleFilterChange}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-table-container admin-card">
        <div className="table-header">
          <h3>Orders ({pagination.total})</h3>
        </div>

        {loading ? (
          <div className="loading-state">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <span>No orders found</span>
          </div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td className="order-number">
                    <strong>{order.orderNumber}</strong>
                  </td>
                  <td className="customer-info">
                    <div className="customer-name">
                      {order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest'}
                    </div>
                    <div className="customer-email">{order.user?.email}</div>
                  </td>
                  <td className="items-count">
                    {order.items?.length || 0} items
                  </td>
                  <td className="order-total">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <span className={`payment-status ${order.paymentStatus}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="order-date">
                    {formatDate(order.created_at || order.createdAt)}
                  </td>
                  <td className="actions">
                    <button
                      className="btn-view"
                      onClick={() => setSelectedOrder(order)}
                    >
                      View
                    </button>
                    <button
                      className="btn-update"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowStatusModal(true);
                      }}
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              disabled={filters.page === 1}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </button>
            <span>Page {filters.page} of {pagination.totalPages}</span>
            <button
              disabled={filters.page >= pagination.totalPages}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && !showStatusModal && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content order-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Order #{selectedOrder.orderNumber}</h3>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="order-detail-section">
                <h4>Customer Information</h4>
                <p><strong>Name:</strong> {selectedOrder.user ? `${selectedOrder.user.firstName} ${selectedOrder.user.lastName}` : 'Guest'}</p>
                <p><strong>Email:</strong> {selectedOrder.user?.email}</p>
              </div>

              <div className="order-detail-section">
                <h4>Shipping Address</h4>
                {selectedOrder.address && (
                  <>
                    <p>{selectedOrder.address.addressLine1}</p>
                    {selectedOrder.address.addressLine2 && <p>{selectedOrder.address.addressLine2}</p>}
                    <p>{selectedOrder.address.city}, {selectedOrder.address.state} {selectedOrder.address.postalCode}</p>
                  </>
                )}
              </div>

              <div className="order-detail-section">
                <h4>Order Items</h4>
                <div className="items-list">
                  {selectedOrder.items?.map(item => (
                    <div key={item.id} className="order-item">
                      <span className="item-name">{item.productName || item.product?.name}</span>
                      <span className="item-sku">SKU: {item.productSku || item.product?.sku}</span>
                      <span className="item-qty">Qty: {item.quantity}</span>
                      <span className="item-price">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-detail-section totals">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="total-row">
                  <span>Shipping:</span>
                  <span>{formatCurrency(selectedOrder.shippingCost)}</span>
                </div>
                <div className="total-row">
                  <span>Tax:</span>
                  <span>{formatCurrency(selectedOrder.taxAmount)}</span>
                </div>
                <div className="total-row grand-total">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>

              <div className="order-detail-section">
                <h4>Order Status</h4>
                <p><strong>Status:</strong> <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedOrder.status) }}>{selectedOrder.status}</span></p>
                <p><strong>Payment:</strong> {selectedOrder.paymentStatus}</p>
                {selectedOrder.trackingNumber && (
                  <p><strong>Tracking:</strong> {selectedOrder.trackingNumber}</p>
                )}
                <p><strong>Created:</strong> {formatDate(selectedOrder.created_at || selectedOrder.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => { setShowStatusModal(false); setSelectedOrder(null); }}>
          <div className="modal-content status-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Order Status</h3>
              <button className="close-btn" onClick={() => { setShowStatusModal(false); setSelectedOrder(null); }}>×</button>
            </div>
            <div className="modal-body">
              <p>Order: <strong>#{selectedOrder.orderNumber}</strong></p>
              <p>Current Status: <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedOrder.status) }}>{selectedOrder.status}</span></p>

              <div className="status-actions">
                {selectedOrder.status === 'pending' && (
                  <>
                    <button
                      className="status-btn confirm"
                      onClick={() => handleStatusUpdate(selectedOrder.id, 'confirmed')}
                      disabled={updating}
                    >
                      Confirm Order
                    </button>
                    <button
                      className="status-btn cancel"
                      onClick={() => handleStatusUpdate(selectedOrder.id, 'cancelled')}
                      disabled={updating}
                    >
                      Cancel Order
                    </button>
                  </>
                )}
                {selectedOrder.status === 'confirmed' && (
                  <button
                    className="status-btn process"
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'processing')}
                    disabled={updating}
                  >
                    Start Processing
                  </button>
                )}
                {(selectedOrder.status === 'processing' || selectedOrder.status === 'confirmed') && (
                  <button
                    className="status-btn ship"
                    onClick={() => {
                      const tracking = prompt('Enter tracking number (optional):');
                      handleStatusUpdate(selectedOrder.id, 'shipped', tracking || '');
                    }}
                    disabled={updating}
                  >
                    Mark as Shipped
                  </button>
                )}
                {selectedOrder.status === 'shipped' && (
                  <button
                    className="status-btn deliver"
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'delivered')}
                    disabled={updating}
                  >
                    Mark as Delivered
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersManagement;
