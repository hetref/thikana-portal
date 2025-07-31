"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { getDoc, doc } from "firebase/firestore";
import Loader from "@/components/Loader";
import toast from "react-hot-toast";

export default function DashboardLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (!user) {
          router.push("/login");
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (
            userDoc.exists() &&
            (userDoc.data().role === "business" ||
              userDoc.data().role === "member")
          ) {
            setIsAuthorized(true);
          } else {
            // Not a business or member user, redirect to home
            router.push("/");
            toast.error(
              "Only business accounts and members can access the dashboard"
            );
          }
        } catch (error) {
          console.error("Error checking user role:", error);
          router.push("/");
        } finally {
          setLoading(false);
        }
      });

      return () => unsubscribe();
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader/>
          <p className="text-lg text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect in useEffect
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
