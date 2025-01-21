"use client";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export function ProductDialog({ product, isOpen, onClose, userId, userData }) {
  const [isLoading, setIsLoading] = useState(false);

  const createRazorpayOrder = async (userId, amount) => {
    const response = await fetch("/api/create-product-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, amount }),
    });

    // if (!response.ok) {
    //   throw new Error("Failed to create Razorpay order");
    // }

    const order = await response.json();
    return order;
  };

  const openRazorpayPaymentGateway = (order, keyId, amount) => {
    const options = {
      key: keyId,
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      name: userData.name,
      description: "Buy Our Produt",
      order_id: order.id,
      handler: function (response) {
        toast.success("Payment successful!");
        onClose();
      },
      prefill: {
        name: userData.name,
        email: userData.email,
        contact: userData.phone,
      },
      notes: {
        address: "Razorpay Corporate Office",
      },
      theme: {
        color: "#3399cc",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handleBuyNow = async () => {
    setIsLoading(true);
    try {
      const order = await createRazorpayOrder(userId, product.price);
      openRazorpayPaymentGateway(order, order.keyId, product.price);
    } catch (error) {
      console.error("Error handling buy now:", error);
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Image
            src={product.imageUrl}
            alt={product.title}
            width={300}
            height={300}
            className="w-full h-64 object-cover rounded"
          />
          <p className="text-sm text-gray-600">{product.description}</p>
          <p className="font-bold text-lg">₹{product.price.toFixed(2)}</p>
          <div className="flex gap-4">
            <Button
              className="flex-1"
              onClick={handleBuyNow}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Buy Now"}
            </Button>
            <Button variant="outline" className="flex-1">
              <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
