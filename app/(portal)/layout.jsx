"use client";

import Loader from "@/components/Loader";
import TopNavbar from "@/components/TopNavbar";
// import TopNavbar from "@/components/TopNavbar";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { get, ref } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { redirect, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

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
    <div>
      <TopNavbar type="authenticated" />
      <div className="mt-[80px]">{children}</div>
    </div>
  );
};

export default layout;
