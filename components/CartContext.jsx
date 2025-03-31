"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ref, onValue, set, get, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import toast from 'react-hot-toast';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from Firebase when component mounts
  useEffect(() => {
    console.log("Setting up cart listener");
    const cartsRef = ref(database, 'users');
    
    const unsubscribe = onValue(cartsRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log("No users data found in database");
        setCart({});
        return;
      }
      
      const userData = snapshot.val();
      console.log("Users data received:", userData);
      
      // Transform the data to the expected cart format
      const allCarts = {};
      
      Object.entries(userData).forEach(([userId, data]) => {
        if (data.carts) {
          console.log(`Found carts for user ${userId}:`, data.carts);
          
          Object.entries(data.carts).forEach(([businessId, businessData]) => {
            if (!allCarts[userId]) {
              allCarts[userId] = {};
            }
            
            allCarts[userId][businessId] = {
              businessId,
              businessName: businessData.businessName || "Store",
              products: businessData.products || {}
            };
          });
        }
      });
      
      console.log("Formatted cart data:", allCarts);
      setCart(allCarts);
    }, (error) => {
      console.error("Error fetching users cart data:", error);
    });

    return () => unsubscribe();
  }, []);

  // Function to get cart items for a specific user
  const getCartItems = useCallback(async (userId) => {
    if (!userId) {
      console.log("No userId provided to getCartItems");
      return {};
    }
    
    try {
      // Path to all carts for this user
      const userCartsRef = ref(database, `users/${userId}/carts`);
      console.log("Fetching carts from:", `users/${userId}/carts`);
      
      const snapshot = await get(userCartsRef);
      
      if (!snapshot.exists()) {
        console.log("No carts found for user", userId);
        return {};
      }
      
      const cartData = snapshot.val();
      console.log("Raw cart data from Firebase:", cartData);
      
      // Transform the data into the expected format
      const formattedCart = {};
      
      // Iterate through businesses
      Object.keys(cartData).forEach(businessId => {
        if (cartData[businessId]?.products) {
          formattedCart[businessId] = {
            businessId,
            businessName: cartData[businessId].businessName || "Store",
            products: cartData[businessId].products
          };
        }
      });
      
      console.log("Formatted cart data:", formattedCart);
      return formattedCart;
    } catch (error) {
      console.error("Error fetching cart data:", error);
      return {};
    }
  }, []);

  const addToCart = async (product, quantity, businessId, userId) => {
    if (!userId) {
      console.error("No userId provided for addToCart");
      toast.error("Please log in to add items to cart");
      return false;
    }
    
    console.log("Adding to cart with:", {
      userId,
      businessId,
      productId: product.id,
      quantity
    });
    
    try {
      // Path to this product in the user's cart
      const cartItemRef = ref(
        database,
        `users/${userId}/carts/${businessId}/products/${product.id}`
      );
      
      // Check if product already exists in cart
      const snapshot = await get(cartItemRef);
      
      if (snapshot.exists()) {
        // Update existing item quantity
        const currentQuantity = snapshot.val().quantity || 0;
        await update(cartItemRef, {
          quantity: currentQuantity + quantity
        });
        console.log("Updated existing cart item quantity");
      } else {
        // Add new item to cart
        await set(cartItemRef, {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: quantity,
          imageUrl: product.imageUrl || null,
          businessId: businessId
        });
        console.log("Added new item to cart");
      }
      
      // Add business name if it doesn't exist
      const businessRef = ref(database, `users/${userId}/carts/${businessId}`);
      const businessSnapshot = await get(businessRef);
      if (!businessSnapshot.exists() || !businessSnapshot.val().businessName) {
        await update(businessRef, {
          businessName: product.businessName || "Store"
        });
      }
      
      // Verify data was written
      const verifySnapshot = await get(cartItemRef);
      console.log("Verification - Cart item data:", verifySnapshot.val());
      
      toast.success("Added to cart!");
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error("Failed to add to cart: " + error.message);
      return false;
    }
  };

  const removeFromCart = async (businessId, productId, userId) => {
    if (!userId) {
      console.error("No userId provided for removeFromCart");
      toast.error("Please log in to manage your cart");
      return false;
    }
    
    try {
      const productRef = ref(database, `users/${userId}/carts/${businessId}/products/${productId}`);
      await set(productRef, null);
      console.log("Removed item from cart");
      
      // Check if the business has any products left
      const businessProductsRef = ref(database, `users/${userId}/carts/${businessId}/products`);
      const snapshot = await get(businessProductsRef);
      
      // If no products left, remove the business entry
      if (!snapshot.exists() || Object.keys(snapshot.val()).length === 0) {
        const businessRef = ref(database, `users/${userId}/carts/${businessId}`);
        await set(businessRef, null);
        console.log("Removed empty business from cart");
      }
      
      toast.success("Item removed from cart");
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error("Failed to remove item: " + error.message);
      return false;
    }
  };

  const updateQuantity = async (businessId, productId, quantity, userId) => {
    if (!userId) {
      console.error("No userId provided for updateQuantity");
      toast.error("Please log in to manage your cart");
      return false;
    }
    
    try {
      if (quantity < 1) {
        return removeFromCart(businessId, productId, userId);
      }
      
      const productQuantityRef = ref(database, `users/${userId}/carts/${businessId}/products/${productId}/quantity`);
      await set(productQuantityRef, quantity);
      console.log("Updated item quantity in cart");
      return true;
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error("Failed to update quantity: " + error.message);
      return false;
    }
  };

  const getCartTotal = (userId, businessId) => {
    if (!cart || !userId || !cart[userId] || !cart[userId][businessId] || !cart[userId][businessId].products) {
      return 0;
    }
    
    return Object.values(cart[userId][businessId].products || {}).reduce(
      (total, product) => total + ((product?.price || 0) * (product?.quantity || 0)),
      0
    );
  };

  const getCartTotalItems = (userId) => {
    if (!cart || !userId || !cart[userId]) {
      return 0;
    }
    
    return Object.values(cart[userId] || {}).reduce(
      (total, business) => {
        if (!business || !business.products) return total;
        
        return total +
          Object.values(business.products || {}).reduce(
            (businessTotal, product) => businessTotal + (product?.quantity || 0),
            0
          );
      },
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
    getCartTotalItems,
    getCartItems
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