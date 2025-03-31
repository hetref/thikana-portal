"use client";

import React from 'react';
import { CartTestComponent } from '@/components/CartTestComponent';
import { CartProvider } from '@/components/CartContext';

export default function FirestoreCartTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">Firestore Cart Functionality Test</h1>
      <p className="text-gray-600 mb-6">
        This page allows you to test cart operations with Firestore database.
      </p>
      
      <CartProvider>
        <CartTestComponent />
      </CartProvider>
      
      <div className="mt-8 p-6 border rounded-lg">
        <h2 className="text-xl font-bold mb-4">Firestore Data Structure</h2>
        <p className="mb-4">
          The cart data is organized in Firestore with the following structure:
        </p>
        
        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto mb-4 text-sm">
{`users/
  └── {userId}/
      └── carts/
          └── {businessId}/  (document)
              ├── businessId: string
              ├── businessName: string
              ├── updatedAt: timestamp
              └── products/  (subcollection)
                  └── {productId}/  (document)
                      ├── id: string
                      ├── name: string
                      ├── price: number
                      ├── quantity: number
                      ├── imageUrl: string
                      ├── businessId: string
                      ├── createdAt: timestamp
                      └── updatedAt: timestamp`}
        </pre>
        
        <h3 className="text-lg font-semibold mb-2">Instructions</h3>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Ensure you are logged in first</li>
          <li>Use "Test Database Write" to verify basic Firestore write capabilities</li>
          <li>Use "Add Test Product to Cart" to create a test business and product in your cart</li>
          <li>Use "Read All Cart Data" to view the data in your cart</li>
          <li>Use "Check Security Rules" to test database permissions for different paths</li>
          <li>Use "Create Test Collection" to test creating a separate collection structure</li>
        </ol>
        
        <h3 className="text-lg font-semibold mt-6 mb-2">Troubleshooting</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>If writes fail, check Firestore security rules in Firebase Console</li>
          <li>Ensure you have the correct database URL in your Firebase config</li>
          <li>Check the browser console for detailed error messages</li>
          <li>Verify that read permissions are enabled for your user paths</li>
        </ul>
        
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
          <h4 className="text-md font-semibold mb-2">Difference from Realtime Database</h4>
          <p className="text-sm">
            Firestore uses a document/collection model rather than a JSON tree structure. 
            Products are stored in a subcollection rather than as nested objects.
            This provides better scaling and querying capabilities for complex data.
          </p>
        </div>
      </div>
    </div>
  );
} 