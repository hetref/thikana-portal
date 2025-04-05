"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit, Minus, Plus, ShoppingCart, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { recordPurchase, updateProduct, deleteProduct } from "@/lib/inventory-operations";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/components/CartContext";
import { usePathname, useSearchParams } from "next/navigation";
import { createRazorpayOrder } from "@/lib/payment/razorpay";

/**
 * ProductDialog - A component for displaying and interacting with product details
 *
 * @param {Object} props - Component props
 * @param {Object} props.product - The product data to display
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Function} props.onClose - Function to call when closing the dialog
 * @param {string} props.userId - The ID of the current user
 * @param {Object} props.userData - The current user's data
 * @param {string} props.userType - The type of user (customer or business)
 * @param {Function} props.onEditProduct - Function to call when editing a product
 * @param {Function} props.onDeleteProduct - Function to call when deleting a product
 */
export default function ProductDialog({
  product,
  isOpen,
  onClose,
  userId,
  userData,
  userType = "customer",
  onEditProduct,
  onDeleteProduct,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editableProduct, setEditableProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { addToCart } = useCart();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize editable product when product changes or editing mode is toggled
  useEffect(() => {
    if (product && isEditing) {
      setEditableProduct({
        ...product,
      });
    }
  }, [product, isEditing]);

  // Calculate total price based on quantity
  const totalPrice = () => (product?.price * quantity).toFixed(2);

  // Extract business ID from URL path and query parameters
  const extractBusinessId = () => {
    // First try to extract from query parameters
    const userParam = searchParams.get("user");
    if (userParam) {
      console.log("Extracted business ID from query param:", userParam);
      return userParam;
    }

    // Extract from pathname segments if no query parameter is found
    if (pathname) {
      console.log("Current pathname:", pathname);

      const segments = pathname.split("/");

      // Check if in business profile path
      if (pathname.includes("/business-profile/")) {
        const businessId = segments[segments.length - 1];
        console.log(
          "Extracted business ID from business profile path:",
          businessId
        );
        return businessId;
      }
    }

    // If nothing found, use product's businessId or default
    const fallbackId = product?.businessId || "default-business";
    console.log("Using fallback business ID:", fallbackId);
    return fallbackId;
  };

  // Fetch business name from Firestore using business ID
  const fetchBusinessName = async (businessId) => {
    if (!businessId) return "Store";

    try {
      const businessDoc = await getDoc(doc(db, "users", businessId));
      if (businessDoc.exists()) {
        const businessData = businessDoc.data();
        return businessData.businessName || businessData.name || "Store";
      }
      return "Store";
    } catch (error) {
      console.error("Error fetching business name:", error);
      return "Store";
    }
  };

  // Open Razorpay payment gateway
  const openRazorpayPaymentGateway = (order, keyId, amount) => {
    console.log("Opening Razorpay payment gateway with order:", order);

    if (typeof window === "undefined" || !window.Razorpay) {
      console.error("Razorpay script not loaded");
      toast.error("Payment gateway is not available. Please try again later.");
      return;
    }

    const options = {
      key: keyId,
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      name: userData?.name || "Thikana Portal",
      description: `Purchase: ${product?.name}`,
      order_id: order.orderId,
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
      const productRef = doc(db, "products", productId);
      await updateDoc(productRef, {
        quantity: newQuantity,
        updatedAt: new Date(),
      });
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
      // Extract business ID for the order
      const businessId = product.businessId || extractBusinessId();
      console.log(
        `Starting buy now for product ${product.id} with price ${totalPrice()} from business ${businessId}`
      );
      const order = await createRazorpayOrder(businessId, totalPrice());

      if (!order || !order.orderId) {
        console.error("Invalid order response:", order);
        throw new Error("Failed to create order. Please try again.");
      }

      openRazorpayPaymentGateway(order, order.keyId, totalPrice());
    } catch (error) {
      console.error("Error handling buy now:", error);
      toast.error(
        error.message || "Failed to process payment. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle "Add to Cart" button click
  const handleAddToCart = async () => {
    if (!auth.currentUser) {
      toast.error("Please log in to make a purchase");
      return;
    }

    console.log("Starting handleAddToCart");

    if (product.quantity < quantity) {
      toast.error(`Sorry, only ${product.quantity} items available`);
      return;
    }

    try {
      // Get business ID from URL or use the one from product
      const businessId = extractBusinessId();
      console.log("Business ID for cart:", businessId);

      // Fetch the business name if not already in the product
      let businessName = product.businessName;
      if (!businessName) {
        console.log("No businessName in product, fetching from Firestore...");
        businessName = await fetchBusinessName(businessId);
        console.log("Fetched business name:", businessName);
      } else {
        console.log("Using business name from product:", businessName);
      }

      // Make sure the product has all required properties
      const productToAdd = {
        id: product.id,
        name: product.name || "Unknown Product",
        price: product.price || 0,
        imageUrl: product.imageUrl || null,
        quantity: quantity,
        businessId: businessId,
        businessName: businessName,
      };

      console.log("Adding to cart:", {
        product: productToAdd,
        quantity,
        businessId,
        businessName,
      });

      // Check if addToCart function is available
      if (typeof addToCart !== "function") {
        console.error("addToCart is not a function", addToCart);
        toast.error(
          "Cart functionality is not available. Please try again later."
        );
        return;
      }

      // Let the CartContext use auth.currentUser.uid
      const result = await addToCart(productToAdd, quantity, businessId);

      if (result) {
        toast.success("Product added to cart!");
        onClose();
      } else {
        toast.error("Failed to add to cart");
      }
    } catch (error) {
      console.error("Error in handleAddToCart:", error);
      toast.error("Error: " + (error.message || "Unknown error"));
    }
  };

  // Handle saving product changes
  const handleSaveChanges = async () => {
    if (!editableProduct) return;

    setIsLoading(true);
    try {
      await updateProduct(userId, editableProduct, imageFile);
      toast.success("Product updated successfully");
      setIsEditing(false);
      // If onEditProduct callback exists, call it to refresh the product list
      if (typeof onEditProduct === 'function') {
        onEditProduct(editableProduct);
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductDeleted = (productId) => {
    // Update your product list state to remove the deleted product
    setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
    // Other cleanup as needed
  };

  // Handle product update
  const handleProductUpdated = (updatedProduct) => {
    if (typeof onEditProduct === 'function') {
      onEditProduct(updatedProduct);
    }
    setIsEditing(false);
    toast.success("Product updated successfully");
  };

  // Handle product deletion
  const handleDeleteProduct = async () => {
    if (!product || !product.id) return;
    
    setIsDeleting(true);
    try {
      await deleteProduct(userId, product.id, product.imageUrl);
      toast.success("Product deleted successfully");
      // If onDeleteProduct callback exists, call it to update the UI
      if (typeof onDeleteProduct === 'function') {
        onDeleteProduct(product.id);
      }
      onClose();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    // Reset quantity when dialog opens with a new product
    if (isOpen) {
      setQuantity(1);
      setIsEditing(false);
    }
  }, [isOpen, product]);

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[425px]" 
        aria-describedby="product-dialog-description"
      >
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            {!isEditing ? (
              <>
                {product.name}
                {userType === "business" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsEditing(true)}
                      title="Edit product"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDeleteProduct}
                      disabled={isDeleting}
                      title="Delete product"
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full">
                <Label htmlFor="product-name" className="mb-1">
                  Product Name
                </Label>
                <Input
                  id="product-name"
                  value={editableProduct?.name || ""}
                  onChange={(e) =>
                    setEditableProduct({
                      ...editableProduct,
                      name: e.target.value,
                    })
                  }
                  className="w-full"
                />
              </div>
            )}
          </DialogTitle>
          <DialogDescription id="product-dialog-description">
            {isEditing
              ? "Edit product details"
              : "View product details and manage your purchase"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 justify-center w-full">
          <div className="w-full flex items-center justify-center">
            {isEditing ? (
              <div className="w-full">
                <Label htmlFor="product-image" className="mb-1">
                  Product Image
                </Label>
                <Input
                  id="product-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="mb-2"
                />
                {(product.imageUrl || imageFile) && (
                  <div className="mt-2 relative w-full h-48">
                    <Image
                      src={
                        imageFile
                          ? URL.createObjectURL(imageFile)
                          : product.imageUrl || "/placeholder-product.jpg"
                      }
                      alt="Product image preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
            ) : (
              <Image
                src={product.imageUrl || "/placeholder-product.jpg"}
                alt={`${product.name} product image`}
                width={300}
                height={300}
                className="w-full h-64 object-contain rounded"
                priority
              />
            )}
          </div>

          {!isEditing ? (
            <>
              <p className="text-lg text-gray-800">
                {product.description || "No description available"}
              </p>
              <p className="font-bold text-xl text-center">₹{totalPrice()}</p>

              {/* Stock information */}
              <p className="text-sm text-gray-500 text-center">
                {product.quantity > 0
                  ? `${product.quantity} in stock`
                  : "Out of stock"}
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="product-description">Description</Label>
                <Input
                  id="product-description"
                  value={editableProduct?.description || ""}
                  onChange={(e) =>
                    setEditableProduct({
                      ...editableProduct,
                      description: e.target.value,
                    })
                  }
                  className="w-full mb-2"
                />
              </div>
              <div>
                <Label htmlFor="product-price">Price (₹)</Label>
                <Input
                  id="product-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editableProduct?.price || 0}
                  onChange={(e) =>
                    setEditableProduct({
                      ...editableProduct,
                      price: parseFloat(e.target.value),
                    })
                  }
                  className="w-full mb-2"
                />
              </div>
              <div>
                <Label htmlFor="product-quantity">Quantity in Stock</Label>
                <Input
                  id="product-quantity"
                  type="number"
                  min="0"
                  value={editableProduct?.quantity || 0}
                  onChange={(e) =>
                    setEditableProduct({
                      ...editableProduct,
                      quantity: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Quantity section for customers */}
          {userType === "customer" && product.quantity > 0 && !isEditing && (
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

          {/* Buttons section - only shown to customers, not businesses */}
          {userType === "customer" && !isEditing && (
            <div className="flex gap-4">
              {product.quantity === 0 ? (
                <Button className="flex-1 w-full" disabled>
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

          {/* For business users in edit mode, show save button */}
          {userType === "business" && isEditing && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditing(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveChanges}
                disabled={isLoading}
              >
                {isLoading ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}