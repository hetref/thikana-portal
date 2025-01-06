import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function useGetUser(userId) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      console.log(userId);
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        console.log("Document data:", userDoc.data());
        setUser(userDoc.data());
      } else {
        // docSnap.data() will be undefined in this case
        console.log("No such document!");
      }
    };
    fetchUserData();
  }, [userId]);

  return user;
}
