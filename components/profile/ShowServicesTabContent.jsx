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
import { sendNotificationToUser } from "@/lib/notifications";
import Loader from "@/components/Loader"
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

      // Add the inquiry to Firestore
      const inquiryRef = await addDoc(
        collection(db, "users", userId, "inquiries"),
        {
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
        }
      );

      // Send notification to business owner
      await sendNotificationToUser(userId, {
        title: "New Service Inquiry",
        message: `${customerData?.name || currentUser.displayName || "A customer"} is interested in your "${selectedService?.name}" service.`,
        type: "message",
        sender: customerData?.name || currentUser.displayName || "Customer",
        email: true, // Send email notification
        whatsapp: false, // Optional: Set to true if you want WhatsApp notification too
        link: `/dashboard`, // Optional: direct link to the inquiry details
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader/>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Services</h2>
          <p className="text-sm text-muted-foreground">
            Services offered by {userData?.businessName || "your business"}
          </p>
        </div>
        {isOwner && (
          <Link href="/profile/services">
            <Button className="bg-black hover:bg-black/90">
              <Settings className="w-4 h-4 mr-2" />
              Manage Services
            </Button>
          </Link>
        )}
      </div>

      {services.length === 0 ? (
        <div className="text-center py-10 rounded-lg">
          <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No services yet
          </h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Start adding services that your business offers to attract more
            customers.
          </p>
          {isOwner && (
            <Link href="/profile/services">
              <Button className="bg-black hover:bg-black/90">
                Add Your First Service
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {services.map((service) => (
            <Card
              key={service.id}
              className="overflow-hidden hover:shadow-md transition-all"
            >
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">
                  {service.name}
                </CardTitle>
                <div className="flex justify-between items-center">
                  {service.isVariablePrice ? (
                    <Badge
                      variant="secondary"
                      className="mt-2 bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Price varies as per requirements
                      {service.approximatePrice > 0 &&
                        ` ~₹${service.approximatePrice}`}
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="mt-2 bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      ₹{service.price}
                    </Badge>
                  )}
                  <div className="flex items-center text-muted-foreground text-sm">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {service.duration}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-gray-600 text-sm line-clamp-3">
                  {service.description}
                </p>
              </CardContent>
              <CardFooter className="border-t flex justify-between pt-4 pb-4">
                {!isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setContactForm((prev) => ({
                        ...prev,
                        serviceId: service.id,
                      }));
                      setContactDialogOpen(true);
                    }}
                    className="text-primary hover:text-primary-hover hover:bg-primary/5"
                  >
                    Contact Business
                    <MessageSquare className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Contact Business Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Contact {userData?.businessName || "Business"}
            </DialogTitle>
            <DialogDescription>
              Send an inquiry about a service you're interested in
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service">Select a Service</Label>
              <Select
                value={contactForm.serviceId}
                onValueChange={(value) =>
                  setContactForm((prev) => ({ ...prev, serviceId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}{" "}
                      {service.isVariablePrice
                        ? `(Variable Price${service.approximatePrice ? ` ~₹${service.approximatePrice}` : ""})`
                        : `(₹${service.price})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Your Message</Label>
              <Textarea
                id="message"
                value={contactForm.message}
                onChange={(e) =>
                  setContactForm((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                placeholder="Describe what you're looking for, ask about availability, etc."
                rows={4}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={contactForm.submitting}>
                {contactForm.submitting ? (
                  <>
                    <Loader/>
                    Sending...
                  </>
                ) : (
                  "Send Inquiry"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
