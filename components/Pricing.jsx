"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const Pricing = () => {
  const [isMonthly, setIsMonthly] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isDark } = useTheme();

  // Ensure component is mounted before rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

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
        "Custom Form Builder",
      ],
      cta: {
        text: "Get Started",
      },
    },
    {
      name: "Standard",
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
      },
      highlight: true,
    },
    {
      name: "Premium",
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
      },
    },
  ];

  return (
    <div className={`${isDark ? 'bg-gradient-to-t from-blue-950 via-black to-black' : 'bg-[#F5F5F5]'} transition-colors duration-1000`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4 tracking-tight`}>
            Plans and Pricing
          </h1>
          <p className={`text-lg ${isDark ? 'text-zinc-400' : 'text-gray-600'} mb-6`}>
          Choose the plan that's right for you
          </p>

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
              onClick={() => setIsMonthly(true)}
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
              onClick={() => setIsMonthly(false)}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1400px] mx-auto">
          {pricingTiers.map((tier, index) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border ${tier.highlight
                ? isDark
                  ? 'border-white/10 bg-white/[0.02] scale-[1.02] shadow-xl'
                  : 'border-gray-900/10 bg-gray-900/[0.02] scale-[1.02] shadow-xl'
                : isDark
                  ? 'border-white/[0.08] hover:border-white/10'
                  : 'border-gray-900/[0.08] hover:border-gray-900/10'
                } p-6 transition-all duration-300`}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="relative">
                    <div className={`absolute inset-0 ${isDark ? 'bg-white/10' : 'bg-gray-900/10'} rounded-full blur-[2px]`} />
                    <div className={`relative px-4 py-1.5 ${isDark ? 'bg-white/[0.03]' : 'bg-gray-900/[0.03]'} backdrop-blur-sm rounded-full border ${isDark ? 'border-white/10' : 'border-gray-900/10'}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block w-1 h-1 rounded-full ${isDark ? 'bg-white/60' : 'bg-gray-900/60'} animate-pulse`} />
                        <span className={`text-xs font-medium ${isDark ? 'text-white/80' : 'text-gray-900/80'}`}>Most Popular</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-xl font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>{tier.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    ₹{isMonthly ? tier.price.monthly : tier.price.yearly}
                  </span>
                  {tier.price.monthly !== 0 || tier.price.yearly !== 0 ? (
                    <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                      /{isMonthly ? 'month' : 'year'}
                    </span>
                  ) : null}
                </div>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'} mt-4`}>{tier.description}</p>
              </div>

              <div className="space-y-3 mb-6">
                {tier.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Check className={`h-4 w-4 ${isDark ? 'text-white/30' : 'text-gray-900/30'}`} />
                    <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${tier.highlight
                  ? isDark
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'bg-gray-900 text-white hover:bg-gray-900/90'
                  : isDark
                    ? 'border border-white/10 text-white bg-transparent hover:bg-white/[0.03]'
                    : 'border border-gray-900/10 text-gray-900 bg-transparent hover:bg-gray-900/[0.03]'
                  }`}
                variant={tier.highlight ? "default" : "outline"}
              >
                {tier.cta.text}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
