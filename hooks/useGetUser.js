"use client"

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function useGetUser(userId) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(doc(db, "users", userId), (doc) => {
      if (doc.exists()) {
        setUser(doc.data());
      } else {
        setUser(null);
      }
      console.log("User data:", doc.data());
    });

    return () => unsubscribe();
  }, [userId]);

  return user;
}
