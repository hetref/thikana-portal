"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, CreditCard } from "lucide-react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { onAuthStateChanged } from "firebase/auth";
import { ThemeProvider } from "next-themes";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function PricingPage() {
  const [isMonthly, setIsMonthly] = useState(true);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userId = user.uid;
        const userDocRef = doc(db, "users", userId);

        const unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (userDoc) => {
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log("CURRENT PLAN: ", userData.plan);
              setCurrentPlan(userData.plan || "free"); // Assuming 'currentPlan' is the field name
              setUserData(userData);
            } else {
              toast.error("User not found");
            }
          },
          (error) => {
            console.error("Error fetching current plan:", error);
          }
        );

        // Cleanup snapshot listener on unmount
        return () => unsubscribeSnapshot();
      } else {
        console.log("No user is signed in.");
      }
    });

    // Cleanup auth state listener on unmount
    return () => unsubscribe();
  }, []);

  const pricingTiers = [
    {
      name: "Basic",
      id: "basic",
      price: {
        monthly: 0,
        yearly: 0,
      },
      description: "For small events",
      features: [
        "Basic features",
        "Access to limited templates",
        "Email support",
        "Event scheduling",
        "Basic analytics",
        "Custom Form Builder",
      ],
      cta: {
        text: "Get Started",
        onClick: async () => {
          console.log("FREE");
          const isBusinessUser = await checkUser();
          console.log("ISBUSINESUSER", isBusinessUser);
          if (!isBusinessUser) {
            toast.error(
              "You need to be a business user to use Thikana as a business"
            );
          } else {
            if (
              currentPlan !== "free" &&
              userData.subscriptionStatus === "active"
            ) {
              toast(
                "You are already subscribed to a plan, cancel the plan to use the free plan"
              );
            } else {
              toast("You are on a free plan now.");
            }
          }
        },
      },
    },
    {
      name: "Standard",
      id: "standard",
      price: {
        monthly: 259,
        yearly: 2590,
      },
      description: "For growing organizations",
      features: [
        "All basic features",
        "Access to advanced templates",
        "Priority email support",
        "Custom branding",
        "Team collaboration tools",
        "Event reporting and analytics",
      ],
      cta: {
        text: "Get Started",
        onClick: async () => {
          console.log("STANDARD");
          const isBusinessUser = await checkUser();
          console.log("ISBUSINESUSER", isBusinessUser);
          if (!isBusinessUser) {
            toast.error(
              "You need to be a business user to use Thikana as a business"
            );
          } else {
            if (
              (currentPlan === "standard" || currentPlan === "premium") &&
              userData.subscriptionStatus === "active"
            ) {
              toast(
                "You are already subscribed to a plan, cancel the plan first."
              );
              return;
            }
            await handleSubscription("standard", "plan_PmSImdYVH1GUs7");
          }
        },
      },
      highlight: true,
    },
    {
      name: "Premium",
      id: "premium",
      price: {
        monthly: 499,
        yearly: 4990,
      },
      description: "For large institutions",
      features: [
        "All Standard features",
        "Dedicated account manager",
        "Custom integrations",
        "Priority support (24/7)",
        "Advanced event insights",
        "API access for automation",
      ],
      cta: {
        text: "Get Started",
        onClick: async () => {
          console.log("PREMIUM");
          const isBusinessUser = await checkUser();
          console.log("ISBUSINESUSER", isBusinessUser);
          if (!isBusinessUser) {
            toast.error(
              "You need to be a business user to use Thikana as a business"
            );
          } else {
            if (
              (currentPlan === "standard" || currentPlan === "premium") &&
              userData.subscriptionStatus === "active"
            ) {
              toast(
                "You are already subscribed to a plan, cancel the plan first."
              );
              return;
            }
            await handleSubscription("premium", "plan_PmSJ7n2ECeDM5H");
          }
        },
      },
    },
  ];

  const checkUser = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user is signed in.");
        return false;
      }
      const userId = user.uid;
      // const response = await fetch(`/api/user/${userId}`);
      // const userData = await response.json();
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.role === "business";
      } else {
        toast.error("User not found");
        return false;
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      return false;
    }
  };

  const handleSubscription = async (selectedPlan, planId) => {
    try {
      const response = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          userId: auth.currentUser.uid,
        }),
      });

      const subscription = await response.json();
      console.log("SUBSCRIPTION", subscription);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        // key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: subscription.id,
        name: "Thikana",
        description:
          "Get all the paid plan features in your subscription. Glad to have you with us.",
        handler: async function (response) {
          // Handle successful payment
          const paymentData = {
            subscription_id: response.razorpay_subscription_id,
            payment_id: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          };
          console.log("RESPONSE", response);

          await fetch("/api/save-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...paymentData,
              plan: selectedPlan,
              userId: auth.currentUser.uid,
            }),
          });
          toast.success("Subscription successful!");
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
          color: "#000000",
        },
      };

      // Ensure Razorpay is loaded
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Subscription Error:", error);
    }
  };

  const handleCancelSubscription = async (subscriptionId) => {
    const confirm = window.confirm("Are you sure you want to cancel?");
    if (!confirm) {
      toast("Don't Worry, We haven't cancelled your subscription!");
      return;
    }
    if (!userData.subscriptionStatus === "active" || !subscriptionId) {
      toast.error("You are not subscribed to any plan");
      return;
    }
    try {
      // Implement the logic to cancel the subscription
      // Send the subscriptionId from the userData to the body of the request
      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      console.log(`Canceling subscription for plan: ${subscriptionId}`);

      if (response.status === 200) {
        toast.success("Subscription Cancelled Successfully");
      } else {
        toast.error("Oops! Some things got wrong. Please try again!");
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="min-h-screen transition-colors duration-300 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24">
          <motion.div
            className="mx-auto max-w-4xl text-center"
            initial="initial"
            animate="animate"
            variants={fadeIn}
          >
            <motion.button
              className="relative inline-flex h-9 w-48 overflow-hidden rounded-lg p-[2px] focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] opacity-100" />
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-lg bg-white px-3 py-1 text-sm font-medium text-black backdrop-blur-3xl">
                PRICING
              </span>
            </motion.button>
            <h1 className="mt-8 text-4xl font-bold tracking-tight text-black sm:text-6xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Choose the plan that's right for you
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <motion.div
                className="flex items-center gap-4 rounded-lg p-1 bg-gray-100/40 ring-1 ring-purple-500/20"
                whileHover={{ scale: 1.02 }}
              >
                <button
                  onClick={() => setIsMonthly(true)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    isMonthly ? "bg-white text-black" : "text-gray-600"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsMonthly(false)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    !isMonthly ? "bg-white text-black" : "text-gray-600"
                  }`}
                >
                  Yearly
                </button>
              </motion.div>
            </div>
          </motion.div>
          <motion.div
            className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {pricingTiers.map((tier) => (
              <motion.div
                key={tier.name}
                variants={fadeIn}
                whileHover={{ scale: 1.02 }}
                className={`rounded-xl p-8 ring-1 h-fit transition-colors duration-300 ${
                  tier.highlight
                    ? "ring-2 ring-purple-500 bg-white relative"
                    : "ring-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1 text-sm font-semibold text-white shadow-lg">
                      Popular
                    </div>
                  </div>
                )}
                <h3 className="text-lg font-semibold leading-8 text-purple-600">
                  {tier.name}
                </h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {tier.description}
                </p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-black">
                    ₹{isMonthly ? tier.price.monthly : tier.price.yearly}
                  </span>
                  <span className="text-sm font-semibold leading-6 text-gray-600">
                    /{isMonthly ? "month" : "year"}
                  </span>
                </p>
                <motion.ul
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="mt-8 space-y-3 text-sm leading-6 text-gray-600"
                >
                  {tier.features.map((feature, featureIndex) => (
                    <Feature key={featureIndex}>{feature}</Feature>
                  ))}
                </motion.ul>
                {currentPlan && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-8"
                  >
                    <Button
                      className={`w-full ${
                        tier.highlight
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
                          : "bg-white text-black ring-1 ring-gray-200 hover:bg-gray-50"
                      }`}
                      variant={tier.highlight ? "default" : "outline"}
                      onClick={tier.cta.onClick}
                      disabled={
                        currentPlan === tier.id &&
                        userData.subscriptionStatus === "active"
                      }
                    >
                      {currentPlan === tier.id &&
                      userData.subscriptionStatus === "active"
                        ? "Current Plan"
                        : tier.cta.text}
                    </Button>
                    {currentPlan === tier.id &&
                      userData.subscriptionStatus === "active" && (
                        <Button
                          className="mt-2 w-full bg-red-500 text-white hover:bg-red-600"
                          onClick={() =>
                            handleCancelSubscription(userData.subscriptionId)
                          }
                        >
                          Cancel Subscription
                        </Button>
                      )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
          <motion.div
            className="mt-16 flex items-center justify-center gap-2 text-gray-500"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <CreditCard className="h-5 w-5 text-purple-500" />
            <span className="text-sm">No credit card required</span>
          </motion.div>
        </div>
      </div>
    </ThemeProvider>
  );
}

function Feature({ children }) {
  return (
    <motion.li variants={fadeIn} className="flex gap-x-3">
      <Check className="h-6 w-5 flex-none text-purple-500" />
      {children}
    </motion.li>
  );
}
