import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const useIsBusinessUser = (userId) => {
  const [isBusinessUser, setIsBusinessUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBusinessUser = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      const userDoc = await getDoc(doc(db, "users", userId));
      setIsBusinessUser(userDoc.exists() && userDoc.data().role === "business");
      setLoading(false);
    };

    checkBusinessUser();
  }, [userId]);

  return { isBusinessUser, loading };
};