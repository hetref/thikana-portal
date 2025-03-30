"use client";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit, Minus, Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { recordPurchase } from "@/lib/inventory-operations";

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

  const totalPrice = () => (product.price * quantity).toFixed(2);

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

  const openRazorpayPaymentGateway = (order, keyId, amount) => {
    const options = {
      key: keyId,
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      name: userData.name,
      description: "Buy Our Product",
      order_id: order.id,
      handler: async function (response) {
        try {
          await recordPurchase(userId, product.id, quantity, product.price);
          toast.success("Payment successful!");
          onClose();
        } catch (error) {
          console.error("Error recording purchase:", error);
          toast.error("Failed to record purchase. Please contact support.");
        }
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
      const order = await createRazorpayOrder(userId, totalPrice());
      openRazorpayPaymentGateway(order, order.keyId, totalPrice());
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
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 justify-center w-full">
          <div className="w-full flex items-center justify-center">
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={300}
              height={300}
              className="w-full h-64 object-contain rounded"
            />
          </div>
          <p className="text-lg text-gray-800">{product.description}</p>
          <p className="font-bold text-xl text-center">₹{totalPrice()}</p>
          
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
              >
                <Minus />
              </button>
              <input
                type="number"
                id="quantity"
                value={quantity}
                min="1"
                max={product.quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
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
              >
                <Plus />
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
                <Button
                  className="flex-1"
                  onClick={handleBuyNow}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Buy Now"}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}