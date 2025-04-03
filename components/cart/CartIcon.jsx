"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  collectionGroup,
  query,
  where,
} from "firebase/firestore";

/**
 * CartIcon - A component that displays a shopping cart icon with item count
 * and navigates to the cart page when clicked
 */
export default function CartIcon() {
  const { isLoading = false } = useCart();
  const [itemCount, setItemCount] = useState(0);
  const router = useRouter();

  // Listen for cart changes in real-time
  useEffect(() => {
    let unsubscribeAuth = null;
    let unsubscribeCart = null;

    // Set up auth state listener
    unsubscribeAuth = auth.onAuthStateChanged((user) => {
      // Clean up previous listener if exists
      if (unsubscribeCart) {
        unsubscribeCart();
      }

      if (!user) {
        setItemCount(0);
        return;
      }

      // Set up real-time listener for products across all business carts
      const userCartsRef = collection(db, "users", user.uid, "carts");

      unsubscribeCart = onSnapshot(
        userCartsRef,
        async (cartsSnapshot) => {
          let totalCount = 0;

          // For each business cart, get and count its products
          const countPromises = cartsSnapshot.docs.map(async (businessDoc) => {
            const businessId = businessDoc.id;
            const productsRef = collection(
              db,
              "users",
              user.uid,
              "carts",
              businessId,
              "products"
            );

            // Use another onSnapshot for products to get real-time updates for each business
            return new Promise((resolve) => {
              const unsubProducts = onSnapshot(
                productsRef,
                (productsSnapshot) => {
                  const businessTotal = productsSnapshot.docs.reduce(
                    (total, productDoc) => {
                      const productData = productDoc.data();
                      return total + (productData.quantity || 0);
                    },
                    0
                  );

                  resolve(businessTotal);

                  // We keep this listener active to update in real-time
                }
              );

              // Store this unsubscribe function somewhere if you need to clean up later
            });
          });

          // Wait for all business product counts
          const businessCounts = await Promise.all(countPromises);
          totalCount = businessCounts.reduce((sum, count) => sum + count, 0);

          setItemCount(totalCount);
        },
        (error) => {
          console.error("Error listening to cart updates:", error);
          setItemCount(0);
        }
      );
    });

    // Clean up listeners when component unmounts
    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeCart) unsubscribeCart();
    };
  }, []);

  const navigateToCart = () => {
    router.push("/cart");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative border"
      onClick={navigateToCart}
      aria-label="Shopping Cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {!isLoading && itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </Button>
  );
}
