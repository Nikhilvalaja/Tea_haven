import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const UserManagement = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters - only show admin staff (not customers)
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('staff'); // 'staff' = all admins/managers
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [updating, setUpdating] = useState(false);

  // Add user form
  const [newUserForm, setNewUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'manager',
    permissions: {
      canManageProducts: true,
      canManageInventory: true,
      canViewReports: true,
      canManageOrders: true,
      canManageUsers: false,
      canAccessSettings: false
    }
  });

  // Permission definitions
  const permissionDefs = {
    canManageProducts: { label: 'Manage Products', description: 'Add, edit, delete products' },
    canManageInventory: { label: 'Manage Inventory', description: 'Update stock levels, view inventory' },
    canViewReports: { label: 'View Reports', description: 'Access sales and analytics reports' },
    canManageOrders: { label: 'Manage Orders', description: 'View and update order status' },
    canManageUsers: { label: 'Manage Users', description: 'Add, edit admin/manager accounts' },
    canAccessSettings: { label: 'Access Settings', description: 'Configure system settings' }
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 15,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter })
      });

      // Only fetch staff (admin roles), not customers
      if (roleFilter === 'staff') {
        params.append('role', 'manager');
        params.append('role', 'admin');
        params.append('role', 'super_admin');
      } else if (roleFilter) {
        params.append('role', roleFilter);
      }

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        // Filter to only show staff members (not customers)
        const staffUsers = data.users.filter(u => ['manager', 'admin', 'super_admin'].includes(u.role));
        setUsers(staffUsers);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, fetchUsers]);

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
    setError('');
    setSuccess('');
  };

  const openPermissionsModal = (user) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
    setError('');
    setSuccess('');
  };

  const handleRoleChange = async () => {
    if (!selectedUser || newRole === selectedUser.role) {
      setShowRoleModal(false);
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`${selectedUser.firstName} ${selectedUser.lastName} is now a ${formatRole(newRole)}`);
        setShowRoleModal(false);
        fetchUsers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to update role');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');

    try {
      const response = await fetch('/api/admin/users/create-staff', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUserForm)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`${newUserForm.firstName} ${newUserForm.lastName} has been added as ${formatRole(newUserForm.role)}`);
        setShowAddModal(false);
        setNewUserForm({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          role: 'manager',
          permissions: {
            canManageProducts: true,
            canManageInventory: true,
            canViewReports: true,
            canManageOrders: true,
            canManageUsers: false,
            canAccessSettings: false
          }
        });
        fetchUsers();
      } else {
        setError(data.message || 'Failed to create user');
      }
    } catch (err) {
      setError('Failed to create user');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusToggle = async (user) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !user.isActive })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`${user.firstName} ${user.lastName} has been ${user.isActive ? 'suspended' : 'activated'}`);
        fetchUsers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const formatRole = (role) => {
    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      manager: 'Manager',
      customer: 'Customer'
    };
    return labels[role] || role;
  };

  const getRoleBadgeClass = (role) => {
    const classes = {
      super_admin: 'role-super-admin',
      admin: 'role-admin',
      manager: 'role-manager',
      customer: 'role-customer'
    };
    return classes[role] || 'role-customer';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Never';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const canManageUser = (user) => {
    if (user.id === currentUser?.id) return false;
    if (currentUser?.role === 'super_admin') return true;
    if (currentUser?.role === 'admin') {
      return ['manager'].includes(user.role);
    }
    return false;
  };

  const getAvailableRoles = () => {
    if (currentUser?.role === 'super_admin') {
      return ['manager', 'admin', 'super_admin'];
    }
    if (currentUser?.role === 'admin') {
      return ['manager'];
    }
    return ['manager'];
  };

  const getRolePermissions = (role) => {
    switch (role) {
      case 'super_admin':
        return {
          canManageProducts: true,
          canManageInventory: true,
          canViewReports: true,
          canManageOrders: true,
          canManageUsers: true,
          canAccessSettings: true
        };
      case 'admin':
        return {
          canManageProducts: true,
          canManageInventory: true,
          canViewReports: true,
          canManageOrders: true,
          canManageUsers: true,
          canAccessSettings: false
        };
      case 'manager':
      default:
        return {
          canManageProducts: true,
          canManageInventory: true,
          canViewReports: true,
          canManageOrders: true,
          canManageUsers: false,
          canAccessSettings: false
        };
    }
  };

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Staff Management</h1>
          <p className="page-subtitle">Manage admins and managers who run your store</p>
        </div>
        {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Staff Member
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess('')}>x</button>
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>x</button>
        </div>
      )}

      {/* Role Overview Cards */}
      <div className="role-overview-cards">
        <div className="role-card super-admin">
          <div className="role-icon">S</div>
          <div className="role-info">
            <h4>Super Admin</h4>
            <p>Full system access, can manage everything including other super admins</p>
          </div>
          <span className="role-count">{users.filter(u => u.role === 'super_admin').length}</span>
        </div>
        <div className="role-card admin">
          <div className="role-icon">A</div>
          <div className="role-info">
            <h4>Admin</h4>
            <p>Can manage products, inventory, orders, and managers</p>
          </div>
          <span className="role-count">{users.filter(u => u.role === 'admin').length}</span>
        </div>
        <div className="role-card manager">
          <div className="role-icon">M</div>
          <div className="role-info">
            <h4>Manager</h4>
            <p>Can manage products, inventory, and view reports</p>
          </div>
          <span className="role-count">{users.filter(u => u.role === 'manager').length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            className="filter-select"
          >
            <option value="staff">All Staff</option>
            <option value="manager">Managers Only</option>
            <option value="admin">Admins Only</option>
            <option value="super_admin">Super Admins Only</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="loading-state">Loading staff members...</div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <h3>No staff members found</h3>
            <p>Add your first admin or manager to get started</p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              + Add Staff Member
            </button>
          </div>
        ) : (
          <table className="data-table users-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={!user.isActive ? 'suspended' : ''}>
                  <td>
                    <div className="user-info">
                      <div className={`user-avatar ${getRoleBadgeClass(user.role)}`}>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <div className="user-details">
                        <span className="user-name">
                          {user.firstName} {user.lastName}
                          {user.id === currentUser?.id && <span className="you-badge">(You)</span>}
                        </span>
                        <span className="user-email">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                      {formatRole(user.role)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                      {user.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt || user.created_at)}</td>
                  <td>{formatDate(user.lastLoginAt)}</td>
                  <td>
                    {canManageUser(user) ? (
                      <div className="action-buttons">
                        <button
                          className="btn-sm btn-primary"
                          onClick={() => openRoleModal(user)}
                          title="Change Role"
                        >
                          Role
                        </button>
                        <button
                          className="btn-sm btn-secondary"
                          onClick={() => openPermissionsModal(user)}
                          title="View Permissions"
                        >
                          Perms
                        </button>
                        <button
                          className={`btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'}`}
                          onClick={() => handleStatusToggle(user)}
                          title={user.isActive ? 'Suspend' : 'Activate'}
                        >
                          {user.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    ) : (
                      <span className="no-actions">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Staff Member</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>x</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-section">
                    <h3>Personal Information</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>First Name *</label>
                        <input
                          type="text"
                          value={newUserForm.firstName}
                          onChange={(e) => setNewUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                          required
                          className="form-input"
                          placeholder="John"
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name *</label>
                        <input
                          type="text"
                          value={newUserForm.lastName}
                          onChange={(e) => setNewUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                          required
                          className="form-input"
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Email Address *</label>
                      <input
                        type="email"
                        value={newUserForm.email}
                        onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                        className="form-input"
                        placeholder="john@teahaven.com"
                      />
                    </div>
                    <div className="form-group">
                      <label>Temporary Password *</label>
                      <input
                        type="password"
                        value={newUserForm.password}
                        onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                        minLength="6"
                        className="form-input"
                        placeholder="Min 6 characters"
                      />
                      <p className="form-hint">User should change this after first login</p>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Role & Permissions</h3>
                    <div className="form-group">
                      <label>Role *</label>
                      <div className="role-selector-cards">
                        {getAvailableRoles().map((role) => (
                          <label
                            key={role}
                            className={`role-card-option ${newUserForm.role === role ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name="role"
                              value={role}
                              checked={newUserForm.role === role}
                              onChange={(e) => setNewUserForm(prev => ({
                                ...prev,
                                role: e.target.value,
                                permissions: getRolePermissions(e.target.value)
                              }))}
                            />
                            <div className={`role-icon ${getRoleBadgeClass(role)}`}>
                              {role === 'super_admin' ? 'S' : role === 'admin' ? 'A' : 'M'}
                            </div>
                            <div className="role-details">
                              <strong>{formatRole(role)}</strong>
                              <span>
                                {role === 'super_admin' && 'Full access to everything'}
                                {role === 'admin' && 'Manage users, inventory, orders'}
                                {role === 'manager' && 'Manage inventory and view reports'}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="permissions-preview">
                      <h4>Permissions for {formatRole(newUserForm.role)}</h4>
                      <div className="permissions-list">
                        {Object.entries(permissionDefs).map(([key, def]) => (
                          <div key={key} className={`permission-item ${newUserForm.permissions[key] ? 'enabled' : 'disabled'}`}>
                            <span className="permission-status">
                              {newUserForm.permissions[key] ? 'Y' : 'N'}
                            </span>
                            <div className="permission-info">
                              <strong>{def.label}</strong>
                              <span>{def.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? 'Creating...' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change User Role</h2>
              <button className="modal-close" onClick={() => setShowRoleModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="user-preview">
                <div className={`user-avatar large ${getRoleBadgeClass(selectedUser.role)}`}>
                  {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                </div>
                <div>
                  <h3>{selectedUser.firstName} {selectedUser.lastName}</h3>
                  <p>{selectedUser.email}</p>
                  <p>Current role: <strong>{formatRole(selectedUser.role)}</strong></p>
                </div>
              </div>

              <div className="role-selector">
                <label>Select New Role:</label>
                <div className="role-options">
                  {getAvailableRoles().map((role) => (
                    <label
                      key={role}
                      className={`role-option ${newRole === role ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={newRole === role}
                        onChange={(e) => setNewRole(e.target.value)}
                      />
                      <span className={`role-badge ${getRoleBadgeClass(role)}`}>
                        {formatRole(role)}
                      </span>
                      <span className="role-description">
                        {role === 'super_admin' && 'Full access to everything'}
                        {role === 'admin' && 'Manage users, inventory, orders'}
                        {role === 'manager' && 'Manage inventory and view reports'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {newRole !== selectedUser.role && (
                <div className="warning-box">
                  This will change {selectedUser.firstName}'s role from{' '}
                  <strong>{formatRole(selectedUser.role)}</strong> to{' '}
                  <strong>{formatRole(newRole)}</strong>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleRoleChange}
                disabled={updating || newRole === selectedUser.role}
              >
                {updating ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions View Modal */}
      {showPermissionsModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPermissionsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Permissions</h2>
              <button className="modal-close" onClick={() => setShowPermissionsModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="user-preview">
                <div className={`user-avatar large ${getRoleBadgeClass(selectedUser.role)}`}>
                  {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                </div>
                <div>
                  <h3>{selectedUser.firstName} {selectedUser.lastName}</h3>
                  <p className={`role-badge ${getRoleBadgeClass(selectedUser.role)}`}>
                    {formatRole(selectedUser.role)}
                  </p>
                </div>
              </div>

              <div className="permissions-grid">
                {Object.entries(permissionDefs).map(([key, def]) => {
                  const hasPermission = getRolePermissions(selectedUser.role)[key];
                  return (
                    <div key={key} className={`permission-card ${hasPermission ? 'enabled' : 'disabled'}`}>
                      <div className="permission-status-icon">
                        {hasPermission ? 'Y' : 'N'}
                      </div>
                      <div className="permission-content">
                        <strong>{def.label}</strong>
                        <p>{def.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="permissions-note">
                Permissions are based on the user's role. Change their role to modify permissions.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPermissionsModal(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => {
                setShowPermissionsModal(false);
                openRoleModal(selectedUser);
              }}>
                Change Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
