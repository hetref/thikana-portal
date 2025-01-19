"use client";

import TopNavbar from "@/components/TopNavbar";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { get, ref } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { redirect } from "next/navigation";
import React, { useEffect, useState } from "react";

const layout = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userData = await fetchUserData(user.uid);
        if (!userData.phone || !userData.name) {
          console.log("no phone means no complete info", user);
          redirect("/onboarding");
        } else setUser(user);
      } else {
        redirect("/");
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async (uid) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    return docSnap.exists() ? docSnap.data() : null;
  };

  return (
    <div>
      <TopNavbar type="authenticated" />
      {children}
    </div>
  );
};

export default layout;
