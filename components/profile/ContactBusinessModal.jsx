"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth, db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function ContactBusinessModal({
  isOpen,
  onClose,
  businessId,
  businessData,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    service: "",
    message: "",
  });

  useEffect(() => {
    const fetchServices = async () => {
      if (!businessId) return;

      try {
        // Fetch services from the business
        const servicesRef = collection(db, "users", businessId, "services");
        const servicesSnapshot = await getDocs(servicesRef);

        const servicesData = servicesSnapshot.docs.map((doc) => ({
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

    if (isOpen) {
      fetchServices();
      // Reset form when modal opens
      setFormData({
        service: "",
        message: "",
      });
    }
  }, [businessId, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleServiceChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      service: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You need to be logged in to send an inquiry");
        return;
      }

      if (!formData.service) {
        toast.error("Please select a service");
        return;
      }

      if (!formData.message.trim()) {
        toast.error("Please enter a message");
        return;
      }

      // Get the service details to display in the inquiry
      const selectedService = services.find((s) => s.id === formData.service);
      const serviceName = selectedService
        ? selectedService.name
        : "Unknown Service";

      // Add inquiry to the business's inquiries collection
      await addDoc(collection(db, "businesses", businessId, "inquiries"), {
        service: serviceName,
        serviceId: formData.service,
        message: formData.message,
        userId: user.uid,
        status: "pending",
        timestamp: serverTimestamp(),
        createdAt: new Date(),
      });

      toast.success("Inquiry sent successfully!");
      onClose();
    } catch (error) {
      console.error("Error sending inquiry:", error);
      toast.error("Failed to send inquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Contact {businessData?.businessName || "Business"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-2 text-muted-foreground">
              No services available for this business.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service">Select Service</Label>
                <Select
                  value={formData.service}
                  onValueChange={handleServiceChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}{" "}
                        {service.isVariablePrice
                          ? `(Price varies)`
                          : service.price
                            ? `(₹${service.price})`
                            : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Describe what you're looking for..."
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={5}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || loading || services.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
  );
}
