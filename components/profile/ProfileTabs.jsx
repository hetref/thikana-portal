"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ProfileTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserCategories = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCategories(
            userData.business_categories || userData.businessCategories || []
          );
        }
      } catch (error) {
        console.error("Error fetching user categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserCategories();
  }, []);

  if (loading) return null;

  const getActiveTab = () => {
    if (pathname.includes("/profile/services")) return "services";
    if (pathname.includes("/profile/inventory")) return "inventory";
    if (pathname.includes("/profile/properties")) return "properties";
    return "profile";
  };

  const handleTabChange = (value) => {
    switch (value) {
      case "profile":
        router.push("/profile");
        break;
      case "services":
        router.push("/profile/services");
        break;
      case "inventory":
        router.push("/profile/inventory");
        break;
      case "properties":
        router.push("/profile/properties");
        break;
    }
  };

  return (
    <Tabs
      value={getActiveTab()}
      onValueChange={handleTabChange}
      className="w-full"
    >
      <TabsList
        className="grid w-full max-w-2xl mx-auto"
        style={{
          gridTemplateColumns:
            `1fr ${categories.includes("service") ? "1fr" : ""} ${categories.includes("product") ? "1fr" : ""} ${categories.includes("real-estate") ? "1fr" : ""}`.trim(),
        }}
      >
        <TabsTrigger value="profile">Profile</TabsTrigger>
        {categories.includes("service") && (
          <TabsTrigger value="services">Services</TabsTrigger>
        )}
        {categories.includes("product") && (
          <TabsTrigger value="inventory">Products</TabsTrigger>
        )}
        {categories.includes("real-estate") && (
          <TabsTrigger value="properties">Properties</TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
}
