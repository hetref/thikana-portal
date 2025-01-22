"use client"

import { ThemeProvider } from "next-themes"
import SparklesText from "@/components/ui/sparkles-text";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import Hero from "@/components/Hero";
import Features from '@/components/feature'
import Pricing from "@/components/Pricing";


export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="relative min-h-screen overflow-hidden bg-white dark:bg-black transition-colors duration-300">
        <Hero />
        <Features/>
        <Pricing/>
      </div>
    </ThemeProvider>
  );
}

