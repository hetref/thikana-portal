"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
import BusinessRegistration from "@/components/auth/BusinessRegistration";

// --- SUB-COMPONENTS ---

const TestimonialCard = ({ testimonial, delay }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-card/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-white/10 p-5 w-64`}>
    <img src={testimonial.avatarSrc} className="h-10 w-10 object-cover rounded-2xl" alt="avatar" />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-medium">{testimonial.name}</p>
      <p className="text-muted-foreground">{testimonial.handle}</p>
      <p className="mt-1 text-foreground/80">{testimonial.text}</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

const BusinessRegistrationPage = () => {
  const { isDark } = useTheme();

  const title = <span className="font-light text-foreground tracking-tighter">Business Registration</span>;
  const description = "Register your business and start growing with Thikana";
  const heroImageSrc = "https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80";
  const testimonials = [
    {
      avatarSrc: "/avatar.png",
      name: "Sarah Johnson",
      handle: "@sarahj",
      text: "Thikana has transformed how I manage my business. The interface is intuitive and the features are exactly what I needed."
    },
    {
      avatarSrc: "/avatar.png", 
      name: "Mike Chen",
      handle: "@mikechen",
      text: "The best platform I've used for business management. Highly recommend!"
    },
    {
      avatarSrc: "/avatar.png",
      name: "Emma Davis", 
      handle: "@emmad",
      text: "Incredible tool that has streamlined our entire workflow. Couldn't be happier!"
    }
  ];

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw]">
      {/* Left column: business registration form */}
      <section className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2 self-center font-medium">
              <Image src="/logo/black-logo.png" alt="Thikana Logo" width={100} height={100} />
            </div>

            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight text-gray-900">{title}</h1>
            <p className="animate-element animate-delay-200 text-gray-600">{description}</p>

            {/* BusinessRegistration component wrapped in the new UI */}
            <div className="animate-element animate-delay-300">
              <BusinessRegistration />
            </div>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4 bg-white">
          <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${heroImageSrc})` }}></div>
        </section>
      )}
    </div>
  );
};

export default BusinessRegistrationPage;
