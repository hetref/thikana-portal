"use client";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { redirect, useRouter } from "next/navigation";
import React, { useEffect } from "react";

const layout = ({ children }) => {
  const router = useRouter();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) router.push("/");
    });

    return () => unsubscribe();
  }, []);

  return <div>{children}</div>;
};

export default layout;
