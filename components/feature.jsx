"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserRound, PencilLine, ShoppingCart, Bot, ShieldCheck, Star, Mail } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const BounceCard = ({ className, children }) => {
  const { isDark } = useTheme();
  
  return (
    <motion.div
      whileHover={{ scale: 0.98, rotate: "-0.5deg" }}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl ${
        isDark 
          ? 'bg-gray-900 border-gray-700 hover:shadow-gray-900/20' 
          : 'bg-white border-gray-200 hover:shadow-gray-200/20'
      } border p-6 transition-all duration-300 hover:shadow-lg ${className}`}
    >
      {children}
    </motion.div>
  );
};

const CardTitle = ({ children, icon }) => {
  const { isDark } = useTheme();
  
  // Clone the icon element and add appropriate color class
  const themedIcon = React.cloneElement(icon, {
    className: `${isDark ? 'text-white' : 'text-gray-700'} ${icon.props.className?.replace('text-muted-foreground', '') || ''}`
  });
  
  return (
    <div className="flex items-center gap-3 mb-3">
      {themedIcon}
      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{children}</h3>
    </div>
  );
};

export function AnimatedFeatureSection({
  features = [
    {
      id: "business-profile-management",
      title: "Business Profile Management",
      description: "Create and manage customized business profiles with ease.",
      icon: <UserRound size={20} className="text-muted-foreground" />,
      className: "md:col-span-2 md:row-span-2",
      imagePath: "/placeholder.svg?height=929&width=1207",
    },
    {
      id: "post-creation",
      title: "Post Creation",
      description: "Share updates, promotions, and announcements to engage your audience.",
      icon: <PencilLine size={20} className="text-muted-foreground" />,
      className: "md:col-span-1",
      imagePath: "/placeholder.svg?height=929&width=1207",
    },
    {
      id: "free-e-commerce-websites",
      title: "Free E-Commerce Websites",
      description: "Build free e-commerce sites with built-in SEO integration.",
      icon: <ShoppingCart size={20} className="text-muted-foreground" />,
      className: "md:col-span-1",
      imagePath: "/placeholder.svg?height=929&width=1207",
    },
    {
      id: "ai-powered-chatbots",
      title: "AI-Powered Chatbots",
      description: "Provide 24/7 customer assistance with intelligent AI chatbots.",
      icon: <Bot size={20} className="text-muted-foreground" />,
      className: "md:col-span-1 md:row-span-2",
      imagePath: "/placeholder.svg?height=929&width=1207",
    },
    {
      id: "business-verification",
      title: "Business Verification",
      description: "Verify identity using official business documents for trust.",
      icon: <ShieldCheck size={20} className="text-muted-foreground" />,
      className: "md:col-span-1",
      imagePath: "/placeholder.svg?height=929&width=1207",
    },
    {
      id: "loyalty-program",
      title: "Loyalty Program",
      description: "Create and manage customer loyalty programs effectively.",
      icon: <Star size={20} className="text-muted-foreground" />,
      className: "md:col-span-1",
      imagePath: "/placeholder.svg?height=929&width=1207",
    },
    {
      id: "email-marketing",
      title: "Email Marketing",
      description: "Send promotional emails and newsletters to your customers.",
      icon: <Mail size={20} className="text-muted-foreground " />,
      className: "md:col-span-1",
      imagePath: "/placeholder.svg?height=929&width=1207",
    },
  ],
  autoPlayInterval = 4000,
  className,
}) {
  const { isDark } = useTheme();
  const [activeFeature, setActiveFeature] = useState(0);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (progress < 100) {
        setProgress((prev) => prev + 100 / (autoPlayInterval / 100));
      } else {
        setActiveFeature((prev) => (prev + 1) % features.length);
        setProgress(0);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [progress, features.length, autoPlayInterval]);

  const handleFeatureClick = (index) => {
    setActiveFeature(index);
    setProgress(0);
  };

  const getGradientColors = (index) => {
    const gradients = [
      "from-blue-400 to-blue-600",
      "from-purple-400 to-purple-600",
      "from-green-400 to-green-600",
      "from-orange-400 to-orange-600",
      "from-pink-400 to-pink-600",
      "from-indigo-400 to-indigo-600",
      "from-red-400 to-red-600",
    ];
    return gradients[index % gradients.length];
  };

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <section className={`py-16 px-4 ${isDark ? 'bg-black' : 'bg-[#F5F5F5]'} ${className}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`font-semibold text-sm uppercase tracking-wider ${
              isDark ? 'text-primary text-white' : 'text-gray-900'
            }`}
          >
            Powerful Features
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`text-4xl md:text-5xl font-bold mt-4 mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            Everything You Need to Succeed
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-lg max-w-2xl mx-auto ${
              isDark ? 'text-white' : 'text-gray-600'
            }`}
          >
            Discover our comprehensive suite of business tools designed to help you grow and manage your business effectively.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Feature List */}
          <div className="space-y-6">
            {features.map((feature, index) => {
              const isActive = activeFeature === index;
              
              return (
                <motion.div
                  key={feature.id}
                  className={`relative cursor-pointer transition-all duration-300 ${
                    isActive ? "opacity-100" : "opacity-60 hover:opacity-80"
                  }`}
                  onClick={() => handleFeatureClick(index)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div
                    className={`flex items-start space-x-4 p-4 rounded-xl transition-all duration-300 ${
                      isActive
                        ? isDark 
                          ? "bg-white/5 border border-primary/20" 
                          : "bg-black border border-black backdrop-blur-sm"
                        : isDark 
                          ? "hover:bg-white/10" 
                          : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`p-3 rounded-full transition-all duration-300 ${
                        isActive
                          ? isDark 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-black text-white"
                          : isDark 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-white text-white"
                      }`}
                    >
                      {feature.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3
                        className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                          isActive 
                            ? isDark ? "text-white" : "text-gray-900"
                            : isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className={`text-sm transition-colors duration-300 ${
                          isActive 
                            ? isDark ? "text-gray-200" : "text-gray-700"
                            : isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {feature.description}
                      </p>
                      
                      {/* Progress Bar */}
                      {isActive && (
                        <div className={`mt-3 rounded-full h-1 overflow-hidden ${
                          isDark ? 'bg-muted' : 'bg-gray-200'
                        }`}>
                          <motion.div
                            className={`h-full ${isDark ? 'bg-primary' : 'bg-black'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.1, ease: "linear" }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Right Side - Feature Cards Grid */}
          <div className="grid grid-cols-12 gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="col-span-12"
              >
                <BounceCard className={`min-h-[400px] ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                }`}>
                  <CardTitle icon={features[activeFeature].icon}>
                    {features[activeFeature].title}
                  </CardTitle>
                  <p className={`mb-6 ${
                    isDark ? 'text-muted-foreground text-white' : 'text-gray-600'
                  }`}>
                    {features[activeFeature].description}
                  </p>
                  
                  {/* Feature Demo Area */}
                  <div className={`absolute bottom-0 left-4 right-4 top-24 translate-y-8 rounded-t-2xl p-6 transition-transform duration-[250ms] group-hover:translate-y-4 group-hover:rotate-[1deg] border ${
                    isDark ? 'bg-zinc-800 border-border/50' : 'bg-gray-100 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                          {features[activeFeature].icon}
                        </div>
                        <span className={`block text-center font-semibold ${
                          isDark ? 'text-foreground' : 'text-gray-900'
                        }`}>
                          {features[activeFeature].title}
                        </span>
                        <span className={`block text-center text-sm mt-2 ${
                          isDark ? 'text-muted-foreground' : 'text-gray-600'
                        }`}>
                          Interactive Demo
                        </span>
                      </div>
                    </div>
                  </div>
                </BounceCard>
              </motion.div>
            </AnimatePresence>

            {/* Additional smaller cards for visual appeal */}
            <motion.div
              className="col-span-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <BounceCard className="min-h-[200px] bg-gray-900">
                <CardTitle icon={<Star size={16} className="text-muted-foreground" />}>
                  Quick Stats
                </CardTitle>
                <div className={`absolute bottom-0 left-4 right-4 top-16 translate-y-4 rounded-t-2xl p-4 transition-transform duration-[250ms] group-hover:translate-y-2 group-hover:rotate-[1deg] border ${
                  isDark 
                    ? 'bg-gradient-to-br from-green-400/20 to-emerald-400/20 border-border/50' 
                    : 'bg-gradient-to-br from-green-100 to-emerald-100 border-gray-200'
                }`}>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      isDark ? 'text-foreground' : 'text-gray-900'
                    }`}>99%</div>
                    <div className={`text-sm ${
                      isDark ? 'text-muted-foreground' : 'text-gray-600'
                    }`}>Uptime</div>
                  </div>
                </div>
              </BounceCard>
            </motion.div>

            <motion.div
              className="col-span-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <BounceCard className="min-h-[200px] bg-gray-900">
                <CardTitle icon={<ShieldCheck size={16} className="text-muted-foreground" />}>
                  Security
                </CardTitle>
                <div className={`absolute bottom-0 left-4 right-4 top-16 translate-y-4 rounded-t-2xl p-4 transition-transform duration-[250ms] group-hover:translate-y-2 group-hover:rotate-[-1deg] border ${
                  isDark 
                    ? 'bg-gradient-to-br from-blue-400/20 to-indigo-400/20 border-border/50' 
                    : 'bg-gradient-to-br from-blue-100 to-indigo-100 border-gray-200'
                }`}>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      isDark ? 'text-foreground' : 'text-gray-900'
                    }`}>256-bit</div>
                    <div className={`text-sm ${
                      isDark ? 'text-muted-foreground' : 'text-gray-600'
                    }`}>Encryption</div>
                  </div>
                </div>
              </BounceCard>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Demo() {
  return <AnimatedFeatureSection />;
}
