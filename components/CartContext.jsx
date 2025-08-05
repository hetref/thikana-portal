"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import { resolveBusinessId, getBusinessName } from "@/lib/business-utils";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Test function to write directly to the database
  const testDatabaseWrite = async (userId) => {
    if (!userId) return;

    try {
      console.log("Testing database write for user:", userId);
      const testDocRef = doc(db, "users", userId, "test", "test-write");
      await setDoc(testDocRef, {
        timestamp: new Date().toISOString(),
        message: "Test write successful",
      });
      console.log("Test write successful");

      // Verify the test write
      const docSnap = await getDoc(testDocRef);
      if (docSnap.exists()) {
        console.log("Test write verified:", docSnap.data());
      } else {
        console.error("Test write failed - data not found after write");
      }
    } catch (error) {
      console.error("Test write failed with error:", error);
    }
  };

  // Add a useEffect to expose the test function in the window object for debugging
  useEffect(() => {
    // Expose test function to window for debugging
    window.testDatabaseWrite = testDatabaseWrite;

    return () => {
      delete window.testDatabaseWrite;
    };
  }, []);

  // Function to get cart items for a specific user
  const getCartItems = useCallback(async (userId = null) => {
    // Get the current logged in user ID directly from auth
    const currentUserId = auth.currentUser?.uid;

    // Use the currentUserId if available, otherwise fall back to the passed userId
    const userIdToUse = currentUserId || userId;

    if (!userIdToUse) {
      console.log("No user is logged in");
      return {};
    }

    setIsLoading(true);

    try {
      console.log("Fetching carts for user:", userIdToUse);

      // Get all business carts for the user
      const cartsCollectionRef = collection(db, "users", userIdToUse, "carts");
      const cartsSnapshot = await getDocs(cartsCollectionRef);

      if (cartsSnapshot.empty) {
        console.log("No carts found for user", userIdToUse);
        setIsLoading(false);
        return {};
      }

      // Transform the data into the expected format
      const formattedCart = {};

      // Process each business cart
      for (const businessDoc of cartsSnapshot.docs) {
        const businessId = businessDoc.id;
        const businessData = businessDoc.data();

        // Get products for this business
        const productsCollectionRef = collection(
          db,
          "users",
          userIdToUse,
          "carts",
          businessId,
          "products"
        );
        const productsSnapshot = await getDocs(productsCollectionRef);

        const products = {};
        productsSnapshot.forEach((productDoc) => {
          products[productDoc.id] = productDoc.data();
        });

        formattedCart[businessId] = {
          businessId,
          businessName: businessData.businessName || "Store",
          products,
        };
      }

      console.log("Formatted cart data:", formattedCart);
      return formattedCart;
    } catch (error) {
      console.error("Error fetching cart data:", error);
      return {};
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to add a product to cart
  const addToCart = async (product, quantity, businessId, userId = null) => {
    // Get the current logged in user ID directly from auth
    const currentUserId = auth.currentUser?.uid;

    // Use the currentUserId if available, otherwise fall back to the passed userId
    const userIdToUse = currentUserId || userId;

    if (!userIdToUse) {
      console.error("No user is logged in");
      toast.error("Please log in to add items to cart");
      return false;
    }

    if (!product || !product.id) {
      console.error("Invalid product data:", product);
      toast.error("Invalid product data");
      return false;
    }

    // Resolve the effective business ID using the new utility
    const effectiveBusinessId = resolveBusinessId(businessId, product);

    console.log("Adding to cart with:", {
      userId: userIdToUse,
      businessId: effectiveBusinessId,
      productId: product.id,
      product: product,
      quantity,
    });

    try {
      // Ensure the business document exists
      const businessDocRef = doc(db, "users", userIdToUse, "carts", effectiveBusinessId);
      const businessDocSnap = await getDoc(businessDocRef);

      // Get business name using the utility
      let businessName = await getBusinessName(effectiveBusinessId);

      // If business document doesn't exist, create it with proper info
      if (!businessDocSnap.exists()) {
        console.log("Business document doesn't exist in cart, creating it now");

        await setDoc(businessDocRef, {
          businessId: effectiveBusinessId,
          businessName: businessName,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log("Created new business document in cart");
      } else {
        console.log(
          "Business document already exists in cart:",
          businessDocSnap.data()
        );

        // Update businessName if it's now available but wasn't before
        const existingBusinessData = businessDocSnap.data();
        if (
          existingBusinessData.businessName === "Store" &&
          businessName !== "Store"
        ) {
          console.log(
            "Updating business name from",
            existingBusinessData.businessName,
            "to",
            businessName
          );
          await updateDoc(businessDocRef, {
            businessName: businessName,
            updatedAt: new Date(),
          });
        }
      }

      // Check if product already exists
      const productDocRef = doc(
        db,
        "users",
        userIdToUse,
        "carts",
        effectiveBusinessId,
        "products",
        product.id
      );
      const productDocSnap = await getDoc(productDocRef);

      if (productDocSnap.exists()) {
        // Update existing product quantity
        const currentQuantity = productDocSnap.data().quantity || 0;
        console.log(
          "Updating existing product quantity from",
          currentQuantity,
          "to",
          currentQuantity + quantity
        );
        await updateDoc(productDocRef, {
          quantity: currentQuantity + quantity,
          updatedAt: new Date(),
        });
        console.log("Updated existing cart item quantity");
      } else {
        // Add new product
        const newCartItem = {
          id: product.id,
          name: product.name || "Unknown Product",
          price: product.price || 0,
          quantity: quantity,
          imageUrl: product.imageUrl || null,
          businessId: effectiveBusinessId,
          businessName: businessName,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        console.log("Adding new item to cart:", newCartItem);
        await setDoc(productDocRef, newCartItem);
      }

      // Update the business document's updatedAt timestamp
      await updateDoc(businessDocRef, {
        updatedAt: new Date(),
      });

      // Verify product was added
      const verifyDocSnap = await getDoc(productDocRef);
      if (verifyDocSnap.exists()) {
        console.log(
          "Successfully verified cart item data:",
          verifyDocSnap.data()
        );

        // Update the local cart state
        const updatedCart = { ...cart };
        if (!updatedCart[userIdToUse]) updatedCart[userIdToUse] = {};
        if (!updatedCart[userIdToUse][effectiveBusinessId]) {
          updatedCart[userIdToUse][effectiveBusinessId] = {
            businessId: effectiveBusinessId,
            businessName: businessName,
            products: {},
          };
        }

        // Update or add the product
        const existingProduct =
          updatedCart[userIdToUse][effectiveBusinessId].products[product.id];
        updatedCart[userIdToUse][effectiveBusinessId].products[product.id] = {
          ...product,
          quantity: existingProduct
            ? existingProduct.quantity + quantity
            : quantity,
        };

        setCart(updatedCart);
        toast.success("Added to cart!");
        return true;
      } else {
        console.error("Failed to verify cart item data was written");
        toast.error("Failed to add to cart: Data was not saved");
        return false;
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart: " + error.message);
      return false;
    }
  };

  // Function to remove a product from cart
  const removeFromCart = async (businessId, productId, userId = null) => {
    // Get the current logged in user ID directly from auth
    const currentUserId = auth.currentUser?.uid;

    // Use the currentUserId if available, otherwise fall back to the passed userId
    const userIdToUse = currentUserId || userId;

    if (!userIdToUse) {
      console.error("No user is logged in");
      toast.error("Please log in to manage your cart");
      return false;
    }

    try {
      // Delete the product document
      const productDocRef = doc(
        db,
        "users",
        userIdToUse,
        "carts",
        businessId,
        "products",
        productId
      );
      await deleteDoc(productDocRef);
      console.log("Removed item from cart");

      // Check if the business has any products left
      const productsCollectionRef = collection(
        db,
        "users",
        userIdToUse,
        "carts",
        businessId,
        "products"
      );
      const productsSnapshot = await getDocs(productsCollectionRef);

      // If no products left, remove the business document
      if (productsSnapshot.empty) {
        const businessDocRef = doc(
          db,
          "users",
          userIdToUse,
          "carts",
          businessId
        );
        await deleteDoc(businessDocRef);
        console.log("Removed empty business from cart");
      }

      // Update local cart state
      const updatedCart = { ...cart };
      if (updatedCart[userIdToUse] && updatedCart[userIdToUse][businessId]) {
        if (updatedCart[userIdToUse][businessId].products) {
          delete updatedCart[userIdToUse][businessId].products[productId];
        }

        // If no products left for this business, remove the business
        if (
          Object.keys(updatedCart[userIdToUse][businessId].products || {})
            .length === 0
        ) {
          delete updatedCart[userIdToUse][businessId];
        }
      }

      setCart(updatedCart);
      toast.success("Item removed from cart");
      return true;
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast.error("Failed to remove item: " + error.message);
      return false;
    }
  };

  // Function to update product quantity
  const updateQuantity = async (
    businessId,
    productId,
    quantity,
    userId = null
  ) => {
    // Get the current logged in user ID directly from auth
    const currentUserId = auth.currentUser?.uid;

    // Use the currentUserId if available, otherwise fall back to the passed userId
    const userIdToUse = currentUserId || userId;

    if (!userIdToUse) {
      console.error("No user is logged in");
      toast.error("Please log in to manage your cart");
      return false;
    }

    try {
      if (quantity < 1) {
        return removeFromCart(businessId, productId, userIdToUse);
      }

      const productDocRef = doc(
        db,
        "users",
        userIdToUse,
        "carts",
        businessId,
        "products",
        productId
      );
      await updateDoc(productDocRef, {
        quantity: quantity,
        updatedAt: new Date(),
      });

      // Update parent business document's timestamp
      const businessDocRef = doc(db, "users", userIdToUse, "carts", businessId);
      await updateDoc(businessDocRef, {
        updatedAt: new Date(),
      });

      // Update local cart state
      const updatedCart = { ...cart };
      if (
        updatedCart[userIdToUse] &&
        updatedCart[userIdToUse][businessId] &&
        updatedCart[userIdToUse][businessId].products &&
        updatedCart[userIdToUse][businessId].products[productId]
      ) {
        updatedCart[userIdToUse][businessId].products[productId].quantity =
          quantity;
      }

      setCart(updatedCart);
      console.log("Updated item quantity in cart");
      return true;
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity: " + error.message);
      return false;
    }
  };

  // Calculate total price for a business cart
  const getCartTotal = (userId, businessId) => {
    if (
      !cart ||
      !userId ||
      !cart[userId] ||
      !cart[userId][businessId] ||
      !cart[userId][businessId].products
    ) {
      return 0;
    }

    return Object.values(cart[userId][businessId].products || {}).reduce(
      (total, product) =>
        total + (product?.price || 0) * (product?.quantity || 0),
      0
    );
  };

  // Calculate total items in all user's carts
  const getCartTotalItems = (userId) => {
    if (!cart || !userId || !cart[userId]) {
      return 0;
    }

    return Object.values(cart[userId] || {}).reduce((total, business) => {
      if (!business || !business.products) return total;

      return (
        total +
        Object.values(business.products || {}).reduce(
          (businessTotal, product) => businessTotal + (product?.quantity || 0),
          0
        )
      );
    }, 0);
  };

  // Load user's cart data when mounted
  useEffect(() => {
    const loadCartData = async () => {
      try {
        // Subscribe to authentication state
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
          console.log(
            "Auth state changed:",
            user ? `User logged in: ${user.uid}` : "User logged out"
          );
          // We don't need to do anything here since getCartItems will be called by components as needed
        });

        // We'll handle loading specific user's cart data in the getCartItems function
        setIsLoading(false);

        return () => {
          if (unsubscribeAuth) unsubscribeAuth();
        };
      } catch (error) {
        console.error("Error setting up cart listener:", error);
        setIsLoading(false);
      }
    };

    loadCartData();
  }, []);

  // Add a new function to clear all products from a specific business
  const clearBusinessItems = async (businessId) => {
    if (!auth.currentUser) {
      console.error("User not authenticated");
      return false;
    }

    try {
      console.log(`Clearing all items for business ${businessId} from cart`);

      // Get all products for this business
      const productsCollectionRef = collection(
        db,
        "users",
        auth.currentUser.uid,
        "carts",
        businessId,
        "products"
      );

      // Get all product documents
      const productsSnapshot = await getDocs(productsCollectionRef);

      // Delete each product document
      const deletePromises = [];
      productsSnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      // Wait for all deletions to complete
      await Promise.all(deletePromises);

      // Delete the business document
      const businessDocRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "carts",
        businessId
      );

      await deleteDoc(businessDocRef);

      // Update local state
      setCart((prevCart) => {
        const newCart = { ...prevCart };
        if (
          newCart[auth.currentUser.uid] &&
          newCart[auth.currentUser.uid][businessId]
        ) {
          delete newCart[auth.currentUser.uid][businessId];
        }
        return newCart;
      });

      console.log(
        `Successfully cleared items for business ${businessId} from cart`
      );
      return true;
    } catch (error) {
      console.error("Error clearing business items from cart:", error);
      return false;
    }
  };

  const value = {
    cart,
    isCartOpen,
    isLoading,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    getCartTotalItems,
    getCartItems,
    clearBusinessItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
