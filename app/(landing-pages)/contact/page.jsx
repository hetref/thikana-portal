"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { AuroraBackground } from "@/components/ui/aurora-background";

const ContactCard = () => {
  return (
    <div className="relative bg-background text-foreground pt-32 pb-44 overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 z-0">
        <AuroraBackground />
      </div>

      {/* Card on Top */}
      <Card className="relative z-10 max-w-4xl mx-auto">
        <div className="grid grid-cols-2">
          <div className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">Contact Us</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border p-2"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full rounded-md border p-2"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  className="w-full rounded-md border p-2 h-32"
                  placeholder="Your message..."
                />
              </div>
              <RainbowButton>
                <span className="flex items-center gap-2">
                  Send
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
              </RainbowButton>
            </form>
          </div>
          <div className="relative h-full">
            <img
              src="/stock1.jpg"
              alt="placeholder"
              className="absolute inset-0 w-full h-full object-cover rounded-r-lg"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ContactCard;
