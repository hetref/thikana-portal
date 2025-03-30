// CartFunctionality.js
"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import toast from "react-hot-toast";
import { ref, set, get, onValue, update } from "firebase/database";
import { database } from "@/lib/firebase"; // Ensure you have your Firebase config setup

export function useRealtimeCart(userId) {
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Initialize cart reference
  const cartRef = ref(database, `carts/${userId}`);

  // Listen for real-time updates to the cart
  useEffect(() => {
    if (!userId) return;
    
    setLoading(true);
    
    const unsubscribe = onValue(cartRef, (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : {};
      setCart(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching cart:", error);
      setLoading(false);
    });
    
    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [userId]);

  // Add product to cart
  const addToCart = async (product, quantity, businessId) => {
    if (!userId) {
      toast.error("Please log in to add items to cart");
      return;
    }
    
    try {
      // Get current cart data first
      const snapshot = await get(cartRef);
      const currentCart = snapshot.exists() ? snapshot.val() : {};
      
      // Create updated cart object
      const updatedCart = { ...currentCart };
      
      // Initialize business entry if it doesn't exist
      if (!updatedCart[businessId]) {
        updatedCart[businessId] = {
          businessName: product.businessName,
          products: {}
        };
      }
      
      // Add or update the product
      if (updatedCart[businessId].products && updatedCart[businessId].products[product.id]) {
        // Update existing product quantity
        const currentQuantity = updatedCart[businessId].products[product.id].quantity || 0;
        updatedCart[businessId].products[product.id] = {
          ...updatedCart[businessId].products[product.id],
          quantity: currentQuantity + quantity
        };
      } else {
        // Add new product
        if (!updatedCart[businessId].products) {
          updatedCart[businessId].products = {};
        }
        updatedCart[businessId].products[product.id] = {
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl || "",
          businessId: businessId,
          businessName: product.businessName,
          quantity: quantity
        };
      }
      
      // Save to Firebase
      await set(cartRef, updatedCart);
      toast.success(`Added ${quantity} ${product.name} to cart`);
      
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add item to cart");
    }
  };

  // Remove product from cart
  const removeFromCart = async (businessId, productId) => {
    try {
      // Get current cart
      const snapshot = await get(cartRef);
      if (!snapshot.exists()) return;
      
      const currentCart = snapshot.val();
      const updatedCart = { ...currentCart };
      
      // Check if the product exists
      if (updatedCart[businessId]?.products[productId]) {
        // Remove the product
        delete updatedCart[businessId].products[productId];
        
        // If no products left for this business, remove the business
        if (Object.keys(updatedCart[businessId].products).length === 0) {
          delete updatedCart[businessId];
        }
        
        // Update Firebase
        await set(cartRef, updatedCart);
        toast.success("Item removed from cart");
      }
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast.error("Failed to remove item from cart");
    }
  };

  // Update product quantity
  const updateQuantity = async (businessId, productId, quantity) => {
    try {
      if (quantity < 1) {
        return removeFromCart(businessId, productId);
      }
      
      // Get path to specific product quantity
      const productQuantityRef = ref(
        database, 
        `carts/${userId}/${businessId}/products/${productId}/quantity`
      );
      
      // Update only the quantity field
      await set(productQuantityRef, quantity);
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity");
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      await set(cartRef, {});
      toast.success("Cart cleared");
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast.error("Failed to clear cart");
    }
  };

  // Get cart total for a business
  const getCartTotal = (businessId) => {
    if (!cart[businessId]) return 0;
    
    return Object.values(cart[businessId].products || {}).reduce(
      (total, item) => total + (item.price * item.quantity), 
      0
    );
  };

  // Get total items in cart
  const getCartTotalItems = () => {
    return Object.values(cart).reduce(
      (total, business) => {
        return total + Object.values(business.products || {}).reduce(
          (businessTotal, product) => businessTotal + product.quantity,
          0
        );
      },
      0
    );
  };

  return {
    cart,
    isCartOpen,
    setIsCartOpen,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartTotalItems
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
    setIsAdding(true);
    await addToCart(product, quantity, businessId);
    setIsAdding(false);
    setShowQuantity(false);
    setQuantity(1);
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
    isCartOpen, 
    setIsCartOpen, 
    getCartTotalItems,
    cart,
    loading,
    removeFromCart,
    updateQuantity,
    getCartTotal 
  } = useRealtimeCart(userId);
  
  const itemCount = getCartTotalItems();

  // Include the rest of your CartIcon component code here
  // (The Sheet, checkout functionality, etc.)
  
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