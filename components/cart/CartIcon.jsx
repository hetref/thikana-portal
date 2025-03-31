"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

/**
 * CartIcon - A component that displays a shopping cart icon with item count
 * and navigates to the cart page when clicked
 */
export function CartIcon() {
  const { isLoading = false, getCartTotalItems = () => 0 } = useCart();

  const [itemCount, setItemCount] = useState(0);
  const router = useRouter();

  // Calculate total items in cart
  useEffect(() => {
    async function fetchCartCount() {
      if (!auth.currentUser) {
        setItemCount(0);
        return;
      }

      try {
        const count = await getCartTotalItems();
        setItemCount(count);
      } catch (error) {
        console.error("Error fetching cart count:", error);
        setItemCount(0);
      }
    }

    fetchCartCount();
  }, [getCartTotalItems]);

  const navigateToCart = () => {
    router.push("/cart");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative"
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
