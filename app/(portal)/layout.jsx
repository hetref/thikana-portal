"use client";

import Loader from "@/components/Loader";
import MainNav from "@/components/main_nav";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { get, ref } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { redirect, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { LocationAlertProvider } from "@/lib/context/LocationAlertContext";
import { GlobalLocationAlert } from "@/components/GlobalLocationAlert";
import { ToastProvider } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";

const layout = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const router = useRouter();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserData(user);
      } else {
        setUserData(false);
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, []);
  if (userData === null) {
    return (
      <div className="flex justify-center items-center h-screen">
        {/* <h2 className="font-semibold text-xl"></h2> */}
        <Loader />
      </div>
    );
  }
  return (
    <AuthProvider>
      <ToastProvider>
        <LocationAlertProvider>
          <GlobalLocationAlert />
          <MainNav />
          <div className="mt-[80px]">{children}</div>
          <Toaster />
        </LocationAlertProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

export default layout;
