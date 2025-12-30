"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

const UsernameLayout = ({ children }) => {
  const params = useParams();
  const userId = params.username; // Use username param directly as userId
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchUserByUsername = async () => {
      try {
        setLoading(true);

        // Get the actual user document
        const userDoc = await getDoc(doc(db, "users", userId));

        console.log("USERDOC", userDoc.data());

        if (!userDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const userData = userDoc.data();

        // Check if the user role is "user" - in which case we don't show the profile
        if (userData.role === "user") {
          setNotFound(true);
        } else {
          setUser({ ...userData, uid: userId });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserByUsername();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          User Not Found
        </h1>
        <p className="text-gray-600">
          The user you're looking for doesn't exist or is not a business
          profile.
        </p>
      </div>
    );
  }

  // Let the parent layout handle the sidebar and layout structure
  return <>{children}</>;
};

export default UsernameLayout;