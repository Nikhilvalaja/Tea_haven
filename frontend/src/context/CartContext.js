import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Toast from '../components/Toast';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Fetch cart when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      setCart(null);
    }
  }, [isAuthenticated]);

  const fetchCart = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cart', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setCart(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err);
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    if (!token) {
      setError('Please login to add items to cart');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId, quantity })
      });

      const data = await response.json();

      if (data.success) {
        setCart(data.data);
        setToast({ message: 'Item added to cart!', type: 'success' });
        return true;
      } else {
        setError(data.message);
        setToast({ message: data.message || 'Failed to add item', type: 'error' });
        return false;
      }
    } catch (err) {
      console.error('Failed to add to cart:', err);
      setError('Failed to add item to cart');
      setToast({ message: 'Failed to add item to cart', type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (itemId, quantity) => {
    if (!token) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      });

      const data = await response.json();

      if (data.success) {
        setCart(data.data);
        setToast({ message: 'Quantity updated!', type: 'success' });
        return true;
      } else {
        setError(data.message);
        setToast({ message: data.message || 'Failed to update cart', type: 'error' });
        return false;
      }
    } catch (err) {
      console.error('Failed to update cart:', err);
      setError('Failed to update cart');
      setToast({ message: 'Failed to update cart', type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId) => {
    if (!token) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setCart(data.data);
        console.log('Setting remove toast:', { message: 'Item removed from cart!', type: 'success' });
        setToast({ message: 'Item removed from cart!', type: 'success' });
        return true;
      } else {
        setError(data.message);
        setToast({ message: data.message || 'Failed to remove item', type: 'error' });
        return false;
      }
    } catch (err) {
      console.error('Failed to remove from cart:', err);
      setError('Failed to remove item');
      setToast({ message: 'Failed to remove item', type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    if (!token) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setCart({ cart: { items: [] }, subtotal: '0.00', totalItems: 0 });
        return true;
      } else {
        setError(data.message);
        return false;
      }
    } catch (err) {
      console.error('Failed to clear cart:', err);
      setError('Failed to clear cart');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getCartCount = () => {
    if (!cart || !cart.cart || !cart.cart.items) return 0;
    return cart.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getCartTotal = () => {
    if (!cart || !cart.subtotal) return '0.00';
    return cart.subtotal;
  };

  const value = {
    cart,
    loading,
    error,
    fetchCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    cartCount: getCartCount(),
    cartTotal: getCartTotal()
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </CartContext.Provider>
  );
};
