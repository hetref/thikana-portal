"use client";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { redirect } from "next/navigation";
import React, { useEffect } from "react";

const layout = ({ children }) => {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) redirect("/");
    });

    return () => unsubscribe();
  }, []);

  return <div>{children}</div>;
};

export default layout;
