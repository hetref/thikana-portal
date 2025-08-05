// CartFunctionality.js
"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import toast from "react-hot-toast";
import { ref, set, get, onValue, update } from "firebase/database";
import { database } from "@/lib/firebase"; // Ensure you have your Firebase config setup
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  remove,
  update,
  onValue,
  off,
} from "firebase/database";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { resolveBusinessId, getBusinessName } from "@/lib/business-utils";

export function useRealtimeCart(userId) {
  // Add state for cart data and loading
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Load cart data from Firebase in realtime
  useEffect(() => {
    if (!userId) {
      setCart({});
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log(`Setting up cart listener for userId: ${userId}`);
    
    const userCartsRef = ref(database, `users/${userId}/carts`);
    
    const unsubscribe = onValue(userCartsRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log("No cart data found for user", userId);
        setCart({});
        setLoading(false);
        return;
      }
      
      const cartData = snapshot.val();
      console.log("User cart data:", cartData);
      setCart(cartData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching user cart:", error);
      setLoading(false);
    });
    
    // Cleanup function
    return () => unsubscribe();
  }, [userId]);

  const addToCart = async (product, quantity, businessId, passedUserId = null) => {
    // Use the passed userId or the one from the hook
    const effectiveUserId = passedUserId || userId;
    
    if (!effectiveUserId) {
      console.error("User ID is required for cart operations");
      return false;
    }

    console.log("Adding to cart:", {
      product: product,
      quantity: quantity,
      businessId: businessId,
      userId: effectiveUserId
    });
    
    try {
      // Resolve the effective business ID using the new utility
      const effectiveBusinessId = resolveBusinessId(businessId, product);
      console.log("Resolved business ID:", effectiveBusinessId);

      // Get the business name
      const businessName = await getBusinessName(effectiveBusinessId);
      console.log("Business name:", businessName);
      
      // Path to this product in the user's cart
      const cartItemRef = ref(
        database,
        `users/${effectiveUserId}/carts/${effectiveBusinessId}/products/${product.id}`
      );
      
      console.log("Database path:", `users/${effectiveUserId}/carts/${effectiveBusinessId}/products/${product.id}`);
      
      // Check if product already exists in cart
      const snapshot = await get(cartItemRef);
      
      if (snapshot.exists()) {
        // Update existing item quantity
        const currentQuantity = snapshot.val().quantity || 0;
        console.log("Updating existing item. Current quantity:", currentQuantity);
        
        await update(cartItemRef, {
          quantity: currentQuantity + quantity
        });
        console.log("Updated existing cart item quantity");
      } else {
        // Add new item to cart
        console.log("Adding new item to cart with data:", {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: quantity,
          imageUrl: product.imageUrl || null,
          businessId: effectiveBusinessId,
          businessName: businessName
        });
        
        await set(cartItemRef, {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: quantity,
          imageUrl: product.imageUrl || null,
          businessId: effectiveBusinessId,
          businessName: businessName
        });
        console.log("Added new item to cart");
      }
      
      // Update business metadata in cart
      const businessRef = ref(database, `users/${effectiveUserId}/carts/${effectiveBusinessId}`);
      const businessSnapshot = await get(businessRef);
      
      const businessMetadata = {
        businessName: businessName,
        lastUpdated: Date.now()
      };

      if (!businessSnapshot.exists()) {
        await set(businessRef, businessMetadata);
      } else {
        await update(businessRef, businessMetadata);
      }
      
      return true;
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add item to cart");
      return false;
    }
  };

  // Function to get cart items for this user
  const getCartItems = async (userIdParam) => {
    const effectiveUserId = userIdParam || userId;
    if (!effectiveUserId) return {};
    
    try {
      // Path to all carts for this user
      const userCartsRef = ref(database, `users/${effectiveUserId}/carts`);
      const snapshot = await get(userCartsRef);
      
      if (!snapshot.exists()) {
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
  };
  
  // Calculate total number of items in cart
  const getCartTotalItems = () => {
    console.log("Calculating cart items from:", cart);
    
    if (!cart) {
      console.log("Cart is empty or undefined");
      return 0;
    }
    
    try {
      let total = 0;
      
      // Iterate through all businesses in the cart
      Object.values(cart).forEach(business => {
        console.log("Checking business products:", business);
        
        if (!business.products) {
          console.log("No products found for this business");
          return; // Skip this business
        }
        
        // Sum up quantities for all products
        Object.values(business.products).forEach(product => {
          if (product && typeof product.quantity === 'number') {
            total += product.quantity;
            console.log(`Added ${product.quantity} for ${product.name}, new total: ${total}`);
          } else {
            console.log("Invalid product or missing quantity:", product);
          }
        });
      });
      
      console.log("Final total items:", total);
      return total;
    } catch (error) {
      console.error("Error calculating cart total items:", error);
      return 0;
    }
  };
  
  // Calculate total price for a business
  const getBusinessTotal = (businessId) => {
    if (!cart || !cart[businessId] || !cart[businessId].products) return 0;
    
    return Object.values(cart[businessId].products).reduce(
      (total, product) => total + ((product.price || 0) * (product.quantity || 0)),
      0
    );
  };

  // Function to remove an item from the cart
  const removeFromCart = async (businessId, productId, userIdParam) => {
    const effectiveUserId = userIdParam || userId;
    
    if (!effectiveUserId) {
      toast.error("Please log in to manage your cart");
      return false;
    }
    
    console.log("Removing item from cart:", {
      userId: effectiveUserId,
      businessId,
      productId
    });
    
    try {
      const productRef = ref(database, `users/${effectiveUserId}/carts/${businessId}/products/${productId}`);
      await set(productRef, null);
      console.log("Removed item from cart");
      
      // Check if the business has any products left
      const businessProductsRef = ref(database, `users/${effectiveUserId}/carts/${businessId}/products`);
      const snapshot = await get(businessProductsRef);
      
      // If no products left, remove the business entry
      if (!snapshot.exists() || Object.keys(snapshot.val()).length === 0) {
        const businessRef = ref(database, `users/${effectiveUserId}/carts/${businessId}`);
        await set(businessRef, null);
        console.log("Removed empty business from cart");
      }
      
      toast.success("Item removed from cart");
      return true;
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast.error("Failed to remove item: " + error.message);
      return false;
    }
  };

  // Function to update item quantity
  const updateQuantity = async (businessId, productId, newQuantity, userIdParam) => {
    const effectiveUserId = userIdParam || userId;
    
    if (!effectiveUserId) {
      toast.error("Please log in to manage your cart");
      return false;
    }
    
    console.log("Updating quantity:", {
      userId: effectiveUserId,
      businessId,
      productId, 
      newQuantity
    });
    
    try {
      if (newQuantity < 1) {
        return removeFromCart(businessId, productId, effectiveUserId);
      }
      
      const productPath = `users/${effectiveUserId}/carts/${businessId}/products/${productId}`;
      const productRef = ref(database, productPath);
      
      // Get current product data
      const snapshot = await get(productRef);
      if (!snapshot.exists()) {
        console.error("Product not found in cart:", productPath);
        toast.error("Product not found in cart");
        return false;
      }
      
      // Update only the quantity field
      await update(productRef, { quantity: newQuantity });
      console.log("Updated quantity to", newQuantity);
      
      toast.success("Cart updated");
      return true;
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity: " + error.message);
      return false;
    }
  };

  return { 
    cart,
    isCartOpen,
    setIsCartOpen,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    getCartItems,
    getCartTotalItems,
    getBusinessTotal
  };
}

// Add to Cart button component
export function AddToCartButton({ product, businessId, userId }) {
  const [quantity, setQuantity] = useState(1);
  const [showQuantity, setShowQuantity] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Use the cart hook
  const { addToCart } = useRealtimeCart(userId);

  const handleAddToCart = async () => {
    if (!userId) {
      toast.error("Please log in to add items to cart");
      return;
    }
    
    if (!product) {
      toast.error("Invalid product data");
      return;
    }
    
    if (!product.id) {
      toast.error("Product is missing required information");
      return;
    }
    
    // Ensure businessId exists
    const effectiveBusinessId = businessId || product.businessId || "default-business";
    
    console.log("AddToCartButton adding:", {
      productId: product.id,
      productName: product.name,
      quantity,
      businessId: effectiveBusinessId,
      userId
    });
    
    setIsAdding(true);
    try {
      const result = await addToCart(product, quantity, effectiveBusinessId, userId);
      if (result) {
        toast.success("Added to cart!");
        setShowQuantity(false);
        setQuantity(1);
      } else {
        toast.error("Failed to add to cart");
      }
    } catch (error) {
      console.error("Error in AddToCartButton:", error);
      toast.error("Failed to add to cart: " + (error.message || "Unknown error"));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {showQuantity ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          
          <span className="w-8 text-center">{quantity}</span>
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setQuantity(prev => prev + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
          
          <Button 
            onClick={handleAddToCart}
            disabled={isAdding}
            className="ml-2"
          >
            {isAdding ? "Adding..." : "Add"}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => setShowQuantity(true)}
          disabled={product.quantity < 1}
        >
          <ShoppingCart className="h-4 w-4" />
          {product.quantity < 1 ? "Out of Stock" : "Add to Cart"}
        </Button>
      )}
    </div>
  );
}

// Cart Icon Component with realtime updates
export function RealtimeCartIcon({ userId }) {
  const { 
    cart,
    isCartOpen, 
    setIsCartOpen, 
    loading,
    getCartTotalItems 
  } = useRealtimeCart(userId);
  
  // Use a state to store the calculated item count for debugging
  const [itemCount, setItemCount] = useState(0);
  
  // Calculate and update item count when cart changes
  useEffect(() => {
    if (!loading && cart) {
      console.log("RealtimeCartIcon received cart:", cart);
      const count = getCartTotalItems ? getCartTotalItems() : 0;
      console.log("Calculated item count:", count);
      setItemCount(count);
    }
  }, [cart, loading, getCartTotalItems]);
  
  console.log("RealtimeCartIcon rendering with count:", itemCount);
  
  return (
    <Button 
      variant="outline" 
      size="icon" 
      className="relative"
      onClick={() => setIsCartOpen(true)}
    >
      <ShoppingCart className="h-5 w-5" />
      {!loading && itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </Button>
  );
}