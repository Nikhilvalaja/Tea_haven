import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const AdminProfile = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAdminProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/my-profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setProfileData(data);
      } else {
        setError(data.message || 'Failed to load admin profile');
      }
    } catch (err) {
      setError('Failed to load admin profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDateTime(dateString);
  };

  const getActionTypeLabel = (actionType) => {
    const labels = {
      user_create: 'Created User',
      user_update: 'Updated User',
      user_delete: 'Deleted User',
      user_role_change: 'Changed Role',
      user_suspend: 'Suspended User',
      user_activate: 'Activated User',
      inventory_add: 'Added Stock',
      inventory_adjust: 'Adjusted Inventory',
      inventory_damage: 'Reported Damage',
      inventory_transfer: 'Transferred Stock',
      product_create: 'Created Product',
      product_update: 'Updated Product',
      product_delete: 'Deleted Product',
      product_price_change: 'Changed Price',
      order_status_change: 'Changed Order Status',
      order_cancel: 'Cancelled Order',
      refund_approve: 'Approved Refund',
      refund_reject: 'Rejected Refund',
      settings_update: 'Updated Settings',
      admin_login: 'Logged In',
      admin_logout: 'Logged Out'
    };
    return labels[actionType] || actionType;
  };

  const getActionTypeColor = (actionType) => {
    if (actionType.includes('delete') || actionType.includes('suspend') || actionType.includes('cancel') || actionType.includes('reject')) {
      return 'action-danger';
    }
    if (actionType.includes('create') || actionType.includes('add') || actionType.includes('activate') || actionType.includes('approve')) {
      return 'action-success';
    }
    if (actionType.includes('login') || actionType.includes('logout')) {
      return 'action-info';
    }
    return 'action-warning';
  };

  const getRoleBadge = (role) => {
    const roleClasses = {
      super_admin: 'role-super-admin',
      admin: 'role-admin',
      manager: 'role-manager',
      customer: 'role-customer'
    };
    const roleLabels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      manager: 'Manager',
      customer: 'Customer'
    };
    return (
      <span className={`role-badge ${roleClasses[role] || 'role-customer'}`}>
        {roleLabels[role] || role}
      </span>
    );
  };

  const getSessionStatusBadge = (status) => {
    const statusClasses = {
      active: 'status-active',
      expired: 'status-expired',
      logged_out: 'status-logged-out',
      invalidated: 'status-invalidated'
    };
    return (
      <span className={`session-status ${statusClasses[status] || ''}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="admin-profile-page">
        <div className="container">
          <div className="loading-spinner">Loading admin profile...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-profile-page">
        <div className="container">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  const { admin, promotedBy, stats, recentActivity, sessionHistory } = profileData;

  return (
    <div className="admin-profile-page">
      <div className="container">
        <div className="admin-profile-header">
          <div className="admin-avatar">
            <span className="avatar-initials">
              {admin.firstName?.[0]}{admin.lastName?.[0]}
            </span>
          </div>
          <div className="admin-info">
            <h1>{admin.firstName} {admin.lastName}</h1>
            <p className="admin-email">{admin.email}</p>
            {getRoleBadge(admin.role)}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="admin-stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{stats.totalActions}</h3>
              <p>Total Actions</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <h3>{stats.todayActions}</h3>
              <p>Actions Today</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔐</div>
            <div className="stat-content">
              <h3>{admin.loginCount || 0}</h3>
              <p>Total Logins</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🕒</div>
            <div className="stat-content">
              <h3>{formatRelativeTime(admin.lastLoginAt)}</h3>
              <p>Last Login</p>
            </div>
          </div>
        </div>

        {/* Admin Details */}
        <div className="admin-details-section">
          <h2>Account Information</h2>
          <div className="details-grid">
            <div className="detail-item">
              <label>Member Since</label>
              <span>{formatDateTime(admin.createdAt || admin.created_at)}</span>
            </div>
            <div className="detail-item">
              <label>Last Login</label>
              <span>{formatDateTime(admin.lastLoginAt)}</span>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <span>{admin.phone || 'Not set'}</span>
            </div>
            <div className="detail-item">
              <label>Account Status</label>
              <span className={admin.isActive ? 'status-active' : 'status-inactive'}>
                {admin.isActive ? 'Active' : 'Suspended'}
              </span>
            </div>
            {promotedBy && (
              <div className="detail-item">
                <label>Promoted By</label>
                <span>{promotedBy.firstName} {promotedBy.lastName}</span>
              </div>
            )}
            {admin.promotedAt && (
              <div className="detail-item">
                <label>Promoted On</label>
                <span>{formatDateTime(admin.promotedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Recent Activity
          </button>
          <button
            className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            Session History
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="activity-log">
              <h3>Your Recent Actions</h3>
              {recentActivity.length === 0 ? (
                <p className="no-data">No recent activity</p>
              ) : (
                <div className="activity-list">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <div className={`activity-type ${getActionTypeColor(activity.actionType)}`}>
                        {getActionTypeLabel(activity.actionType)}
                      </div>
                      <div className="activity-description">
                        {activity.description}
                      </div>
                      <div className="activity-meta">
                        <span className="activity-time">
                          {formatRelativeTime(activity.createdAt)}
                        </span>
                        {activity.ipAddress && (
                          <span className="activity-ip">
                            IP: {activity.ipAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="session-history">
              <h3>Login History</h3>
              {sessionHistory.length === 0 ? (
                <p className="no-data">No session history</p>
              ) : (
                <div className="session-list">
                  {sessionHistory.map((session) => (
                    <div key={session.id} className="session-item">
                      <div className="session-device">
                        <span className="device-icon">
                          {session.deviceType === 'mobile' ? '📱' :
                           session.deviceType === 'tablet' ? '📱' : '💻'}
                        </span>
                        <span className="device-type">{session.deviceType || 'Unknown'}</span>
                      </div>
                      <div className="session-details">
                        <div className="session-time">
                          <strong>Login:</strong> {formatDateTime(session.loginAt)}
                        </div>
                        {session.logoutAt && (
                          <div className="session-time">
                            <strong>Logout:</strong> {formatDateTime(session.logoutAt)}
                          </div>
                        )}
                        {session.ipAddress && (
                          <div className="session-ip">
                            <strong>IP:</strong> {session.ipAddress}
                          </div>
                        )}
                      </div>
                      <div className="session-status-wrapper">
                        {getSessionStatusBadge(session.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
