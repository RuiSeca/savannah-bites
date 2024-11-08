import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

const CartContext = createContext();

const CART_STORAGE_KEY = "savannah_bites_cart";
const CART_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error("Error loading cart from storage:", error);
      return [];
    }
  });

  const [lastUpdated, setLastUpdated] = useState(Date.now());

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      setLastUpdated(Date.now());
    } catch (error) {
      console.error("Error saving cart to storage:", error);
    }
  }, [cart]);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const checkCartTimeout = () => {
      if (Date.now() - lastUpdated > CART_TIMEOUT) {
        clearCart();
      }
    };

    const interval = setInterval(checkCartTimeout, 1000 * 60);
    return () => clearInterval(interval);
  }, [lastUpdated, clearCart]);

  // Generate a unique key for each item based on id and size
  const getItemKey = useCallback(
    (id, size) => `${id}-${size || "default"}`,
    []
  );

  const addToCart = useCallback(
    (item) => {
      setCart((currentCart) => {
        const itemKey = getItemKey(item.id, item.size);

        const existingItemIndex = currentCart.findIndex(
          (cartItem) => getItemKey(cartItem.id, cartItem.size) === itemKey
        );

        if (existingItemIndex !== -1) {
          return currentCart.map((cartItem, index) =>
            index === existingItemIndex
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          );
        }

        return [
          ...currentCart,
          {
            ...item,
            quantity: 1,
            cartItemId: itemKey, // Add a unique identifier
            addedAt: new Date().toISOString(),
          },
        ];
      });
    },
    [getItemKey]
  );

  const removeFromCart = useCallback(
    (itemId, size = null) => {
      setCart((currentCart) => {
        const itemKey = getItemKey(itemId, size);
        return currentCart.filter(
          (item) => getItemKey(item.id, item.size) !== itemKey
        );
      });
    },
    [getItemKey]
  );

  const updateQuantity = useCallback(
    (itemId, newQuantity, size = null) => {
      if (newQuantity < 1) {
        removeFromCart(itemId, size);
        return;
      }

      setCart((currentCart) => {
        const itemKey = getItemKey(itemId, size);
        return currentCart.map((item) =>
          getItemKey(item.id, item.size) === itemKey
            ? { ...item, quantity: newQuantity }
            : item
        );
      });
    },
    [removeFromCart, getItemKey]
  );

  const getItemPrice = useCallback((item) => {
    if (typeof item.price === "object") {
      return (
        item.selectedPrice ||
        item.price[item.size] ||
        Object.values(item.price)[0]
      );
    }
    return item.price;
  }, []);

  const cartTotal = useCallback(() => {
    return cart.reduce((total, item) => {
      const price = getItemPrice(item);
      return total + price * item.quantity;
    }, 0);
  }, [cart, getItemPrice]);

  const cartItemsCount = useCallback(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  const isItemInCart = useCallback(
    (itemId, size = null) => {
      const itemKey = getItemKey(itemId, size);
      return cart.some((item) => getItemKey(item.id, item.size) === itemKey);
    },
    [cart, getItemKey]
  );

  const updateItemNote = useCallback(
    (itemId, note, size = null) => {
      setCart((currentCart) => {
        const itemKey = getItemKey(itemId, size);
        return currentCart.map((item) =>
          getItemKey(item.id, item.size) === itemKey ? { ...item, note } : item
        );
      });
    },
    [getItemKey]
  );

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
    getItemPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
