"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, CreditCard, Cpu, Sparkles } from "lucide-react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { onAuthStateChanged } from "firebase/auth";
import { Spotlight } from "@/components/ui/spotlight-new";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export default function PricingPage() {
  const { isDark } = useTheme();
  const [isMonthly, setIsMonthly] = useState(true);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [userData, setUserData] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Debug: Log the current state whenever it changes
  useEffect(() => {
    console.log('isMonthly state changed to:', isMonthly);
  }, [isMonthly]);

  // Ensure component is mounted before rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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
              setCurrentPlan(userData.plan || "free");
              setUserData(userData);
            } else {
              toast.error("User not found");
            }
          },
          (error) => {
            console.error("Error fetching current plan:", error);
          }
        );

        return () => unsubscribeSnapshot();
      } else {
        console.log("No user is signed in.");
      }
    });

    return () => unsubscribe();
  }, []);

  // Don't render until mounted to prevent hydration issues
  // if (!mounted) {
  //   return null;
  // }

  const tableData = [
    {
      feature: "Basic features",
      basic: true,
      standard: true,
      premium: true,
    },
    {
      feature: "Access to limited templates",
      basic: true,
      standard: true,
      premium: true,
    },
    {
      feature: "Email support",
      basic: true,
      standard: true,
      premium: true,
    },
    {
      feature: "Event scheduling",
      basic: true,
      standard: true,
      premium: true,
    },
    {
      feature: "Basic analytics",
      basic: true,
      standard: true,
      premium: true,
    },
    {
      feature: "Custom Form Builder",
      basic: true,
      standard: true,
      premium: true,
    },
    {
      feature: "Access to advanced templates",
      basic: false,
      standard: true,
      premium: true,
    },
    {
      feature: "Priority email support",
      basic: false,
      standard: true,
      premium: true,
    },
    {
      feature: "Custom branding",
      basic: false,
      standard: true,
      premium: true,
    },
    {
      feature: "Team collaboration tools",
      basic: false,
      standard: true,
      premium: true,
    },
    {
      feature: "Event reporting and analytics",
      basic: false,
      standard: true,
      premium: true,
    },
    {
      feature: "Dedicated account manager",
      basic: false,
      standard: false,
      premium: true,
    },
    {
      feature: "Custom integrations",
      basic: false,
      standard: false,
      premium: true,
    },
    {
      feature: "Priority support (24/7)",
      basic: false,
      standard: false,
      premium: true,
    },
    {
      feature: "Advanced event insights",
      basic: false,
      standard: false,
      premium: true,
    },
    {
      feature: "API access for automation",
      basic: false,
      standard: false,
      premium: true,
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
        subscription_id: subscription.id,
        name: "Thikana",
        description:
          "Get all the paid plan features in your subscription. Glad to have you with us.",
        handler: async function (response) {
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

  const handleBasicClick = async () => {
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
  };

  const handleStandardClick = async () => {
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
  };

  const handlePremiumClick = async () => {
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
  };

  const getButtonText = (planId) => {
    if (currentPlan === planId && userData?.subscriptionStatus === "active") {
      return "Current Plan";
    }
    return "Get Started";
  };

  const isCurrentPlan = (planId) => {
    return currentPlan === planId && userData?.subscriptionStatus === "active";
  };

    return (
      <>
      <div className="absolute inset-0 overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 z-0">
        <Spotlight />
      </div>
    </div>
      <div className={`relative z-10 min-h-screen transition-colors duration-1000 ${
        isDark 
          ? 'bg-gradient-to-t from-blue-950 via-black to-black' 
          : 'bg-gradient-to-t from-blue-50 via-white to-gray-100'
      }`}>
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8 py-24">
          <motion.div
            className="mx-auto max-w-4xl text-center"
            initial="initial"
            animate="animate"
            variants={fadeIn}
          >
            <h1 className={`mt-8 text-4xl font-bold tracking-tight sm:text-6xl ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Plans and Pricing
            </h1>
            <p className={`mt-6 text-lg leading-8 ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Choose the plan that's right for you
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <div className={`inline-flex items-center ${isDark ? 'bg-white/[0.03]' : 'bg-gray-900/[0.03]'} rounded-full p-1`}>
                <button
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${isMonthly
                    ? isDark 
                      ? 'bg-white/[0.07] text-white'
                      : 'bg-gray-900/[0.07] text-gray-900'
                    : isDark
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-gray-500 hover:text-gray-900'
                    }`}
                  onClick={() => {
                    console.log('Monthly clicked, current state:', isMonthly);
                    setIsMonthly(true);
                    console.log('setIsMonthly(true) called');
                  }}
                >
                  Monthly
                </button>
                <button
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${!isMonthly
                    ? isDark 
                      ? 'bg-white/[0.07] text-white'
                      : 'bg-gray-900/[0.07] text-gray-900'
                    : isDark
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-gray-500 hover:text-gray-900'
                    }`}
                  onClick={() => {
                    console.log('Yearly clicked, current state:', isMonthly);
                    setIsMonthly(false);
                    console.log('setIsMonthly(false) called');
                  }}
                >
                  Yearly
                </button>
              </div>
              {/* Debug button
              <button 
                onClick={() => {
                  console.log('Debug: Current isMonthly =', isMonthly);
                  setIsMonthly(!isMonthly);
                  console.log('Debug: Toggled to', !isMonthly);
                }}
                className="ml-4 px-4 py-2 bg-red-500 text-white rounded"
              >
                Debug Toggle
              </button> */}
            </div>
          </motion.div>

          <motion.div
            className="mt-16"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <div className="relative w-full overflow-auto lg:overflow-visible">
              <table className="w-[200vw] border-separate border-spacing-x-3 md:w-full">
                <thead className={`${isDark ? 'bg-black' : 'bg-white'} sticky top-0 z-10`}>
                  <tr className="*:py-4 *:text-left *:font-medium">
                    <th className="lg:w-2/5"></th>
                    <th className="space-y-3">
                      <span className={`block ${isDark ? 'text-white' : 'text-gray-900'}`}>Basic</span>
                      <span className={`block text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                         ₹{isMonthly ? "0" : "0"}
                       </span>
                       <Button
                         asChild
                         variant="outline"
                         size="sm"
                         onClick={handleBasicClick}
                         disabled={isCurrentPlan("free")}
                         className={`${
                           isDark 
                             ? 'border-gray-600 text-white hover:bg-white/10 bg-transparent' 
                             : 'border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent'
                         }`}
                       >
                         <span>{getButtonText("free")}</span>
                       </Button>
                     </th>
                     <th className={`${
                       isDark ? 'bg-white/5 border-b border-gray-800' : 'bg-black/5 border-b border-black/20'
                     } rounded-t-lg space-y-3 px-4`}>
                       <span className={`block ${isDark ? 'text-white' : 'text-gray-900'}`}>Standard</span>
                       <span className={`block text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                         ₹{isMonthly ? "259" : "2590"}
                       </span>
                       <Button
                         asChild
                         size="sm"
                         onClick={handleStandardClick}
                         disabled={isCurrentPlan("standard")}
                         className={`${
                           isDark 
                             ? 'bg-white text-black hover:bg-gray-200' 
                             : 'bg-black text-white hover:bg-gray-800'
                         }`}
                       >
                         <span>{getButtonText("standard")}</span>
                       </Button>
                     </th>
                     <th className="space-y-3">
                       <span className={`block ${isDark ? 'text-white' : 'text-gray-900'}`}>Premium</span>
                       <span className={`block text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                         ₹{isMonthly ? "499" : "4990"}
                       </span>
                       <Button
                         asChild
                         variant="outline"
                         size="sm"
                         onClick={handlePremiumClick}
                         disabled={isCurrentPlan("premium")}
                         className={`${
                           isDark 
                             ? 'border-gray-600 text-white hover:bg-white/10 bg-transparent' 
                             : 'border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent'
                         }`}
                       >
                         <span>{getButtonText("premium")}</span>
                       </Button>
                     </th>
                   </tr>
                 </thead>
                 <tbody className="text-caption text-sm">
                   <tr className="*:py-3">
                     <td className={`flex items-center gap-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                       <Cpu className="size-4" />
                       <span>Features</span>
                     </td>
                     <td></td>
                     <td className={`${isDark ? 'bg-white/5 border-b border-gray-800' : 'bg-black/5 border-b border-black/20'} rounded-t-lg space-y-3 px-4`}></td>
                     <td></td>
                   </tr>
                   {tableData.map((row, index) => (
                     <tr key={index} className={`*:border-b *:py-3 ${isDark ? '*:border-gray-800' : '*:border-gray-200'}`}>
                       <td className={isDark ? 'text-gray-300' : 'text-gray-700'}>{row.feature}</td>
                       <td>
                         {row.basic === true ? (
                           <Check className="size-4 text-green-500" />
                         ) : row.basic === false ? (
                           <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>—</span>
                         ) : (
                           row.basic
                         )}
                       </td>
                       <td className={`${isDark ? 'bg-white/5 border-b border-gray-800' : 'bg-black/5 border-b border-black/20'} rounded-t-lg space-y-3 px-4`}>
                         <div className={`-mb-3 border-b py-3 ${isDark ? 'border-gray-800' : 'border-black/20'}`}>
                           {row.standard === true ? (
                             <Check className="size-4 text-green-500" />
                           ) : row.standard === false ? (
                             <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>—</span>
                           ) : (
                             row.standard
                           )}
                         </div>
                       </td>
                       <td>
                         {row.premium === true ? (
                           <Check className="size-4 text-green-500" />
                         ) : row.premium === false ? (
                           <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>—</span>
                         ) : (
                           row.premium
                         )}
                       </td>
                     </tr>
                   ))}
                   <tr className="*:py-6">
                     <td></td>
                     <td></td>
                     <td className={`${isDark ? 'bg-white/5 border-b border-gray-800' : 'bg-black/5 border-b border-black/20'} rounded-b-lg space-y-3 px-4`}></td>
                     <td></td>
                   </tr>
                 </tbody>
               </table>
             </div>
           </motion.div>

           <motion.div
             className="mt-16 flex items-center justify-center gap-2 text-gray-400"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.5 }}
           >
             <CreditCard className="h-5 w-5 text-purple-500" />
             <span className="text-sm">No credit card required</span>
           </motion.div>
         </div>
       </div>
     </>
   );
 }