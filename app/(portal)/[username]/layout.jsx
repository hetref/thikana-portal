"use client";
import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Loader from "@/components/Loader";

const UsernameLayout = ({ children }) => {
  //   const params = useParams();
  //   const userId = params.user;
  const searchParams = useSearchParams();
  const userId = searchParams.get("user");
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader/>
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 px-2 md:px-4">
            <aside className="hidden lg:block lg:w-80">
              <div className="sticky top-20">
                <Sidebar />
              </div>
            </aside>

            <main className="flex-1 py-10 px-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  User Not Found
                </h1>
                <p className="text-gray-600">
                  The user you're looking for doesn't exist or is not a business
                  profile.
                </p>
              </div>
            </main>

            <aside className="hidden lg:block lg:w-80">
              <div className="sticky top-20">
                <WhoToFollow />
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 px-2 md:px-4">
          <aside className="hidden lg:block lg:w-80">
            <div className="sticky top-20">
              <Sidebar />
            </div>
          </aside>

          <main className="flex-1">{children}</main>

          <aside className="hidden lg:block lg:w-80">
            <div className="sticky top-20">
              <WhoToFollow />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default UsernameLayout;
