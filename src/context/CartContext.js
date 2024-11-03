import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CartContext = createContext();

const CART_STORAGE_KEY = 'savannah_bites_cart';
const CART_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    // Initialize cart from localStorage if available
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      return [];
    }
  });

  const [lastUpdated, setLastUpdated] = useState(Date.now());

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      setLastUpdated(Date.now());
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }, [cart]);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  // Check cart timeout
  useEffect(() => {
    const checkCartTimeout = () => {
      if (Date.now() - lastUpdated > CART_TIMEOUT) {
        clearCart();
      }
    };

    const interval = setInterval(checkCartTimeout, 1000 * 60); // Check every minute
    return () => clearInterval(interval);
  }, [lastUpdated, clearCart]);

  const addToCart = useCallback((item) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        cartItem => cartItem.id === item.id && cartItem.size === item.size
      );

      if (existingItem) {
        return currentCart.map((cartItem) =>
          cartItem.id === item.id && cartItem.size === item.size
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      return [...currentCart, { 
        ...item, 
        quantity: 1,
        addedAt: new Date().toISOString()
      }];
    });
  }, []);

  const removeFromCart = useCallback((itemId, size = null) => {
    setCart((currentCart) => 
      currentCart.filter((item) => 
        !(item.id === itemId && (size === null || item.size === size))
      )
    );
  }, []);

  const updateQuantity = useCallback((itemId, newQuantity, size = null) => {
    if (newQuantity < 1) {
      removeFromCart(itemId, size);
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === itemId && (size === null || item.size === size)
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  }, [removeFromCart]);

  const getItemPrice = useCallback((item) => {
    if (typeof item.price === 'object') {
      return item.selectedPrice || item.price[item.size] || Object.values(item.price)[0];
    }
    return item.price;
  }, []);

  const cartTotal = useCallback(() => {
    return cart.reduce((total, item) => {
      const price = getItemPrice(item);
      return total + (price * item.quantity);
    }, 0);
  }, [cart, getItemPrice]);

  const cartItemsCount = useCallback(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  const isItemInCart = useCallback((itemId, size = null) => {
    return cart.some(item => 
      item.id === itemId && (size === null || item.size === size)
    );
  }, [cart]);

  const updateItemNote = useCallback((itemId, note, size = null) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === itemId && (size === null || item.size === size)
          ? { ...item, note }
          : item
      )
    );
  }, []);

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartItemsCount,
    isItemInCart,
    updateItemNote,
    getItemPrice
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}