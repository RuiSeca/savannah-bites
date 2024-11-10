// src/context/CartContext.js

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { isWithinTimeRestrictions } from "../utils/mealDeals"; // Removed MEAL_DEALS import

const CartContext = createContext();

const CART_STORAGE_KEY = "savannah_bites_cart";
const DEALS_STORAGE_KEY = "savannah_bites_deals";
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

  const [activeDeal, setActiveDeal] = useState(() => {
    try {
      const savedDeal = localStorage.getItem(DEALS_STORAGE_KEY);
      if (!savedDeal) return null;

      const deal = JSON.parse(savedDeal);
      if (
        deal &&
        deal.timeRestrictions &&
        !isWithinTimeRestrictions(deal.timeRestrictions)
      ) {
        localStorage.removeItem(DEALS_STORAGE_KEY);
        return null;
      }
      return deal;
    } catch (error) {
      console.error("Error loading deal from storage:", error);
      return null;
    }
  });

  const [lastUpdated, setLastUpdated] = useState(() => {
    const savedTimestamp = localStorage.getItem("cart_last_updated");
    return savedTimestamp ? parseInt(savedTimestamp, 10) : Date.now();
  });

  const clearCart = useCallback(() => {
    setCart([]);
    setActiveDeal(null);
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(DEALS_STORAGE_KEY);
    localStorage.removeItem("cart_last_updated");
    setLastUpdated(Date.now());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      if (activeDeal) {
        localStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(activeDeal));
      } else {
        localStorage.removeItem(DEALS_STORAGE_KEY);
      }
      setLastUpdated(Date.now());
      localStorage.setItem("cart_last_updated", Date.now().toString());
    } catch (error) {
      console.error("Error saving cart/deals to storage:", error);
    }
  }, [cart, activeDeal]);

  // Cart timeout effect - with clearCart dependency
  useEffect(() => {
    const checkTimeout = () => {
      const now = Date.now();
      if (cart.length > 0 && now - lastUpdated > CART_TIMEOUT) {
        console.log("Cart timeout - clearing cart");
        clearCart();
      }
    };

    const timeoutInterval = setInterval(checkTimeout, 60000);
    return () => clearInterval(timeoutInterval);
  }, [lastUpdated, cart.length, clearCart]); // Added clearCart to dependencies

  const getItemKey = useCallback(
    (id, size) => `${id}-${size || "default"}`,
    []
  );

  const getItemPrice = useCallback((item) => {
    if (!item) return 0;
    if (typeof item.price === "object") {
      return (
        item.selectedPrice ||
        item.price[item.size] ||
        Object.values(item.price)[0]
      );
    }
    return item.price;
  }, []);

  const checkDealRequirements = useCallback((deal, cartItems) => {
    if (!deal || !cartItems) return false;

    const itemsByCategory = cartItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    return Object.entries(deal.requirements).every(
      ([category, requirement]) => {
        const categoryItems = itemsByCategory[category] || [];
        const validItems = categoryItems.filter(
          (item) => requirement.size === "any" || item.size === requirement.size
        );
        const totalCount = validItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        return totalCount >= requirement.count;
      }
    );
  }, []);

  const startDeal = useCallback((deal) => {
    if (!deal) return;
    if (
      deal.timeRestrictions &&
      !isWithinTimeRestrictions(deal.timeRestrictions)
    ) {
      console.log("Deal is not available at this time");
      return;
    }
    setActiveDeal({ ...deal, startedAt: new Date().toISOString() });
  }, []);

  const cancelDeal = useCallback(() => {
    setActiveDeal(null);
    localStorage.removeItem(DEALS_STORAGE_KEY);
  }, []);

  const addToCart = useCallback(
    (item) => {
      if (!item) return;

      setCart((currentCart) => {
        const itemKey = getItemKey(item.id, item.size);
        const existingItemIndex = currentCart.findIndex(
          (cartItem) => getItemKey(cartItem.id, cartItem.size) === itemKey
        );

        let updatedCart;
        if (existingItemIndex !== -1) {
          updatedCart = currentCart.map((cartItem, index) =>
            index === existingItemIndex
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          );
        } else {
          updatedCart = [
            ...currentCart,
            {
              ...item,
              quantity: 1,
              cartItemId: itemKey,
              addedAt: new Date().toISOString(),
            },
          ];
        }

        return updatedCart;
      });
    },
    [getItemKey]
  );

  const removeFromCart = useCallback(
    (itemId, size = null) => {
      setCart((currentCart) => {
        const itemKey = getItemKey(itemId, size);
        const updatedCart = currentCart.filter(
          (item) => getItemKey(item.id, item.size) !== itemKey
        );

        if (activeDeal && !checkDealRequirements(activeDeal, updatedCart)) {
          cancelDeal();
        }

        return updatedCart;
      });
    },
    [getItemKey, activeDeal, checkDealRequirements, cancelDeal]
  );

  const updateQuantity = useCallback(
    (itemId, newQuantity, size = null) => {
      if (newQuantity < 1) {
        removeFromCart(itemId, size);
        return;
      }

      setCart((currentCart) => {
        const itemKey = getItemKey(itemId, size);
        const updatedCart = currentCart.map((item) =>
          getItemKey(item.id, item.size) === itemKey
            ? { ...item, quantity: newQuantity }
            : item
        );

        if (activeDeal && !checkDealRequirements(activeDeal, updatedCart)) {
          cancelDeal();
        }

        return updatedCart;
      });
    },
    [getItemKey, removeFromCart, activeDeal, checkDealRequirements, cancelDeal]
  );

  const cartTotal = useCallback(() => {
    if (activeDeal && checkDealRequirements(activeDeal, cart)) {
      return activeDeal.price;
    }

    return cart.reduce((total, item) => {
      const price = getItemPrice(item);
      return total + price * item.quantity;
    }, 0);
  }, [cart, activeDeal, checkDealRequirements, getItemPrice]);

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

  const value = useMemo(
    () => ({
      cart,
      activeDeal,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartItemsCount,
      isItemInCart,
      updateItemNote,
      startDeal,
      cancelDeal,
      checkDealRequirements,
      getItemPrice,
    }),
    [
      cart,
      activeDeal,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartItemsCount,
      isItemInCart,
      updateItemNote,
      startDeal,
      cancelDeal,
      checkDealRequirements,
      getItemPrice,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
