import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './components/AdminLayout';

// Customer Pages
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Addresses from './pages/Addresses';
import Orders from './pages/Orders';
import OrderSuccess from './pages/OrderSuccess';
import RefundRequest from './pages/RefundRequest';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import InventoryDashboard from './pages/admin/InventoryDashboard';
import AdminProfile from './pages/admin/AdminProfile';
import UserManagement from './pages/admin/UserManagement';
import OrdersManagement from './pages/admin/OrdersManagement';
import ReportsPage from './pages/admin/ReportsPage';
import ProductManagement from './pages/admin/ProductManagement';
import AdminProductDetail from './pages/admin/ProductDetail';

import './App.css';
import './ModernStyles.css';
import './AdminStyles.css';

// Customer Layout Component
const CustomerLayout = ({ children }) => (
  <div className="app">
    <Navbar />
    <main className="main-content">
      {children}
    </main>
    <Footer />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Customer Routes - with Navbar and Footer */}
              <Route path="/" element={<CustomerLayout><Home /></CustomerLayout>} />
              <Route path="/products" element={<CustomerLayout><Products /></CustomerLayout>} />
              <Route path="/products/:id" element={<CustomerLayout><ProductDetail /></CustomerLayout>} />
              <Route path="/login" element={<CustomerLayout><Login /></CustomerLayout>} />
              <Route path="/register" element={<CustomerLayout><Register /></CustomerLayout>} />

              <Route path="/profile" element={
                <CustomerLayout>
                  <ProtectedRoute><Profile /></ProtectedRoute>
                </CustomerLayout>
              } />

              <Route path="/cart" element={
                <CustomerLayout>
                  <ProtectedRoute><Cart /></ProtectedRoute>
                </CustomerLayout>
              } />

              <Route path="/addresses" element={
                <CustomerLayout>
                  <ProtectedRoute><Addresses /></ProtectedRoute>
                </CustomerLayout>
              } />

              <Route path="/checkout" element={
                <CustomerLayout>
                  <ProtectedRoute><Checkout /></ProtectedRoute>
                </CustomerLayout>
              } />

              <Route path="/orders" element={
                <CustomerLayout>
                  <ProtectedRoute><Orders /></ProtectedRoute>
                </CustomerLayout>
              } />

              <Route path="/orders/:orderId/refund" element={
                <CustomerLayout>
                  <ProtectedRoute><RefundRequest /></ProtectedRoute>
                </CustomerLayout>
              } />

              <Route path="/order-success" element={
                <CustomerLayout>
                  <ProtectedRoute><OrderSuccess /></ProtectedRoute>
                </CustomerLayout>
              } />

              {/* Admin Login - Separate page */}
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Admin Routes - Separate Layout with Sidebar */}
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="inventory" element={<InventoryDashboard />} />
                <Route path="products" element={<ProductManagement />} />
                <Route path="products/:id" element={<AdminProductDetail />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="orders" element={<OrdersManagement />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<div className="admin-card"><h2>Settings</h2><p>Coming soon...</p></div>} />
              </Route>

              {/* 404 */}
              <Route path="*" element={
                <CustomerLayout>
                  <div className="not-found-page">
                    <h1>404</h1>
                    <p>Page not found</p>
                  </div>
                </CustomerLayout>
              } />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
