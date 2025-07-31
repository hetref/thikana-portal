"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import ShowPropertiesTabContent from "@/components/profile/ShowPropertiesTabContent";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";

export default function PropertiesPage() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          setIsAuthenticated(true);
        } else {
          // Redirect to login if not authenticated
          router.push("/login");
        }
        setLoading(false);
      });

      return () => unsubscribe();
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader/>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <ShowPropertiesTabContent />
    </div>
  );
}
