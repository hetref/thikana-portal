"use client";

import { ThemeProvider } from "next-themes";
import Pricing from "@/components/Pricing";

export default function PricingPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen transition-colors duration-300 bg-white dark:bg-black">
        <Pricing />
      </div>
    </ThemeProvider>
  );
}