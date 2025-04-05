import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Hook to check if a user is a member and return the appropriate ID for data fetching
 * @param {string} userId - The user ID to check
 * @returns {Object} - Object containing businessId, targetId, isMember, and loading state
 */
export default function useBusinessIdForMember(userId) {
  const [businessId, setBusinessId] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // The ID that should be used for fetching data (business ID for members, user ID for others)
  const targetId = businessId || userId;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkIfMember = async () => {
      try {
        setLoading(true);

        const userDoc = await getDoc(doc(db, "users", userId));

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Check if the user is a member with a businessId
          if (userData.role === "member" && userData.businessId) {
            setBusinessId(userData.businessId);
            setIsMember(true);
          } else {
            setBusinessId(null);
            setIsMember(false);
          }
        } else {
          setBusinessId(null);
          setIsMember(false);
        }
      } catch (err) {
        console.error("Error checking if user is a member:", err);
        setError(err);
        setBusinessId(null);
        setIsMember(false);
      } finally {
        setLoading(false);
      }
    };

    checkIfMember();
  }, [userId]);

  return { businessId, targetId, isMember, loading, error };
}
