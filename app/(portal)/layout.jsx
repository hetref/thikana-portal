"use client";

import TopNavbar from "@/components/TopNavbar";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { get, ref } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { redirect } from "next/navigation";
import React, { useEffect, useState } from "react";

const layout = ({ children }) => {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        redirect("/");
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <TopNavbar type="authenticated" />
      {children}
    </div>
  );
};

export default layout;
