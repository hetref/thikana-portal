"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, onValue, set, get } from 'firebase/database';
import { database } from '@/lib/firebase';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from Firebase when component mounts
  useEffect(() => {
    const cartRef = ref(database, 'carts');
    const unsubscribe = onValue(cartRef, (snapshot) => {
      const cartData = snapshot.val() || {};
      setCart(cartData);
    });

    return () => unsubscribe();
  }, []);

  const addToCart = async (product, quantity, businessId) => {
    try {
      const cartRef = ref(database, 'carts');
      const snapshot = await get(cartRef);
      const currentCart = snapshot.val() || {};

      // Initialize business cart if it doesn't exist
      if (!currentCart[businessId]) {
        currentCart[businessId] = {
          businessId,
          businessName: product.businessName,
          products: {}
        };
      }

      // Add or update product in cart
      if (!currentCart[businessId].products[product.id]) {
        currentCart[businessId].products[product.id] = {
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          quantity: quantity
        };
      } else {
        currentCart[businessId].products[product.id].quantity += quantity;
      }

      await set(cartRef, currentCart);
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const removeFromCart = async (businessId, productId) => {
    try {
      const cartRef = ref(database, 'carts');
      const snapshot = await get(cartRef);
      const currentCart = snapshot.val() || {};

      if (currentCart[businessId]?.products[productId]) {
        delete currentCart[businessId].products[productId];
        
        // Remove business entry if no products left
        if (Object.keys(currentCart[businessId].products).length === 0) {
          delete currentCart[businessId];
        }

        await set(cartRef, currentCart);
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  };

  const updateQuantity = async (businessId, productId, quantity) => {
    try {
      const cartRef = ref(database, 'carts');
      const snapshot = await get(cartRef);
      const currentCart = snapshot.val() || {};

      if (currentCart[businessId]?.products[productId]) {
        currentCart[businessId].products[productId].quantity = quantity;
        await set(cartRef, currentCart);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  };

  const getCartTotal = (businessId) => {
    if (!cart[businessId]) return 0;
    return Object.values(cart[businessId].products).reduce(
      (total, product) => total + (product.price * product.quantity),
      0
    );
  };

  const getCartTotalItems = () => {
    return Object.values(cart).reduce(
      (total, business) =>
        total +
        Object.values(business.products).reduce(
          (businessTotal, product) => businessTotal + product.quantity,
          0
        ),
      0
    );
  };

  const value = {
    cart,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    getCartTotalItems
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 