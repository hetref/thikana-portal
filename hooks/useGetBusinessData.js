import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";

export function useGetBusinessData(userData) {
  const [businessData, setBusinessData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBusinessData = async () => {
      // Only fetch for member users
      if (!userData || userData.role !== "member" || !userData.businessId) {
        return;
      }

      try {
        setLoading(true);

        // Get the current user's ID token for authentication
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Call the API to get business data
        const response = await fetch("/api/get-business-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.uid,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch business data");
        }

        const data = await response.json();
        setBusinessData(data.businessData);
      } catch (err) {
        console.error("Error fetching business data:", err);
        setError(err.message);
        toast.error("Could not load business data");
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [userData]);

  return { businessData, loading, error };
}
