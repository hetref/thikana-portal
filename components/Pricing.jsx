"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, CreditCard } from "lucide-react";
import { HoverBorderGradient } from './ui/hover-border-gradient'

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

const Feature = ({ children }) => {
  return (
    <motion.li variants={fadeIn} className="flex gap-x-3">
      <Check className="h-6 w-5 flex-none text-purple-500" />
      {children}
    </motion.li>
  );
};

const Pricing = () => {
  const [isMonthly, setIsMonthly] = useState(true);

  const pricingTiers = [
    {
      name: "Basic",
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
        "Custom Form Builder"
      ],
      cta: {
        text: "Get Started",
      },
    },
    {
      name: "Standard",
      price: {
        monthly: 199,
        yearly: 1990,
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
      },
      highlight: true,
    },
    {
      name: "Premium",
      price: {
        monthly: 299,
        yearly: 2990,
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
      },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24">
      <motion.div
        className="mx-auto max-w-4xl text-center"
        initial="initial"
        animate="animate"
        variants={fadeIn}
      >
        <div className="text-sm mb-4 flex justify-center">
          <HoverBorderGradient>
            <span className="px-4">
              Pricing
            </span>
          </HoverBorderGradient>
        </div>
        
        <h1 className="mt-8 text-4xl font-bold tracking-tight text-black dark:text-white sm:text-6xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
          Choose the plan that's right for you
        </p>

        <div className="mt-10 flex items-center justify-center gap-x-6">
          <motion.div
            className="flex items-center gap-4 rounded-lg p-1 bg-gray-100 dark:bg-black/40 ring-1 ring-purple-500/20"
            whileHover={{ scale: 1.02 }}
          >
            <button
              onClick={() => setIsMonthly(true)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                isMonthly 
                  ? "bg-white dark:bg-black text-black dark:text-white" 
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsMonthly(false)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                !isMonthly 
                  ? "bg-white dark:bg-black text-black dark:text-white" 
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              Yearly
            </button>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="isolate mx-auto mt-16 grid max-w-sm grid-cols-1 gap-8 lg:mx-auto lg:max-w-5xl lg:grid-cols-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {pricingTiers.map((tier) => (
          <motion.div
            key={tier.name}
            variants={fadeIn}
            whileHover={{ scale: 1.02 }}
            className={`rounded-xl p-6 ring-1 h-fit transition-colors duration-300 ${
              tier.highlight
                ? "ring-2 ring-purple-500 bg-white dark:bg-black relative"
                : "ring-gray-200 dark:ring-gray-800 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-black/80"
            }`}
          >
            {tier.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1 text-sm font-semibold text-white shadow-lg">
                  Popular
                </div>
              </div>
            )}
            <h3 className="text-lg font-semibold leading-8 text-purple-600 dark:text-purple-400">
              {tier.name}
            </h3>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {tier.description}
            </p>
            <p className="mt-6 flex items-baseline gap-x-1">
              <span className="text-4xl font-bold tracking-tight text-black dark:text-white">
                ₹{isMonthly ? tier.price.monthly : tier.price.yearly}
              </span>
              <span className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                /{isMonthly ? "month" : "year"}
              </span>
            </p>
            <motion.ul
              variants={container}
              initial="hidden"
              animate="show"
              className="mt-8 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300"
            >
              {tier.features.map((feature, featureIndex) => (
                <Feature key={featureIndex}>{feature}</Feature>
              ))}
            </motion.ul>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-8"
            >
              <Button
                className={`w-full ${
                  tier.highlight
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
                    : "bg-white dark:bg-black text-black dark:text-white ring-1 ring-gray-200 dark:ring-gray-800 hover:bg-gray-50 dark:hover:bg-black/80"
                }`}
                variant={tier.highlight ? "default" : "outline"}
              >
                {tier.cta.text}
              </Button>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="mt-16 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <CreditCard className="h-5 w-5 text-purple-500" />
        <span className="text-sm">No credit card required</span>
      </motion.div>
    </div>
  );
};

export default Pricing; 