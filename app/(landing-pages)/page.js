"use client";

import SparklesText from "@/components/ui/sparkles-text";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import Hero from "@/components/Hero";
import Features from "@/components/feature";
import Pricing from "@/components/Pricing";
import { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";

export default function LandingPage() {
  // Use this flag to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  const { isDark } = useTheme();

  // After component mounts, allow theme changes
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  return (    
    <>
      <div className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-black' : 'bg-white'
      }`}>
        <Hero />
        <Features />
        <Pricing />
      </div>
    </>
  );
}
