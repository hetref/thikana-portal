"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Info,
  MapPin,
  MessageSquare,
  Phone,
  X,
} from "lucide-react";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

export default function ServiceDialog({
  service,
  isOpen,
  onClose,
  userId,
  userData,
  userType,
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmitInquiry = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error("You must be logged in to send an inquiry");
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, `users/${userId}/inquiries`), {
        serviceId: service.id,
        serviceName: service.title,
        customerId: user.uid,
        customerName: user.displayName || userData?.name || "Customer",
        customerEmail: user.email || userData?.email || "",
        message: message,
        status: "pending",
        timestamp: serverTimestamp(),
      });

      toast.success("Inquiry sent successfully");
      setMessage("");
      onClose();
    } catch (error) {
      console.error("Error sending inquiry:", error);
      toast.error("Failed to send inquiry. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="flex justify-between items-center">
            <span>{service.title}</span>
            <Badge
              variant={service.available ? "secondary" : "destructive"}
              className="text-xs"
            >
              {service.available ? "Available" : "Unavailable"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Service offered by {userData?.businessName || "this business"}
          </DialogDescription>
        </DialogHeader>

        {service.imageUrl && (
          <div className="relative w-full h-[250px]">
            <Image
              src={service.imageUrl}
              alt={service.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Description
            </h4>
            <p className="text-sm text-gray-600">{service.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Location
              </h4>
              <p className="text-sm text-gray-600">
                {service.location || "At business location"}
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Duration
              </h4>
              <p className="text-sm text-gray-600">
                {service.duration || "Varies"}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Availability
            </h4>
            <p className="text-sm text-gray-600">
              {service.availability || "Contact for availability"}
            </p>
          </div>

          {userType !== "business" && (
            <div className="mt-6 pt-4 border-t">
              <form onSubmit={handleSubmitInquiry}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="message">Send an Inquiry</Label>
                    <Textarea
                      id="message"
                      placeholder="I'm interested in this service. Can you provide more details about..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={sending || !service.available}
                  >
                    {sending ? (
                      <>
                        <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Send Inquiry
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-3 flex flex-col sm:flex-row gap-2 border-t">
          <div className="flex items-center gap-2">
            <Badge className="text-lg px-4 py-1.5 bg-primary">
              ₹{service.price?.toFixed(2) || "0.00"}
            </Badge>
            {service.specialPrice && (
              <span className="text-sm text-gray-500 line-through">
                ₹{service.specialPrice.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:ml-auto">
            <Button variant="outline" className="gap-2" onClick={onClose}>
              <X className="h-4 w-4" />
              Close
            </Button>
            {userType !== "business" && (
              <Button variant="outline" className="gap-2">
                <Phone className="h-4 w-4" />
                Contact Business
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
