"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Settings,
  ArrowRight,
  Clock,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { ServicesGrid } from "@/components/ServicesGrid";
import useBusinessIdForMember from "@/hooks/useBusinessIdForMember";

export default function ShowServicesTabContent({
  userId,
  userData,
  isViewOnly = false,
  currentUserView = false,
}) {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    serviceId: "",
    message: "",
    submitting: false,
  });

  const {
    targetId,
    isMember,
    loading: idLoading,
  } = useBusinessIdForMember(userId);

  // Check if the current user is the owner of the business
  const isOwner = useMemo(() => {
    // If currentUserView is true, we're in the profile page
    // If currentUserView is false, we're in the username page
    if (currentUserView) {
      return true; // In profile page, always show owner controls
    } else {
      return userId === auth.currentUser?.uid; // In username page, check if current user is the owner
    }
  }, [currentUserView, userId]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesRef = collection(db, "users", userId, "services");
        const q = query(servicesRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        const servicesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setServices(servicesData);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchServices();
    }
  }, [userId]);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.serviceId || !contactForm.message) {
      toast.error("Please select a service and enter a message");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("You must be logged in to contact a business");
      router.push("/login");
      return;
    }

    setContactForm((prev) => ({ ...prev, submitting: true }));

    try {
      // Fetch complete user data from Firestore to get the most up-to-date information
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const customerData = userDoc.exists() ? userDoc.data() : {};

      const selectedService = services.find(
        (service) => service.id === contactForm.serviceId
      );

      await addDoc(collection(db, "users", userId, "inquiries"), {
        businessId: userId,
        businessName: userData?.businessName || "",
        customerId: currentUser.uid,
        customerName:
          customerData?.name || currentUser.displayName || "Anonymous",
        customerEmail: customerData?.email || currentUser.email || "",
        customerPhone: customerData?.phone || "",
        customerPhoto: customerData?.profilePic || currentUser.photoURL || "",
        serviceId: contactForm.serviceId,
        serviceName: selectedService?.name || "",
        message: contactForm.message,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Your inquiry has been sent to the business");
      setContactForm({
        serviceId: "",
        message: "",
        submitting: false,
      });
      setContactDialogOpen(false);
    } catch (error) {
      console.error("Error sending inquiry:", error);
      toast.error("Failed to send inquiry. Please try again.");
    } finally {
      setContactForm((prev) => ({ ...prev, submitting: false }));
    }
  };

  if (idLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ServicesGrid
      userId={targetId}
      userData={userData}
      userType={userData?.role === "business" ? "business" : "customer"}
    />
  );
}
