"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { getDoc, doc } from "firebase/firestore";
import UserBasicInfoForm from "@/components/UserBasicInfoForm";
import Loader from "@/components/Loader";

export default function UserSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  // Load user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!auth.currentUser) {
          setIsLoading(false);
          return;
        }

        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUserData(userDocSnap.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto py-[30px] flex justify-center items-center min-h-[60vh]">
        <Loader/>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-[30px]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">User Profile Settings</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <UserBasicInfoForm userData={userData} />
        </div>
      </div>
    </div>
  );
}
