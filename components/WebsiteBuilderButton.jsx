"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Globe } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function WebsiteBuilderButton({ userId }) {
  const [hasWebsite, setHasWebsite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkWebsite = async () => {
      if (!userId) return;

      try {
        const websiteRef = doc(db, "websites", userId);
        const websiteDoc = await getDoc(websiteRef);
        setHasWebsite(websiteDoc.exists());
      } catch (error) {
        console.error("Error checking website:", error);
      } finally {
        setLoading(false);
      }
    };

    checkWebsite();
  }, [userId]);

  if (loading) {
    return (
      <Button
        variant="outline"
        className="text-primary border-primary hover:bg-primary/10 px-4 w-full md:w-auto"
        disabled
      >
        <Globe className="w-4 h-4 mr-2" />
        Checking...
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant="outline"
      className="text-primary border-primary hover:bg-primary/10 px-4 w-full md:w-auto"
    >
      <Link href="/websites">
        <Globe className="w-4 h-4 mr-2" />
        {hasWebsite ? "Update Website" : "Build Your Website"}
      </Link>
    </Button>
  );
}
