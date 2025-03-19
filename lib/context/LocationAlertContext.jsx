"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const LocationAlertContext = createContext({
  showLocationAlert: false,
  setShowLocationAlert: () => {},
});

export function LocationAlertProvider({ children }) {
  const [showLocationAlert, setShowLocationAlert] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkLocationStatus = async () => {
      if (!auth.currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const businessDoc = await getDoc(
          doc(db, "businesses", auth.currentUser.uid)
        );

        if (userDoc.exists()) {
          const role = userDoc.data().role;
          setUserRole(role);

          if (role === "business") {
            // Show alert if business user has no location set
            setShowLocationAlert(
              !businessDoc.exists() || !businessDoc.data().location
            );
          }
        }
      } catch (err) {
        console.error("Error checking location status:", err);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkLocationStatus();
      } else {
        setShowLocationAlert(false);
        setUserRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <LocationAlertContext.Provider
      value={{ showLocationAlert, setShowLocationAlert }}
    >
      {children}
    </LocationAlertContext.Provider>
  );
}

export const useLocationAlert = () => useContext(LocationAlertContext);
