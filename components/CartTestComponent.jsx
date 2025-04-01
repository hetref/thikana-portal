"use client";
import React, { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";

///// TO SO ADD RAZOR PAY TO CHECKOUT BUTTON

export function CartTestComponent() {
  const [userId, setUserId] = useState(null);
  const [testResult, setTestResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get current user ID from auth
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Test writing to the database
  const testDatabaseWrite = async () => {
    if (!userId) {
      setTestResult("No user is logged in. Please log in first.");
      return;
    }

    setIsLoading(true);
    setTestResult("Testing database write...");

    try {
      // Test document in Firestore
      const testDocRef = doc(db, "users", userId, "test", "test-doc");

      // Write test data
      await setDoc(testDocRef, {
        timestamp: new Date().toISOString(),
        message: "Test write successful",
      });

      // Verify the write
      const docSnap = await getDoc(testDocRef);

      if (docSnap.exists()) {
        setTestResult(
          `Success! Test data written to: users/${userId}/test/test-doc\nData: ${JSON.stringify(docSnap.data(), null, 2)}`
        );
      } else {
        setTestResult(
          `Warning: Write completed but data not found at: users/${userId}/test/test-doc`
        );
      }
    } catch (error) {
      setTestResult(`Error writing to database: ${error.message}`);
      console.error("Database write error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test adding a product to cart
  const testAddToCart = async () => {
    if (!userId) {
      setTestResult("No user is logged in. Please log in first.");
      return;
    }

    setIsLoading(true);
    setTestResult("Testing cart addition...");

    try {
      // Generate a random test product
      const testBusinessId = "test-business";
      const testProductId = `test-product-${Date.now()}`;
      const testProduct = {
        id: testProductId,
        name: `Test Product ${Date.now()}`,
        price: 99.99,
        quantity: 1,
        imageUrl: null,
        businessId: testBusinessId,
        createdAt: new Date(),
      };

      // Create the business document if it doesn't exist
      const businessDocRef = doc(db, "users", userId, "carts", testBusinessId);

      // First get the business doc to see if it exists
      const businessDoc = await getDoc(businessDocRef);

      if (!businessDoc.exists()) {
        // Create a new business cart document
        await setDoc(businessDocRef, {
          businessId: testBusinessId,
          businessName: "Test Business",
          updatedAt: new Date(),
        });
      }

      // Add the product to the cart's products subcollection
      const productDocRef = doc(
        db,
        "users",
        userId,
        "carts",
        testBusinessId,
        "products",
        testProductId
      );
      await setDoc(productDocRef, testProduct);

      // Verify the product was added
      const productSnap = await getDoc(productDocRef);

      if (productSnap.exists()) {
        toast.success("Test product added to cart!");
        setTestResult(
          `Success! Test product added to cart at: users/${userId}/carts/${testBusinessId}/products/${testProductId}\nData: ${JSON.stringify(productSnap.data(), null, 2)}`
        );
      } else {
        setTestResult(
          `Warning: Write completed but product not found at: users/${userId}/carts/${testBusinessId}/products/${testProductId}`
        );
      }
    } catch (error) {
      setTestResult(`Error adding to cart: ${error.message}`);
      console.error("Cart addition error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check all cart data
  const readAllCartData = async () => {
    if (!userId) {
      setTestResult("No user is logged in. Please log in first.");
      return;
    }

    setIsLoading(true);
    setTestResult("Reading all cart data...");

    try {
      // Get all business carts for the user
      const userCartsRef = collection(db, "users", userId, "carts");
      const cartsSnapshot = await getDocs(userCartsRef);

      if (cartsSnapshot.empty) {
        setTestResult(`No cart data found for user: ${userId}`);
        setIsLoading(false);
        return;
      }

      let cartData = {};

      // Process each business
      for (const businessDoc of cartsSnapshot.docs) {
        const businessId = businessDoc.id;
        const businessData = businessDoc.data();

        // Get products for this business
        const productsRef = collection(
          db,
          "users",
          userId,
          "carts",
          businessId,
          "products"
        );
        const productsSnapshot = await getDocs(productsRef);

        // Extract product data
        const products = {};
        productsSnapshot.forEach((productDoc) => {
          products[productDoc.id] = productDoc.data();
        });

        cartData[businessId] = {
          ...businessData,
          products: products,
        };
      }

      setTestResult(
        `Cart data found for user ${userId}:\n${JSON.stringify(cartData, null, 2)}`
      );
    } catch (error) {
      setTestResult(`Error reading cart data: ${error.message}`);
      console.error("Cart read error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // List all products in a simpler format
  const listCartProducts = async () => {
    if (!userId) {
      setTestResult("No user is logged in. Please log in first.");
      return;
    }

    setIsLoading(true);
    setTestResult("Listing all cart products...");

    try {
      // Get all business carts for the user
      const userCartsRef = collection(db, "users", userId, "carts");
      const cartsSnapshot = await getDocs(userCartsRef);

      if (cartsSnapshot.empty) {
        setTestResult(`No cart data found for user: ${userId}`);
        setIsLoading(false);
        return;
      }

      let productList = [];

      // Process each business
      for (const businessDoc of cartsSnapshot.docs) {
        const businessId = businessDoc.id;
        const businessData = businessDoc.data();

        // Get products for this business
        const productsRef = collection(
          db,
          "users",
          userId,
          "carts",
          businessId,
          "products"
        );
        const productsSnapshot = await getDocs(productsRef);

        if (!productsSnapshot.empty) {
          productsSnapshot.forEach((productDoc) => {
            const productData = productDoc.data();
            productList.push({
              businessId: businessId,
              businessName: businessData.businessName || "Unknown Business",
              productId: productDoc.id,
              name: productData.name || "Unknown Product",
              price: productData.price || 0,
              quantity: productData.quantity || 0,
              totalPrice:
                (productData.price || 0) * (productData.quantity || 0),
            });
          });
        }
      }

      if (productList.length === 0) {
        setTestResult(`No products found in cart for user: ${userId}`);
      } else {
        const totalValue = productList.reduce(
          (sum, product) => sum + product.totalPrice,
          0
        );
        setTestResult(
          `Found ${productList.length} products in cart for user ${userId}:\n` +
            `Total Cart Value: $${totalValue.toFixed(2)}\n\n` +
            productList
              .map(
                (p) =>
                  `- ${p.name} (${p.businessName})\n  Quantity: ${p.quantity}, Price: $${p.price}, Total: $${p.totalPrice.toFixed(2)}`
              )
              .join("\n\n")
        );
      }
    } catch (error) {
      setTestResult(`Error listing cart products: ${error.message}`);
      console.error("Cart product listing error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check Firebase security rules
  const checkSecurityRules = async () => {
    if (!userId) {
      setTestResult("No user is logged in. Please log in first.");
      return;
    }

    setIsLoading(true);
    setTestResult("Checking security rules...");

    try {
      // Try writing to different paths to check permissions
      const paths = [
        { name: "Root test", path: ["test", "test-doc"] },
        { name: "User document", path: ["users", userId] },
        {
          name: "User test subcollection",
          path: ["users", userId, "test", "security-test"],
        },
        {
          name: "User carts collection",
          path: ["users", userId, "carts", "security-test"],
        },
        {
          name: "User cart products",
          path: [
            "users",
            userId,
            "carts",
            "security-test",
            "products",
            "test-product",
          ],
        },
      ];

      const results = {};

      for (const pathInfo of paths) {
        try {
          // Create a document reference from the path array
          const docRef = doc(db, ...pathInfo.path);

          await setDoc(docRef, {
            timestamp: new Date().toISOString(),
            test: true,
          });

          results[pathInfo.name] =
            `Write successful to ${pathInfo.path.join("/")}`;
        } catch (error) {
          results[pathInfo.name] =
            `Write failed to ${pathInfo.path.join("/")}: ${error.message}`;
        }
      }

      setTestResult(
        `Security rules check results:\n${JSON.stringify(results, null, 2)}`
      );
    } catch (error) {
      setTestResult(`Error checking security rules: ${error.message}`);
      console.error("Security rules check error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test writing to a separate collection
  const testCreateCollection = async () => {
    if (!userId) {
      setTestResult("No user is logged in. Please log in first.");
      return;
    }

    setIsLoading(true);
    setTestResult("Creating a separate collection...");

    try {
      // Define the collection in Firestore
      const cartCollectionRef = doc(db, "cart_collections", userId);

      // Create a test collection with some data
      const testData = {
        name: `Test Collection ${Date.now()}`,
        created: new Date().toISOString(),
        userId: userId,
      };

      // Write the main document data
      await setDoc(cartCollectionRef, testData);

      // Add items as a subcollection
      const item1Ref = doc(db, "cart_collections", userId, "items", "item1");
      const item2Ref = doc(db, "cart_collections", userId, "items", "item2");

      await setDoc(item1Ref, {
        id: "item1",
        name: "Collection Item 1",
        price: 19.99,
        quantity: 1,
      });

      await setDoc(item2Ref, {
        id: "item2",
        name: "Collection Item 2",
        price: 29.99,
        quantity: 2,
      });

      // Verify the write
      const collectionSnap = await getDoc(cartCollectionRef);
      const item1Snap = await getDoc(item1Ref);
      const item2Snap = await getDoc(item2Ref);

      if (collectionSnap.exists() && item1Snap.exists() && item2Snap.exists()) {
        toast.success("Test collection created!");
        setTestResult(
          `Success! Test collection created at: cart_collections/${userId}\nMain Data: ${JSON.stringify(collectionSnap.data(), null, 2)}\nItem 1: ${JSON.stringify(item1Snap.data(), null, 2)}\nItem 2: ${JSON.stringify(item2Snap.data(), null, 2)}`
        );
      } else {
        setTestResult(
          `Warning: Write completed but not all data found at: cart_collections/${userId}`
        );
      }
    } catch (error) {
      setTestResult(`Error creating collection: ${error.message}`);
      console.error("Collection creation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear the entire cart
  const clearEntireCart = async () => {
    if (!userId) {
      setTestResult("No user is logged in. Please log in first.");
      return;
    }

    setIsLoading(true);
    setTestResult("Clearing entire cart...");

    try {
      // Get all business carts for the user
      const userCartsRef = collection(db, "users", userId, "carts");
      const cartsSnapshot = await getDocs(userCartsRef);

      if (cartsSnapshot.empty) {
        setTestResult(`No cart data found to clear for user: ${userId}`);
        setIsLoading(false);
        return;
      }

      let deletedBusinesses = 0;
      let deletedProducts = 0;

      // Process each business
      for (const businessDoc of cartsSnapshot.docs) {
        const businessId = businessDoc.id;

        // First delete all products in the business
        const productsRef = collection(
          db,
          "users",
          userId,
          "carts",
          businessId,
          "products"
        );
        const productsSnapshot = await getDocs(productsRef);

        // Delete all product documents
        const productDeletePromises = productsSnapshot.docs.map(
          async (productDoc) => {
            await deleteDoc(
              doc(
                db,
                "users",
                userId,
                "carts",
                businessId,
                "products",
                productDoc.id
              )
            );
            deletedProducts++;
          }
        );

        // Wait for all product deletions to complete
        await Promise.all(productDeletePromises);

        // Now delete the business document
        await deleteDoc(doc(db, "users", userId, "carts", businessId));
        deletedBusinesses++;
      }

      setTestResult(
        `Cart cleared successfully!\n\nDeleted: ${deletedBusinesses} businesses and ${deletedProducts} products from cart.`
      );
      toast.success("Cart cleared successfully!");
    } catch (error) {
      setTestResult(`Error clearing cart: ${error.message}`);
      console.error("Cart clearing error:", error);
      toast.error("Failed to clear cart: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg mb-6">
      <h2 className="text-xl font-bold mb-4">Firestore Database Test</h2>

      {userId ? (
        <p className="mb-4">Logged in as: {userId}</p>
      ) : (
        <p className="mb-4 text-red-500">
          Not logged in. Please log in to test cart functionality.
        </p>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <Button
          onClick={testDatabaseWrite}
          disabled={isLoading || !userId}
          variant="outline"
        >
          Test Database Write
        </Button>

        <Button
          onClick={testAddToCart}
          disabled={isLoading || !userId}
          variant="outline"
        >
          Add Test Product to Cart
        </Button>

        <Button
          onClick={readAllCartData}
          disabled={isLoading || !userId}
          variant="outline"
        >
          Read All Cart Data
        </Button>

        <Button
          onClick={listCartProducts}
          disabled={isLoading || !userId}
          variant="outline"
        >
          List Cart Products
        </Button>

        <Button
          onClick={checkSecurityRules}
          disabled={isLoading || !userId}
          variant="outline"
        >
          Check Security Rules
        </Button>

        <Button
          onClick={testCreateCollection}
          disabled={isLoading || !userId}
          variant="outline"
        >
          Create Test Collection
        </Button>

        <Button
          onClick={clearEntireCart}
          disabled={isLoading || !userId}
          variant="destructive"
        >
          Clear Entire Cart
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin h-6 w-6 border-3 border-primary border-t-transparent rounded-full mr-2"></div>
          <span>Loading...</span>
        </div>
      )}

      {testResult && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Test Result:</h3>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60 text-sm">
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
}
