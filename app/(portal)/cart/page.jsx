"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Minus, Plus, ShoppingCart, ArrowLeft, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useCart } from "@/components/CartContext";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { createRazorpayOrder } from "@/lib/payment/razorpay";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import Link from "next/link";
import { CartProvider } from "@/components/CartContext";
import { sendNotificationToUser } from "@/lib/notifications";

// Create a client component wrapper that provides CartContext
function CartPageContent() {
  const {
    cart = {},
    isLoading = false,
    removeFromCart = () => false,
    updateQuantity = () => false,
    clearBusinessItems = () => false,
  } = useCart();

  const [userCart, setUserCart] = useState({});
  const [isLoadingCart, setIsLoadingCart] = useState(true);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const router = useRouter();

  // Get the user-specific cart when page loads
  useEffect(() => {
    async function fetchUserCart() {
      if (!auth.currentUser) {
        setUserCart({});
        setIsLoadingCart(false);
        return;
      }

      setIsLoadingCart(true);

      try {
        console.log("Fetching cart items for current user");

        // Get all business carts for the user
        const cartsCollectionRef = collection(
          db,
          "users",
          auth.currentUser.uid,
          "carts"
        );
        const cartsSnapshot = await getDocs(cartsCollectionRef);

        if (cartsSnapshot.empty) {
          console.log("No carts found for user", auth.currentUser.uid);
          setUserCart({});
          setIsLoadingCart(false);
          return;
        }

        // Transform the data into the expected format
        const formattedCart = {};

        // Process each business cart
        for (const businessDoc of cartsSnapshot.docs) {
          const businessId = businessDoc.id;
          const businessData = businessDoc.data();
          console.log("Business ID:", businessDoc.data());

          // Get products for this business
          const productsCollectionRef = collection(
            db,
            "users",
            auth.currentUser.uid,
            "carts",
            businessId,
            "products"
          );
          const productsSnapshot = await getDocs(productsCollectionRef);

          const products = {};
          productsSnapshot.forEach((productDoc) => {
            products[productDoc.id] = productDoc.data();
          });

          formattedCart[businessId] = {
            businessId,
            businessName: businessData.businessName || "Store",
            products,
          };
        }

        console.log("Formatted cart data:", formattedCart);
        setUserCart(formattedCart);
      } catch (error) {
        console.error("Error fetching user cart:", error);
        setUserCart({});
      } finally {
        setIsLoadingCart(false);
      }
    }

    fetchUserCart();
  }, []);

  // Calculate total items in cart
  const calculateTotalItems = () => {
    if (!userCart) return 0;

    return Object.values(userCart).reduce((total, business) => {
      if (!business || !business.products) return total;

      return (
        total +
        Object.values(business.products).reduce(
          (businessTotal, product) => businessTotal + (product?.quantity || 0),
          0
        )
      );
    }, 0);
  };

  const itemCount = calculateTotalItems();

  // Calculate total for a business
  const calculateBusinessTotal = (businessId) => {
    if (!userCart || !userCart[businessId] || !userCart[businessId].products)
      return 0;

    return Object.values(userCart[businessId].products).reduce(
      (total, product) =>
        total + (product?.price || 0) * (product?.quantity || 0),
      0
    );
  };

  // Update Firestore after successful payment
  const updateFirestoreAfterPayment = async (businessId, orderId, products, order = null) => {
    if (!auth.currentUser) return;

    try {
      const timestamp = serverTimestamp();
      const orderTimestamp = Date.now().toString();

      // Transform products to include detailed information
      const productDetails = Object.entries(products).map(
        ([productId, product]) => ({
          productId,
          productName: product.name || "Unknown Product",
          amount: product.price || 0,
          quantity: product.quantity || 1,
          imageUrl: product.imageUrl || "",
        })
      );

      // Prepare order metadata
      const orderMetadata = {
        products: productDetails,
        orderId: orderId,
        userId: auth.currentUser.uid,
        timestamp: timestamp,
        amount: calculateBusinessTotal(businessId),
        status: "pending",
        statusUpdatedAt: timestamp,
        businessId: businessId,
        businessName: userCart[businessId]?.businessName || "Store",
        isSystemOrder: order?.isSystemOrder || false, // Track if it's a system order
        paymentMethod: "razorpay",
        currency: "INR",
      };

      // Update business orders with "pending" status
      await setDoc(
        doc(db, "businesses", businessId, "orders", orderTimestamp),
        orderMetadata
      );

      // Update user orders with "pending" status
      await setDoc(
        doc(db, "users", auth.currentUser.uid, "orders", orderTimestamp),
        {
          ...orderMetadata,
          businessName: userCart[businessId]?.businessName || "Store",
        }
      );

      // Get business and user information for email notifications
      let businessOwnerEmail = null;
      let businessOwnerName = null;
      let customerEmail = auth.currentUser.email;
      let customerName = null;

      try {
        // Get business owner's information
        const businessDoc = await getDoc(doc(db, "businesses", businessId));
        if (businessDoc.exists()) {
          const businessData = businessDoc.data();
          const businessOwnerId = businessData.adminId;
          console.log("BUSINESSOWNERID", businessOwnerId, businessData)

          if (businessOwnerId) {
            const businessOwnerDoc = await getDoc(doc(db, "users", businessOwnerId));
            if (businessOwnerDoc.exists()) {
              const businessOwnerData = businessOwnerDoc.data();
              console.log("BUSINESSOWNERDATA", businessOwnerData)
              businessOwnerEmail = businessOwnerData.email;
              businessOwnerName = businessOwnerData.name || businessOwnerData.displayName;
            }
          }
        }

        // Get customer information
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          customerName = userData.name || userData.displayName || auth.currentUser.displayName;
        }
      } catch (error) {
        console.error("Error fetching user information for emails:", error);
      }

      // Send order emails using Gmail SMTP
      try {
        if (customerEmail || businessOwnerEmail) {
          const emailResponse = await fetch("/api/send-order-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "both", // Send to both customer and business
              customerEmail: customerEmail,
              businessEmail: businessOwnerEmail,
              customerName: customerName || "Valued Customer",
              businessName: userCart[businessId]?.businessName || "Store",
              orderId: orderId,
              amount: calculateBusinessTotal(businessId),
              products: productDetails,
              customerId: auth.currentUser.uid,
            }),
          });

          if (emailResponse.ok) {
            const emailResult = await emailResponse.json();
            console.log("Order emails sent successfully:", emailResult);
          } else {
            const errorText = await emailResponse.text();
            console.warn("Failed to send order emails:", errorText);
          }
        }
      } catch (emailError) {
        console.error("Error sending order emails:", emailError);
        // Don't fail the order if email fails
      }

      // Send notification to business owner (existing functionality)
      try {
        // Get business owner's userId
        const businessDoc = await getDoc(doc(db, "businesses", businessId));

        if (businessDoc.exists()) {
          const businessData = businessDoc.data();
          const businessOwnerId = businessData.userId;

          if (businessOwnerId) {
            // Calculate total amount and items count
            const totalAmount = calculateBusinessTotal(businessId).toFixed(2);
            const itemsCount = productDetails.length;

            // Get user info for the notification
            const userDoc = await getDoc(
              doc(db, "users", auth.currentUser.uid)
            );
            const userName = userDoc.exists()
              ? userDoc.data().name ||
                userDoc.data().displayName ||
                "A customer"
              : "A customer";

            // Send notification to business owner
            await sendNotificationToUser(businessOwnerId, {
              title: "New Order Received",
              message: `${userName} has placed an order for ${itemsCount} ${itemsCount === 1 ? "item" : "items"} worth ₹${totalAmount}. The order is pending and needs your attention. Check your orders tab for details.`,
              type: "order_update",
              link: "/profile?tab=orders",
              email: false, // Disabled since we're sending custom emails
              whatsapp: false, // Set to true if you want WhatsApp notifications
            });

            console.log("Order notification sent to business owner");
          }
        }
      } catch (error) {
        console.error("Error sending notification to business:", error);
        // Don't fail the entire transaction if notification fails
      }

      // Clear the business items from cart
      await clearBusinessItems(businessId);

      console.log("Database updated successfully after payment with pending status");
    } catch (error) {
      console.error("Error updating Firestore after payment:", error);
      toast.error(
        "Order recorded but there was an issue updating your history"
      );
    }
  };

  // Open Razorpay payment gateway for cart items
  const openRazorpayPaymentGateway = (
    order,
    keyId,
    amount,
    businessId,
    businessName,
    products
  ) => {
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
      name: "Thikana Portal",
      description: `Purchase from ${businessName || "Store"}`,
      order_id: order.orderId,
      handler: async function (response) {
        try {
          // Update Firestore after successful payment
          await updateFirestoreAfterPayment(
            businessId,
            order.orderId,
            products,
            order // Pass the order object to updateFirestoreAfterPayment
          );

          // Show success dialog
          setPaymentDetails({
            orderId: order.orderId,
            amount: amount,
            businessName: businessName,
          });
          setSuccessDialogOpen(true);

          // Refresh cart
          // Direct Firestore fetching for updated cart
          const cartsCollectionRef = collection(
            db,
            "users",
            auth.currentUser.uid,
            "carts"
          );
          const cartsSnapshot = await getDocs(cartsCollectionRef);

          const formattedCart = {};

          for (const businessDoc of cartsSnapshot.docs) {
            const businessId = businessDoc.id;
            const businessData = businessDoc.data();

            const productsCollectionRef = collection(
              db,
              "users",
              auth.currentUser.uid,
              "carts",
              businessId,
              "products"
            );
            const productsSnapshot = await getDocs(productsCollectionRef);

            const products = {};
            productsSnapshot.forEach((productDoc) => {
              products[productDoc.id] = productDoc.data();
            });

            formattedCart[businessId] = {
              businessId,
              businessName: businessData.businessName || "Store",
              products,
            };
          }

          setUserCart(formattedCart);
        } catch (error) {
          console.error("Error processing payment:", error);
          toast.error("Failed to complete purchase. Please contact support.");
        }
      },
      prefill: {
        name: auth.currentUser?.displayName || "",
        email: auth.currentUser?.email || "",
        contact: "",
      },
      theme: {
        color: "#3399cc",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // Handle removing an item from the cart
  const handleRemoveItem = async (businessId, productId) => {
    if (!auth.currentUser) {
      toast.error("Please log in to manage your cart");
      return;
    }

    try {
      // Remove the item
      await removeFromCart(businessId, productId);
      toast.success("Item removed from cart");

      // Update the cart state by direct Firestore fetching
      const productsCollectionRef = collection(
        db,
        "users",
        auth.currentUser.uid,
        "carts",
        businessId,
        "products"
      );
      const productsSnapshot = await getDocs(productsCollectionRef);

      const updatedCart = { ...userCart };

      if (productsSnapshot.empty) {
        // No products left for this business, remove it from cart
        delete updatedCart[businessId];
      } else {
        const products = {};
        productsSnapshot.forEach((productDoc) => {
          products[productDoc.id] = productDoc.data();
        });

        if (Object.keys(products).length > 0) {
          updatedCart[businessId] = {
            ...updatedCart[businessId],
            products: products,
          };
        } else {
          delete updatedCart[businessId];
        }
      }

      setUserCart(updatedCart);
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    }
  };

  // Handle updating item quantity in the cart
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
      await updateQuantity(businessId, productId, newQuantity);

      // Update the cart state by direct Firestore fetching for just this product
      // This approach is more efficient than refetching the entire cart
      const productDocRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "carts",
        businessId,
        "products",
        productId
      );

      const updatedCart = { ...userCart };
      if (
        updatedCart[businessId] &&
        updatedCart[businessId].products &&
        updatedCart[businessId].products[productId]
      ) {
        updatedCart[businessId].products[productId] = {
          ...updatedCart[businessId].products[productId],
          quantity: newQuantity,
        };
        setUserCart(updatedCart);
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity");
    }
  };

  // Function to handle checkout for a specific business
  const handleBusinessCheckout = async (businessId, businessName, products) => {
    if (
      !userCart[businessId] ||
      Object.keys(userCart[businessId]?.products || {}).length === 0
    ) {
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
      console.log(
        `Starting checkout for business ${businessId} with amount ${amount}`
      );

      toast.loading("Creating your order...");

      // Create Razorpay order using the shared function
      const order = await createRazorpayOrder(businessId, amount);

      if (!order || !order.orderId) {
        throw new Error(
          "Failed to create order. Invalid response from server."
        );
      }

      toast.dismiss();
      
      // Show different messages based on order type
      if (order.isSystemOrder) {
        toast.success("Order created successfully using Thikana payment system");
        console.log("System order created for business:", businessId);
      } else {
        toast.success("Order created successfully");
        console.log("Business-specific order created");
      }

      // Open Razorpay payment gateway
      openRazorpayPaymentGateway(
        order,
        order.keyId,
        amount,
        businessId,
        businessName,
        products
      );
    } catch (error) {
      toast.dismiss();
      console.error("Error processing checkout:", error);
      toast.error(
        error.message || "Failed to process payment. Please try again."
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center mb-8">
        <Link
          href="/portal"
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          <span>Back to Portal</span>
        </Link>
        <h1 className="text-2xl font-bold ml-auto">Your Shopping Cart</h1>
      </div>

      {isLoadingCart ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : !userCart || Object.keys(userCart).length === 0 ? (
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-2xl font-medium text-gray-700 mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-500 mb-6">
              Start shopping to add items to your cart
            </p>
            <Button asChild>
              <Link href="/portal">Start Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(userCart).map(([businessId, business]) => {
              // Skip if products is missing or empty
              if (
                !business?.products ||
                Object.keys(business?.products).length === 0
              ) {
                return null;
              }

              const businessName = business?.businessName || "Store";

              return (
                <Card key={businessId} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <div className="flex justify-between items-center">
                      <CardTitle>{businessName}</CardTitle>
                      <CardDescription className="text-sm font-medium">
                        {Object.keys(business.products).length}{" "}
                        {Object.keys(business.products).length === 1
                          ? "item"
                          : "items"}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y">
                      {Object.entries(business?.products || {}).map(
                        ([productId, product]) => {
                          // Skip if product is missing or invalid
                          if (!product) return null;

                          return (
                            <li
                              key={productId}
                              className="p-4 flex items-center gap-4"
                            >
                              {/* Product image */}
                              <div className="relative w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                <Image
                                  src={
                                    product?.imageUrl ||
                                    "/placeholder-product.jpg"
                                  }
                                  alt={product?.name || "Product"}
                                  fill
                                  className="object-cover"
                                />
                              </div>

                              {/* Product details */}
                              <div className="flex-grow">
                                <h4 className="font-medium text-lg">
                                  {product?.name || "Product"}
                                </h4>
                                <p className="text-gray-600">
                                  ₹{product?.price?.toFixed(2) || "0.00"} per
                                  item
                                </p>
                              </div>

                              {/* Quantity controls */}
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      businessId,
                                      productId,
                                      (product?.quantity || 0) - 1
                                    )
                                  }
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>

                                <span className="w-8 text-center font-medium">
                                  {product?.quantity || 0}
                                </span>

                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      businessId,
                                      productId,
                                      (product?.quantity || 0) + 1
                                    )
                                  }
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Total price */}
                              <div className="text-right min-w-[100px]">
                                <p className="font-medium">
                                  ₹
                                  {(
                                    (product?.price || 0) *
                                    (product?.quantity || 0)
                                  ).toFixed(2)}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 p-0 h-6 mt-1"
                                  onClick={() =>
                                    handleRemoveItem(businessId, productId)
                                  }
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  <span>Remove</span>
                                </Button>
                              </div>
                            </li>
                          );
                        }
                      )}
                    </ul>
                  </CardContent>
                  <CardFooter className="bg-gray-50 flex justify-between items-center">
                    <div>
                      <span className="text-gray-700 font-semibold">
                        Subtotal:
                      </span>
                      <span className="ml-2 font-bold text-lg">
                        ₹{calculateBusinessTotal(businessId).toFixed(2)}
                      </span>
                    </div>
                    <Button
                      onClick={() =>
                        handleBusinessCheckout(
                          businessId,
                          businessName,
                          business.products
                        )
                      }
                    >
                      Checkout from {businessName}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(userCart).map(([businessId, business]) => {
                  if (
                    !business?.products ||
                    Object.keys(business?.products).length === 0
                  ) {
                    return null;
                  }

                  const businessTotal = calculateBusinessTotal(businessId);

                  return (
                    <div key={businessId} className="flex justify-between">
                      <span className="text-gray-600 truncate max-w-[70%]">
                        {business?.businessName || "Store"}
                      </span>
                      <span className="font-medium">
                        ₹{businessTotal.toFixed(2)}
                      </span>
                    </div>
                  );
                })}

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>
                      ₹
                      {Object.keys(userCart)
                        .reduce(
                          (total, businessId) =>
                            total + calculateBusinessTotal(businessId),
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <p className="text-sm text-gray-500">
                  Please checkout each business separately as we process orders
                  by individual sellers.
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {/* Payment Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Payment Successful!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your order has been placed successfully
            </DialogDescription>
          </DialogHeader>
          {paymentDetails && (
            <div className="space-y-4 py-4">
              <div className="border-b pb-3">
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-medium">{paymentDetails.orderId}</p>
              </div>
              <div className="border-b pb-3">
                <p className="text-sm text-gray-500">Amount Paid</p>
                <p className="font-medium">
                  ₹{paymentDetails.amount.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Merchant</p>
                <p className="font-medium">{paymentDetails.businessName}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                setSuccessDialogOpen(false);
                router.push("/portal");
              }}
            >
              Continue Shopping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export a page component that wraps CartPageContent with CartProvider
export default function CartPage() {
  return (
    <CartProvider>
      <CartPageContent />
    </CartProvider>
  );
}
