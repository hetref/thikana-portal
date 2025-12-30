"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Minus, Plus, ShoppingCart, ArrowLeft, XCircle, Store, Package } from "lucide-react";
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
        isSystemOrder: order?.isSystemOrder || false,
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
              type: "both",
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
      }

      // Send notification to business owner
      try {
        const businessDoc = await getDoc(doc(db, "businesses", businessId));

        if (businessDoc.exists()) {
          const businessData = businessDoc.data();
          const businessOwnerId = businessData.userId;

          if (businessOwnerId) {
            const totalAmount = calculateBusinessTotal(businessId).toFixed(2);
            const itemsCount = productDetails.length;

            const userDoc = await getDoc(
              doc(db, "users", auth.currentUser.uid)
            );
            const userName = userDoc.exists()
              ? userDoc.data().name ||
              userDoc.data().displayName ||
              "A customer"
              : "A customer";

            await sendNotificationToUser(businessOwnerId, {
              title: "New Order Received",
              message: `${userName} has placed an order for ${itemsCount} ${itemsCount === 1 ? "item" : "items"} worth ₹${totalAmount}. The order is pending and needs your attention. Check your orders tab for details.`,
              type: "order_update",
              link: "/profile?tab=orders",
              email: false,
              whatsapp: false,
            });

            console.log("Order notification sent to business owner");
          }
        }
      } catch (error) {
        console.error("Error sending notification to business:", error);
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
      amount: amount * 100,
      currency: "INR",
      name: "Thikana Portal",
      description: `Purchase from ${businessName || "Store"}`,
      order_id: order.orderId,
      handler: async function (response) {
        try {
          await updateFirestoreAfterPayment(
            businessId,
            order.orderId,
            products,
            order
          );

          setPaymentDetails({
            orderId: order.orderId,
            amount: amount,
            businessName: businessName,
          });
          setSuccessDialogOpen(true);

          // Refresh cart
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
        color: "#C5521A",
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
      await removeFromCart(businessId, productId);
      toast.success("Item removed from cart");

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
      const amount = calculateBusinessTotal(businessId);
      console.log(
        `Starting checkout for business ${businessId} with amount ${amount}`
      );

      toast.loading("Creating your order...");

      const order = await createRazorpayOrder(businessId, amount);

      if (!order || !order.orderId) {
        throw new Error(
          "Failed to create order. Invalid response from server."
        );
      }

      toast.dismiss();

      if (order.isSystemOrder) {
        toast.success("Order created successfully using Thikana payment system");
        console.log("System order created for business:", businessId);
      } else {
        toast.success("Order created successfully");
        console.log("Business-specific order created");
      }

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-orange-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex items-center justify-between">
            <Link
              href="/portal"
              className="group flex items-center text-gray-600 hover:text-orange-600 transition-colors duration-200"
            >
              <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="font-medium">Back to Portal</span>
            </Link>
            <div className="flex items-center space-x-3">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
              <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
              {itemCount > 0 && (
                <span className="bg-orange-600 text-white text-sm font-medium px-2 py-1 rounded-full">
                  {itemCount} items
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {isLoadingCart ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-12 w-12 border-4 border-orange-600 border-t-transparent rounded-full"></div>
          </div>
        ) : !userCart || Object.keys(userCart).length === 0 ? (
          <div className="max-w-md mx-auto">
            <Card className="overflow-hidden border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 px-8">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                  <ShoppingCart className="h-10 w-10 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                  Your cart is empty
                </h2>
                <p className="text-gray-600 mb-8 text-center leading-relaxed">
                  Discover amazing products from local businesses and start filling your cart
                </p>
                <Button
                  asChild
                  className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  <Link href="/portal">
                    <Package className="h-4 w-4 mr-2" />
                    Start Shopping
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Cart Items */}
            <div className="xl:col-span-3 space-y-6">
              {Object.entries(userCart).map(([businessId, business]) => {
                if (
                  !business?.products ||
                  Object.keys(business?.products).length === 0
                ) {
                  return null;
                }

                const businessName = business?.businessName || "Store";

                return (
                  <Card key={businessId} className="overflow-hidden border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                    {/* Business Header */}
                    <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Store className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold">{businessName}</CardTitle>
                            <CardDescription className="text-orange-100 font-medium">
                              {Object.keys(business.products).length} {Object.keys(business.products).length === 1 ? "item" : "items"}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ₹{calculateBusinessTotal(businessId).toFixed(2)}
                          </div>
                          <div className="text-sm text-orange-100">Subtotal</div>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Products List */}
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-100">
                        {Object.entries(business?.products || {}).map(
                          ([productId, product]) => {
                            if (!product) return null;

                            return (
                              <div
                                key={productId}
                                className="p-6 hover:bg-orange-50 transition-colors duration-200"
                              >
                                <div className="flex items-center gap-6">
                                  {/* Product Image */}
                                  <div className="relative w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                                    <Image
                                      src={product?.imageUrl || "/placeholder-product.jpg"}
                                      alt={product?.name || "Product"}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>

                                  {/* Product Details */}
                                  <div className="flex-grow min-w-0">
                                    <h4 className="font-bold text-lg text-gray-900 mb-1 truncate">
                                      {product?.name || "Product"}
                                    </h4>
                                    <p className="text-orange-600 font-semibold text-lg">
                                      ₹{product?.price?.toFixed(2) || "0.00"}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">per item</p>
                                  </div>

                                  {/* Quantity Controls */}
                                  <div className="flex items-center space-x-3 bg-gray-50 rounded-xl p-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 rounded-lg border-gray-300 hover:bg-orange-100 hover:border-orange-300"
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

                                    <span className="w-10 text-center font-bold text-lg">
                                      {product?.quantity || 0}
                                    </span>

                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 rounded-lg border-gray-300 hover:bg-orange-100 hover:border-orange-300"
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

                                  {/* Price and Remove */}
                                  <div className="text-right min-w-[120px]">
                                    <p className="font-bold text-xl text-gray-900 mb-2">
                                      ₹{((product?.price || 0) * (product?.quantity || 0)).toFixed(2)}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                      onClick={() => handleRemoveItem(businessId, productId)}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </CardContent>

                    {/* Checkout Footer */}
                    <CardFooter className="bg-gradient-to-r from-gray-50 to-orange-50 p-6">
                      <div className="flex justify-between items-center w-full">
                        <div className="text-left">
                          <p className="text-sm text-gray-600 mb-1">Business Total</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ₹{calculateBusinessTotal(businessId).toFixed(2)}
                          </p>
                        </div>
                        <Button
                          onClick={() =>
                            handleBusinessCheckout(
                              businessId,
                              businessName,
                              business.products
                            )
                          }
                          className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                          Checkout from {businessName}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {/* Order Summary Sidebar */}
            <div className="xl:col-span-1">
              <Card className="sticky top-24 border-0 shadow-2xl bg-white/90 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
                  <CardTitle className="text-xl font-bold flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Order Summary
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  {Object.entries(userCart).map(([businessId, business]) => {
                    if (
                      !business?.products ||
                      Object.keys(business?.products).length === 0
                    ) {
                      return null;
                    }

                    const businessTotal = calculateBusinessTotal(businessId);

                    return (
                      <div key={businessId} className="flex justify-between items-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                        <div>
                          <p className="font-semibold text-gray-900 truncate max-w-[150px]">
                            {business?.businessName || "Store"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {Object.keys(business.products).length} items
                          </p>
                        </div>
                        <p className="font-bold text-xl text-orange-600">
                          ₹{businessTotal.toFixed(2)}
                        </p>
                      </div>
                    );
                  })}

                  <div className="border-t-2 border-orange-200 pt-4">
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-orange-100 uppercase tracking-wide">
                          Grand Total
                        </p>
                        <p className="text-sm text-orange-200">
                          {Object.keys(userCart).length} businesses
                        </p>
                      </div>
                      <p className="text-3xl font-bold">
                        ₹
                        {Object.keys(userCart)
                          .reduce(
                            (total, businessId) =>
                              total + calculateBusinessTotal(businessId),
                            0
                          )
                          .toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="bg-gradient-to-r from-orange-50 to-orange-100 p-6">
                  <div className="w-full">
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                      <p className="text-sm text-amber-800 font-medium text-center">
                        💡 Each business processes orders separately for the best service experience
                      </p>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}

        {/* Payment Success Dialog */}
        <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl bg-white">
            <DialogHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white"
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
              </div>
              <DialogTitle className="text-3xl font-bold text-gray-900">
                Payment Successful!
              </DialogTitle>
              <DialogDescription className="text-lg text-gray-600">
                Your order has been placed successfully and is being processed
              </DialogDescription>
            </DialogHeader>

            {paymentDetails && (
              <div className="space-y-4 py-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <p className="text-sm font-medium text-gray-500 mb-1">Order ID</p>
                  <p className="font-bold text-green-700 text-lg">{paymentDetails.orderId}</p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm font-medium text-gray-500 mb-1">Amount Paid</p>
                  <p className="font-bold text-blue-700 text-2xl">
                    ₹{paymentDetails.amount.toFixed(2)}
                  </p>
                </div>

                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                  <p className="text-sm font-medium text-gray-500 mb-1">Merchant</p>
                  <p className="font-bold text-orange-700 text-lg">{paymentDetails.businessName}</p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    You will receive an email confirmation shortly. The merchant will process your order and update you on the delivery status.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="pt-6">
              <Button
                className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
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