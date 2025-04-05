"use client";

import React from "react";
import { HoverBorderGradient } from "./ui/hover-border-gradient";
import { motion as m } from "framer-motion";
import Image from "next/image";
import { RainbowButton } from "./ui/rainbow-button";
import { AuroraBackground } from "./ui/aurora-background";
import Link from "next/link";

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
    <div className="absolute inset-0 overflow-hidden -z-10">
      {/* Aurora Background */}
      <div className="absolute inset-0 z-0">
        <AuroraBackground />
      </div>

      {/* Purple Gradient Circle */}
      <m.div
        className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-500/30 to-transparent blur-3xl"
        animate={{
          x: ["-25%", "25%"],
          y: ["-25%", "25%"],
        }}
        transition={{
          repeat: Infinity,
          repeatType: "reverse",
          duration: 10,
          ease: "easeInOut",
        }}
        style={{
          top: "20%",
          left: "25%",
        }}
      />

      {/* Pink Gradient Circle */}
      <m.div
        className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-r from-pink-500/30 to-transparent blur-3xl"
        animate={{
          x: ["25%", "-25%"],
          y: ["25%", "-25%"],
        }}
        transition={{
          repeat: Infinity,
          repeatType: "reverse",
          duration: 15,
          ease: "easeInOut",
        }}
        style={{
          bottom: "20%",
          right: "25%",
        }}
      />
    </div>
  );
};

const Hero = () => {
  return (
    <div className="bg-white transition-colors duration-300 relative">
      <BackgroundCircles />
      <div className="max-w-7xl mx-auto px-4">
        <div className="min-h-[100vh] flex flex-col items-center justify-center pt-16 pb-32">
          <div className="text-sm mb-8">
            <HoverBorderGradient>
              ✨ Manage business smarter
            </HoverBorderGradient>
          </div>
          <div className="text-black max-w-5xl text-center">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 text-black">
              Smart Business with <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500 inline-block mt-2">
                  Thikana
                </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-12">
              Effortlessly streamline your Business management with Thikana.
              <br />
              Shorten, track, and organize all your Products in one place.
            </p>
            <div className="flex justify-center">
              <RainbowButton asChild>
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

      <div className="w-full bg-black py-16">
        <div className="text-sm mb-8 flex justify-center">
          <HoverBorderGradient>
            <span className="text-white">Trusted By Companies</span>
          </HoverBorderGradient>
        </div>

        <div className="relative w-full overflow-hidden">
          <m.div
            className="flex gap-8"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              duration: 20,
              ease: "linear",
              repeat: Infinity,
            }}
          >
            {[...companies, ...companies].map((company, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100"
              >
                <Image
                  src={company.logo}
                  alt={company.name}
                  width={160}
                  height={60}
                  className="object-contain brightness-0 invert"
                />
              </div>
            ))}
          </m.div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
