"use client";

import React from 'react';
import { CartTestComponent } from '@/components/CartTestComponent';
import { CartProvider } from '@/components/CartContext';

export default function CartTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Cart Functionality Test Page</h1>
      
      <p className="mb-6">
        This page allows you to test Firebase database operations related to the cart functionality.
        Use the buttons below to test different aspects of the database connectivity.
      </p>
      
      <CartProvider>
        <CartTestComponent />
      </CartProvider>
      
      <div className="mt-8 p-6 border rounded-lg">
        <h2 className="text-xl font-bold mb-4">Instructions</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Make sure you are logged in first</li>
          <li>Click "Test Database Write" to test basic writing to the database under your user ID</li>
          <li>Click "Add Test Product to Cart" to explicitly test adding a product to your cart</li>
          <li>Click "Read All Cart Data" to view all cart data associated with your user</li>
          <li>Click "Check Security Rules" to test write permissions to different paths</li>
          <li>Click "Create Test Collection" to test creating a separate collection in the database</li>
        </ol>
        
        <p className="mt-6 text-sm text-gray-600">
          If tests fail, check:
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Firebase rules for your database (they might restrict writes)</li>
            <li>Your user authentication status</li>
            <li>Network connectivity</li>
            <li>Firebase configuration in your app</li>
          </ul>
        </p>
      </div>
    </div>
  );
} 