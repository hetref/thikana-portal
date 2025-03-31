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
import { Edit, Minus, Plus, ShoppingCart, Save } from "lucide-react";
import toast from "react-hot-toast";
import { recordPurchase, updateProduct } from "@/lib/inventory-operations";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/components/CartContext";
import { auth } from "@/lib/firebase";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

// Shared function to create a Razorpay order that can be used by both components
const createRazorpayOrder = async (userId, amount) => {
  console.log(`Creating Razorpay order for user ${userId} with amount ${amount}`);
  
  try {
    // Use relative URL to ensure it works correctly with Next.js routing
    const apiUrl = '/api/create-product-order';
    console.log("Calling API endpoint:", apiUrl);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, amount }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error ${response.status}: ${response.statusText}`, errorText);
      throw new Error(`Failed to create order: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Order created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error in createRazorpayOrder:", error);
    throw error;
  }
};

function ProductDialog({ 
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
  const [isEditing, setIsEditing] = useState(false);
  const [editableProduct, setEditableProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);
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
    // URLs might be like:
    // 1. /business-profile/[businessId]
    // 2. /[username]?user=[businessId]  (e.g., /foodsters-83246?user=FBAVPWoEqtaHi27WOSbmBJagPCO2)
    
    // First try to extract from query parameters
    const userParam = searchParams.get('user');
    if (userParam) {
      console.log("Extracted business ID from query param:", userParam);
      return userParam;
    }
    
    // Extract from pathname segments if no query parameter is found
    if (pathname) {
      console.log("Current pathname:", pathname);
      
      const segments = pathname.split('/');
      
      // Check if in business profile path
      if (pathname.includes('/business-profile/')) {
        const businessId = segments[segments.length - 1];
        console.log("Extracted business ID from business profile path:", businessId);
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
      const businessDoc = await getDoc(doc(db, 'users', businessId));
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
    
    if (typeof window === 'undefined' || !window.Razorpay) {
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
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        quantity: newQuantity,
        updatedAt: new Date()
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
      console.log(`Starting buy now for product ${product.id} with price ${totalPrice()}`);
      const order = await createRazorpayOrder(userId, totalPrice());
      
      if (!order || !order.orderId) {
        console.error("Invalid order response:", order);
        throw new Error("Failed to create order. Please try again.");
      }
      
      openRazorpayPaymentGateway(order, order.keyId, totalPrice());
    } catch (error) {
      console.error("Error handling buy now:", error);
      toast.error(error.message || "Failed to process payment. Please try again.");
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
        businessName: businessName
      };
      
      console.log("Adding to cart:", {
        product: productToAdd, 
        quantity, 
        businessId,
        businessName
      });
      
      // Check if addToCart function is available
      if (typeof addToCart !== 'function') {
        console.error('addToCart is not a function', addToCart);
        toast.error("Cart functionality is not available. Please try again later.");
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
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product. Please try again.");
    } finally {
      setIsLoading(false);
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
      <DialogContent className="sm:max-w-[425px]" aria-describedby="product-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            {!isEditing ? (
              <>
                {product.name}
                {userType === 'business' && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : (
              <div className="w-full">
                <Label htmlFor="product-name" className="mb-1">Product Name</Label>
                <Input 
                  id="product-name"
                  value={editableProduct?.name || ''}
                  onChange={(e) => setEditableProduct({...editableProduct, name: e.target.value})}
                  className="w-full"
                />
              </div>
            )}
          </DialogTitle>
          <DialogDescription id="product-dialog-description">
            {isEditing ? "Edit product details" : "View product details and manage your purchase"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 justify-center w-full">
          <div className="w-full flex items-center justify-center">
            {isEditing ? (
              <div className="w-full">
                <Label htmlFor="product-image" className="mb-1">Product Image</Label>
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
                      src={imageFile ? URL.createObjectURL(imageFile) : product.imageUrl || "/placeholder-product.jpg"}
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
              <p className="text-lg text-gray-800">{product.description || "No description available"}</p>
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
                  value={editableProduct?.description || ''}
                  onChange={(e) => setEditableProduct({...editableProduct, description: e.target.value})}
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
                  onChange={(e) => setEditableProduct({...editableProduct, price: parseFloat(e.target.value)})}
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
                  onChange={(e) => setEditableProduct({...editableProduct, quantity: parseInt(e.target.value, 10)})}
                  className="w-full"
                />
              </div>
            </div>
          )}
          
          {/* Quantity section for customers */}
          {userType === 'customer' && product.quantity > 0 && !isEditing && (
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
          {userType === 'customer' && !isEditing && (
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
          
          {/* For business users in edit mode, show save button */}
          {userType === 'business' && isEditing && (
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
                {isLoading ? "Saving..." : (
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

function CartIcon({ userData }) {
  const { 
    cart = {}, 
    isCartOpen = false, 
    setIsCartOpen = () => {}, 
    isLoading = false, 
    removeFromCart = () => false, 
    updateQuantity = () => false,
    getCartTotal = () => 0,
    getCartTotalItems = () => 0,
    getCartItems = () => ({})
  } = useCart();
  
  const [userCart, setUserCart] = useState({});
  const [isLoadingCart, setIsLoadingCart] = useState(true);
  const router = useRouter();
  
  // Get the user-specific cart when cart changes
  useEffect(() => {
    async function fetchUserCart() {
      if (!auth.currentUser) {
        setUserCart({});
        setIsLoadingCart(false);
        return;
      }
    
      setIsLoadingCart(true);
      
      try {
        // Fetch the cart items - let the getCartItems function use auth.currentUser.uid
        console.log("Fetching cart items for current user");
        const userCartItems = await getCartItems();
        console.log("Fetched user cart items:", userCartItems);
        setUserCart(userCartItems);
      } catch (error) {
        console.error("Error fetching user cart:", error);
        setUserCart({});
      } finally {
        setIsLoadingCart(false);
      }
    }
    
    fetchUserCart();
  }, [cart, getCartItems]);
  
  // Calculate total items in cart
  const calculateTotalItems = () => {
    if (!userCart) return 0;
    
    console.log("Calculating total items in cart:", userCart);
    
    return Object.values(userCart).reduce((total, business) => {
      if (!business || !business.products) return total;
      
      return total + Object.values(business.products).reduce(
        (businessTotal, product) => businessTotal + (product?.quantity || 0), 
        0
      );
    }, 0);
  };
  
  const itemCount = calculateTotalItems();
  console.log("Total items in cart:", itemCount);

  // Calculate total for a business
  const calculateBusinessTotal = (businessId) => {
    if (!userCart || !userCart[businessId] || !userCart[businessId].products) return 0;
    
    return Object.values(userCart[businessId].products).reduce(
      (total, product) => total + ((product?.price || 0) * (product?.quantity || 0)),
      0
    );
  };

  // Open Razorpay payment gateway for cart items
  const openCartRazorpayPaymentGateway = (order, keyId, amount, specificBusinessId = null) => {
    console.log("Opening Razorpay payment gateway with order:", order);
    
    if (typeof window === 'undefined' || !window.Razorpay) {
      console.error("Razorpay script not loaded");
      toast.error("Payment gateway is not available. Please try again later.");
      return;
    }
    
    const options = {
      key: keyId,
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      name: userData?.name || "Thikana Portal",
      description: specificBusinessId 
        ? `Purchase from ${userCart[specificBusinessId]?.businessName || "Store"}`
        : "Purchase from multiple stores",
      order_id: order.orderId,
      handler: async function (response) {
        try {
          // Close the cart sheet
          setIsCartOpen(false);
          
          // TODO: Process successful payment and clear cart
          toast.success("Payment successful!");
          
          // Redirect based on whether it was a specific business or all items
          if (specificBusinessId) {
            router.push(`/order-confirmation?businessId=${specificBusinessId}`);
          } else {
            router.push('/order-confirmation');
          }
        } catch (error) {
          console.error("Error processing payment:", error);
          toast.error("Failed to complete purchase. Please contact support.");
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
  
  const handleRemoveItem = async (businessId, productId) => {
    if (!auth.currentUser) {
      toast.error("Please log in to manage your cart");
      return;
    }
    
    try {
      // Let removeFromCart use auth.currentUser.uid
      await removeFromCart(businessId, productId);
      toast.success("Item removed from cart");
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    }
  };

  const handleUpdateQuantity = async (businessId, productId, newQuantity) => {
    if (!auth.currentUser) {
      toast.error("Please log in to manage your cart");
      return;
    }
    
    if (newQuantity < 1) {
      handleRemoveItem(businessId, productId);
      return;
    }
    
    try {
      // Let updateQuantity use auth.currentUser.uid
      await updateQuantity(businessId, productId, newQuantity);
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity");
    }
  };

  // Function to handle checkout for a specific business
  const handleBusinessCheckout = async (businessId, businessName) => {
    if (!userCart[businessId] || Object.keys(userCart[businessId]?.products || {}).length === 0) {
      toast.error("No items in this business cart");
      return;
    }
    
    if (!auth.currentUser) {
      toast.error("Please log in to checkout");
      return;
    }
    
    try {
      // Calculate the total amount for this business
      const amount = calculateBusinessTotal(businessId);
      console.log(`Starting checkout for business ${businessId} with amount ${amount}`);
      
      // Create Razorpay order using the shared function
      const order = await createRazorpayOrder(auth.currentUser.uid, amount);
      
      // Open Razorpay payment gateway
      openCartRazorpayPaymentGateway(order, order.keyId, amount, businessId);
    } catch (error) {
      console.error("Error processing checkout:", error);
      toast.error("Failed to process payment");
    }
  };

  // Function to handle checkout for all items
  const handleCheckoutAll = async () => {
    if (itemCount === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    if (!auth.currentUser) {
      toast.error("Please log in to checkout");
      return;
    }
    
    try {
      // Calculate total across all businesses
      const totalAmount = Object.keys(userCart).reduce(
        (total, businessId) => total + calculateBusinessTotal(businessId), 
        0
      );
      
      console.log(`Starting checkout for all items with amount ${totalAmount}`);
      
      // Create Razorpay order using the shared function
      const order = await createRazorpayOrder(auth.currentUser.uid, totalAmount);
      
      // Open Razorpay payment gateway
      openCartRazorpayPaymentGateway(order, order.keyId, totalAmount);
    } catch (error) {
      console.error("Error processing checkout:", error);
      toast.error("Failed to process payment");
    }
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative"
        >
          <ShoppingCart className="h-5 w-5" />
          {!isLoading && itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto" aria-describedby="cart-sheet-description">
        <div className="flex flex-col gap-6 py-4">
          <SheetHeader>
            <SheetTitle>Your Cart</SheetTitle>
            <SheetDescription id="cart-sheet-description">
              Review and manage your cart items before checkout
            </SheetDescription>
          </SheetHeader>
          
          {/* Debug buttons section */}
          <div className="border rounded p-3 bg-gray-50 dark:bg-gray-800 mb-4">
            <h3 className="text-sm font-bold mb-2">Debug Tools</h3>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  if (window.testDatabaseWrite && auth.currentUser) {
                    window.testDatabaseWrite(auth.currentUser.uid);
                    toast.success("Test write initiated - check console");
                  } else {
                    toast.error("Test function not available or no current user");
                  }
                }}
              >
                Test DB Write
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={async () => {
                  try {
                    setIsLoadingCart(true);
                    console.log("Manual cart refresh for current user");
                    
                    // Use the getCartItems function from context
                    const userCartItems = await getCartItems();
                    console.log("Fetched user cart items:", userCartItems);
                    
                    if (Object.keys(userCartItems).length > 0) {
                      toast.success("Cart data found - check console");
                      setUserCart(userCartItems);
                    } else {
                      console.log("No cart data found for current user:", auth.currentUser.uid);
                      toast.error("No cart data found");
                      setUserCart({});
                    }
                  } catch (error) {
                    console.error("Error fetching cart data:", error);
                    toast.error("Error: " + error.message);
                  } finally {
                    setIsLoadingCart(false);
                  }
                }}
              >
                Refresh Cart
              </Button>
            </div>
          </div>
          
          {isLoadingCart ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (!userCart || Object.keys(userCart).length === 0) ? (
            <div className="flex flex-col items-center justify-center py-10">
              <ShoppingCart className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <>
              {/* Render businesses and their products */}
              {Object.entries(userCart).map(([businessId, business]) => {
                // Skip if products is missing or empty
                if (!business?.products || Object.keys(business?.products).length === 0) {
                  return null;
                }
                
                const businessName = business?.businessName || "Store";
                
                return (
                  <div key={businessId} className="border rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-lg mb-1">
                      {businessName}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">
                      Business ID: {businessId}
                    </p>
                    
                    {/* Render products for this business */}
                    <div className="space-y-4">
                      {Object.entries(business?.products || {}).map(([productId, product]) => {
                        // Skip if product is missing or invalid
                        if (!product) return null;
                        
                        return (
                          <div key={productId} className="flex items-center gap-3 border-b pb-3">
                            {/* Product image */}
                            <div className="relative w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                              <Image
                                src={product?.imageUrl || "/placeholder-product.jpg"}
                                alt={product?.name || "Product"}
                                fill
                                className="object-cover"
                              />
                            </div>
                            
                            {/* Product details */}
                            <div className="flex-grow">
                              <h4 className="font-medium">{product?.name || "Product"}</h4>
                              <p className="text-gray-600">₹{product?.price?.toFixed(2) || "0.00"}</p>
                            </div>
                            
                            {/* Quantity controls */}
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleUpdateQuantity(businessId, productId, (product?.quantity || 0) - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              
                              <span className="w-8 text-center">{product?.quantity || 0}</span>
                              
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleUpdateQuantity(businessId, productId, (product?.quantity || 0) + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            {/* Total price */}
                            <div className="text-right w-20">
                              <p className="font-medium">₹{((product?.price || 0) * (product?.quantity || 0)).toFixed(2)}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 p-0 h-6"
                                onClick={() => handleRemoveItem(businessId, productId)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Business subtotal and checkout button */}
                    <div className="mt-3 pt-2 border-t">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Subtotal:</span>
                        <span className="font-bold">₹{calculateBusinessTotal(businessId).toFixed(2)}</span>
                      </div>
                      <Button 
                        className="w-full"
                        size="sm"
                        onClick={() => handleBusinessCheckout(businessId, businessName)}
                      >
                        Checkout {businessName}
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {/* Cart total */}
              <div className="border-t border-b py-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-xl font-bold">₹{
                    // Calculate total across all businesses
                    Object.keys(userCart).reduce((total, businessId) => 
                      total + calculateBusinessTotal(businessId), 0).toFixed(2)
                  }</span>
                </div>
              </div>
              
              {/* Checkout all button */}
              <Button 
                className="w-full mt-2"
                onClick={handleCheckoutAll}
                disabled={itemCount === 0}
              >
                Checkout All Items
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { ProductDialog, CartIcon };