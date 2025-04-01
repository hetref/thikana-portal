"use client";
import React from "react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Timeline } from "@/components/ui/timeline";
import {
  Building2,
  Users,
  MessageSquare,
  Award,
  Mail,
  MapPin,
  Star,
  Package,
  Handshake,
} from "lucide-react";

export default function AboutPage() {
  const timelineData = [
    {
      title: "What sets Thikanna apart?",
      content: (
        <div className="bg-neutral-50 p-6 rounded-lg">
          <p className="text-neutral-600">
            Our integrated AI features, robust business verification, and
            seamless user engagement tools create a unique ecosystem where
            businesses and customers can connect meaningfully and securely.
          </p>
        </div>
      ),
    },
    {
      title: "How does Thikanna help businesses grow?",
      content: (
        <div className="bg-neutral-50 p-6 rounded-lg">
          <p className="text-neutral-600">
            We provide comprehensive e-commerce solutions including AI chatbots,
            marketing tools, and analytics. Our platform helps businesses
            establish a strong online presence while building lasting customer
            relationships.
          </p>
        </div>
      ),
    },
    {
      title: "Why choose Thikanna for local discovery?",
      content: (
        <div className="bg-neutral-50 p-6 rounded-lg">
          <p className="text-neutral-600">
            We prioritize authentic local connections. Our platform makes it
            easy to discover and engage with verified local businesses, ensuring
            reliable services and genuine customer experiences.
          </p>
        </div>
      ),
    },
  ];

  const businessFeatures = [
    {
      icon: <Building2 className="w-6 h-6 mr-2" />,
      text: "Free e-commerce websites with integrated SEO tools",
    },
    {
      icon: <MessageSquare className="w-6 h-6 mr-2" />,
      text: "AI-powered chatbots for customer interactions",
    },
    {
      icon: <Mail className="w-6 h-6 mr-2" />,
      text: "Loyalty programs and email marketing tools",
    },
    {
      icon: <Award className="w-6 h-6 mr-2" />,
      text: "Business verification for trust and credibility",
    },
  ];

  const userFeatures = [
    {
      icon: <MapPin className="w-6 h-6 mr-2" />,
      text: "Easy discovery of local businesses and services",
    },
    {
      icon: <Star className="w-6 h-6 mr-2" />,
      text: "Personalized recommendations",
    },
    {
      icon: <Package className="w-6 h-6 mr-2" />,
      text: "Effortless order tracking and reviews",
    },
    {
      icon: <Handshake className="w-6 h-6 mr-2" />,
      text: "Seamless connection with businesses",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500">
            Welcome to Thikanna!
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-foreground/80">
            Connect. Grow. Engage.
          </h2>
          <div className="space-y-8 text-lg text-muted-foreground">
            <p className="text-center">
              At Thikanna, we aim to bridge the gap between businesses and users
              by creating a seamless platform for connection, growth, and
              engagement. Whether you're a business looking to enhance your
              online presence or a user searching for local services, Thikanna
              has you covered.
            </p>

            <div className="flex flex-col items-center">
              <div className="flex items-center mb-4">
                <Building2 className="w-6 h-6 mr-2" />
                <h3 className="text-xl font-semibold">For Businesses</h3>
              </div>
              <ul className="list-none space-y-4 text-center">
                {businessFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center justify-center">
                    {feature.icon}
                    {feature.text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center mb-4">
                <Users className="w-6 h-6 mr-2" />
                <h3 className="text-xl font-semibold">For Users</h3>
              </div>
              <ul className="list-none space-y-4 text-center">
                {userFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center justify-center">
                    {feature.icon}
                    {feature.text}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-center">
              Our mission is to empower businesses to grow digitally while
              ensuring users have access to the best local services at their
              fingertips. With Thikanna, the possibilities are endless!
            </p>
          </div>
        </div>
      </div>
      <BackgroundBeams />
      <Timeline data={timelineData} />
    </div>
  );
}
