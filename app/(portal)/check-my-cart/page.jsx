"use client";

import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { CartProvider } from '@/components/CartContext';

export default function CheckMyCartPage() {
  const [userId, setUserId] = useState(null);
  const [cartData, setCartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get current user ID
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setCartData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Function to check the cart
  const checkCart = async () => {
    if (!userId) {
      setError("Please log in first");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Get all business carts for this user
      const userCartsRef = collection(db, 'users', userId, 'carts');
      const cartsSnapshot = await getDocs(userCartsRef);
      
      if (cartsSnapshot.empty) {
        setCartData({ message: "Your cart is empty" });
        setIsLoading(false);
        return;
      }
      
      const result = {
        userId: userId,
        message: "Your cart contains items from these businesses:",
        businesses: []
      };
      
      // For each business
      for (const businessDoc of cartsSnapshot.docs) {
        const businessId = businessDoc.id;
        const businessData = businessDoc.data();
        
        // Get all products for this business
        const productsRef = collection(db, 'users', userId, 'carts', businessId, 'products');
        const productsSnapshot = await getDocs(productsRef);
        
        const products = [];
        let totalItems = 0;
        
        // Gather all products
        productsSnapshot.forEach(productDoc => {
          const product = productDoc.data();
          products.push(product);
          totalItems += product.quantity || 0;
        });
        
        // Add this business to the result
        result.businesses.push({
          businessId,
          businessName: businessData.businessName || "Unknown Business",
          totalProducts: products.length,
          totalItems,
          products
        });
      }
      
      setCartData(result);
    } catch (error) {
      console.error("Error checking cart:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartProvider>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">My Cart Structure</h1>
        
        {userId ? (
          <div>
            <p className="mb-4">Logged in as: <span className="font-medium">{userId}</span></p>
            
            <Button 
              onClick={checkCart}
              disabled={isLoading}
              className="mb-6"
            >
              {isLoading ? "Loading..." : "Check My Cart"}
            </Button>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {cartData && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Cart Data</h2>
                
                {cartData.message && (
                  <p className="mb-4">{cartData.message}</p>
                )}
                
                {cartData.businesses && cartData.businesses.length > 0 ? (
                  <div className="space-y-6">
                    {cartData.businesses.map(business => (
                      <div key={business.businessId} className="border rounded-lg p-4 dark:border-gray-600">
                        <h3 className="text-lg font-medium mb-2">{business.businessName}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                          Business ID: {business.businessId}
                        </p>
                        <p className="text-sm mb-3">
                          {business.totalProducts} products ({business.totalItems} items total)
                        </p>
                        
                        <h4 className="font-medium mb-2">Products:</h4>
                        <div className="space-y-2">
                          {business.products.map(product => (
                            <div key={product.id} className="bg-white dark:bg-gray-700 p-3 rounded">
                              <div className="flex justify-between">
                                <span className="font-medium">{product.name}</span>
                                <span>Qty: {product.quantity}</span>
                              </div>
                              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                                <span>Price: ₹{product.price}</span>
                                <span>Total: ₹{(product.price * product.quantity).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No items in cart</p>
                )}
                
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <h3 className="font-medium mb-2">Firestore Structure</h3>
                  <pre className="text-xs overflow-auto p-2 bg-gray-100 dark:bg-gray-900 rounded">
{`users/
  └── ${userId || '{userId}'}/
      └── carts/
          └── {businessId}/
              └── products/
                  └── {productId}/`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Please log in to see your cart structure
          </div>
        )}
      </div>
    </CartProvider>
  );
} 