"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit, Minus, Plus, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import { recordPurchase } from "@/lib/inventory-operations";
import { ref, set, get, onValue, update } from "firebase/database";
import { database } from "@/lib/firebase";
import { useRealtimeCart } from "./CartFunctionality";
import { useCart } from "@/components/CartContext";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";

export function ProductDialog({ 
  product, 
  isOpen, 
  onClose, 
  userId, 
  userData, 
  userType = 'customer', 
  onEditProduct 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useRealtimeCart(userId);

  // Calculate total price based on quantity
  const totalPrice = () => (product?.price * quantity).toFixed(2);

  // Create a Razorpay order
  const createRazorpayOrder = async (userId, amount) => {
    const response = await fetch("/api/create-product-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, amount }),
    });

    const order = await response.json();
    return order;
  };

  // Open Razorpay payment gateway
  const openRazorpayPaymentGateway = (order, keyId, amount) => {
    const options = {
      key: keyId,
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      name: userData?.name || "Your Store",
      description: `Purchase: ${product?.name}`,
      order_id: order.id,
      handler: async function (response) {
        try {
          // Record the purchase in Firebase
          await recordPurchase(userId, product.id, quantity, product.price);
          
          // Update product quantity in Firebase
          updateProductQuantity(product.id, product.quantity - quantity);
          
          toast.success("Payment successful!");
          onClose();
        } catch (error) {
          console.error("Error recording purchase:", error);
          toast.error("Failed to record purchase. Please contact support.");
        }
      },
      prefill: {
        name: userData?.name || "",
        email: userData?.email || "",
        contact: userData?.phone || "",
      },
      theme: {
        color: "#3399cc",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // Update product quantity in Firebase after purchase
  const updateProductQuantity = async (productId, newQuantity) => {
    try {
      const productRef = ref(database, `products/${productId}/quantity`);
      await set(productRef, newQuantity);
    } catch (error) {
      console.error("Error updating product quantity:", error);
    }
  };

  // Handle "Buy Now" button click
  const handleBuyNow = async () => {
    if (!userId) {
      toast.error("Please log in to make a purchase");
      return;
    }
    
    setIsLoading(true);
    try {
      const order = await createRazorpayOrder(userId, totalPrice());
      openRazorpayPaymentGateway(order, order.keyId, totalPrice());
    } catch (error) {
      console.error("Error handling buy now:", error);
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle "Add to Cart" button click
  const handleAddToCart = async () => {
    if (product.quantity < quantity) {
      toast.error(`Sorry, only ${product.quantity} items available`);
      return;
    }
    
    await addToCart(product, quantity, product.businessId);
    onClose();
  };

  useEffect(() => {
    // Reset quantity when dialog opens with a new product
    if (isOpen) {
      setQuantity(1);
    }
  }, [isOpen, product]);

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            {product.name}
            {userType === 'business' && (
              <Button 
                variant="outline" 
                size="icon"
                onClick={onEditProduct}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            View product details and manage your purchase
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 justify-center w-full">
          <div className="w-full flex items-center justify-center">
            <Image
              src={product.imageUrl || "/placeholder-product.jpg"}
              alt={`${product.name} product image`}
              width={300}
              height={300}
              className="w-full h-64 object-contain rounded"
              priority
            />
          </div>
          
          <p className="text-lg text-gray-800">{product.description || "No description available"}</p>
          <p className="font-bold text-xl text-center">₹{totalPrice()}</p>
          
          {/* Stock information */}
          <p className="text-sm text-gray-500 text-center">
            {product.quantity > 0 
              ? `${product.quantity} in stock` 
              : "Out of stock"}
          </p>
          
          {/* Quantity section for customers */}
          {userType === 'customer' && product.quantity > 0 && (
            <div className="flex items-center justify-center">
              <label htmlFor="quantity" className="mr-2 text-lg">
                Quantity:
              </label>
              <button
                type="button"
                onClick={() =>
                  setQuantity((prevQuantity) => Math.max(1, prevQuantity - 1))
                }
                className="border rounded p-1 mr-2"
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                id="quantity"
                value={quantity}
                min="1"
                max={product.quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    setQuantity(Math.min(product.quantity, Math.max(1, val)));
                  }
                }}
                className="border rounded p-1 w-[80px] text-center"
              />
              <button
                type="button"
                onClick={() =>
                  setQuantity((prevQuantity) =>
                    Math.min(product.quantity, prevQuantity + 1)
                  )
                }
                className="border rounded p-1 ml-2"
                disabled={quantity >= product.quantity}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Buttons section - different for business and customer */}
          {userType === 'customer' && (
            <div className="flex gap-4">
              {product.quantity === 0 ? (
                <Button
                  className="flex-1 w-full"
                  disabled
                >
                  Out of Stock
                </Button>
              ) : (
                <>
                  <Button
                    className="flex-1"
                    onClick={handleBuyNow}
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : "Buy Now"}
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={handleAddToCart}
                    disabled={isLoading}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CartIcon({ userId, userData }) {
  const { isCartOpen, setIsCartOpen, getCartTotalItems } = useCart();
  const itemCount = getCartTotalItems();

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative"
        >
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Your Cart</h2>
          {/* Cart content will be rendered here */}
        </div>
      </SheetContent>
    </Sheet>
  );
}