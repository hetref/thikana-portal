"use client"

import { ThemeProvider } from "next-themes"
import SparklesText from "@/components/ui/sparkles-text";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import Hero from "@/components/Hero";
import Features from '@/components/feature'
import Pricing from "@/components/Pricing";
import { useEffect, useState } from "react";

export default function LandingPage() {
  // Use this flag to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  // After component mounts, allow theme changes
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <div className="relative min-h-screen overflow-hidden bg-white dark:bg-black transition-colors duration-300">
        <Hero />
        <Features/>
        <Pricing/>
      </div>
    </ThemeProvider>
  );
}