"use client";

import React, { useEffect, useState } from "react";
import { Roboto } from "next/font/google";
import { motion as m } from "framer-motion";
import Image from "next/image";
import { RainbowButton } from "./ui/rainbow-button";
import Link from "next/link";
import { Spotlight } from "./ui/spotlight-new";
import { TopNavbar } from "./TopNavbar";
import { LogoCloud } from "./logo-cloud";
import { AnimatedShinyText } from "./ui/animated-shiny-text";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

const companies = [
  { name: "Company 1", logo: "/company/company1.png" },
  { name: "Company 2", logo: "/company/company2.png" },
  { name: "Company 3", logo: "/company/company3.png" },
  { name: "Company 4", logo: "/company/company4.png" },
  { name: "Company 5", logo: "/company/company5.png" },
  // Add more companies as needed
];

const BackgroundCircles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 z-0">
        <Spotlight />
      </div>
    </div>
  );
};

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

const Hero = () => {
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }
  
  return (
    <>
      <div
        className={`${
          isDark 
            ? 'bg-gradient-to-tl from-blue-950 via-black to-black' 
            : 'bg-[#F5F5F5] duration-1000'
        } transition-colors duration-1000 relative ${roboto.className}`}
      >
        <BackgroundCircles />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="min-h-[100vh] flex flex-col items-center justify-center pt-16 pb-32">
            <div className="z-10 flex min-h-16 items-center justify-center mb-8">
              <div
                className={cn(
                  "group rounded-full border border-black/5 bg-neutral-100 text-base text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                )}
              >
                <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
                  <span>✨ Manage business smarter</span>
                  <ArrowRightIcon className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
                </AnimatedShinyText>
              </div>
            </div>
            <div className="text-black max-w-5xl text-center">
              <h1 className={`text-4xl md:text-7xl lg:text-8xl font-semibold mb-8 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Smart Business with <br />
                <span className="bg-clip-text text-transparent font-semibold bg-gradient-to-r from-blue-950 to-teal-700 inline-block mt-2">
                  Thikana
                </span>
              </h1>
              <p className={`text-lg md:text-xl max-w-2xl mx-auto mb-12 font-normal ${
                isDark ? 'text-white' : 'text-gray-700'
              }`}>
                Effortlessly streamline your Business management with Thikana.
                <br />
                Shorten, track, and organize all your Products in one place.
              </p>
              <div className="flex justify-center">
                <RainbowButton>
                  <Link href="/login">
                    <span className="flex items-center gap-2">
                      Get Started
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </span>
                  </Link>
                </RainbowButton>
              </div>
            </div>
          </div>
        </div>
        <div className="relative w-full overflow-hidden">
          <LogoCloud />
        </div>
      </div>
    </>
  );
};

export default Hero;
