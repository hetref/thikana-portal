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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth, db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";

export default function BusinessQueryDialog({ open, onOpenChange }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    category: "general",
    priority: "medium",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You need to be logged in to create a ticket");
        return;
      }

      if (!formData.subject.trim()) {
        toast.error("Please enter a subject for your ticket");
        return;
      }

      if (!formData.message.trim()) {
        toast.error("Please enter a message");
        return;
      }

      // Generate timestamp-based document ID
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ticketId = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

      // Get user data from Firestore to get the username
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let displayName = "Unknown User";
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Use username from Firestore if available, otherwise fallback to email
        displayName = userData.username || userData.name || user.email || "Unknown User";
      } else {
        // Fallback if user document doesn't exist
        displayName = user.email || "Unknown User";
      }
      
      // Reference to the document with custom ID
      const ticketRef = doc(db, "users", user.uid, "tickets", ticketId);

      // Store the ticket with custom ID
      await setDoc(ticketRef, {
        ticketId: ticketId, // Store the timestamp ID in the data fields
        subject: formData.subject,
        message: formData.message,
        category: formData.category,
        priority: formData.priority,
        userId: user.uid,
        userEmail: user.email,
        userName: displayName,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isBusinessQuery: true, // Flag to identify business queries
        messages: [{
          text: formData.message,
          sender: "business",
          timestamp: new Date(),
          userName: displayName
        }]
      });

      toast.success("Ticket created successfully!");
      
      // Reset form
      setFormData({
        subject: "",
        message: "",
        category: "general",
        priority: "medium",
      });
      
      // Close the dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Failed to create ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Submit a query to the Thikana support team. We'll get back to you as soon as possible.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleSelectChange("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Inquiry</SelectItem>
                  <SelectItem value="technical">Technical Support</SelectItem>
                  <SelectItem value="billing">Billing/Payment</SelectItem>
                  <SelectItem value="account">Account Management</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleSelectChange("priority", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              placeholder="Brief description of your issue"
              value={formData.subject}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Provide details about your issue or request..."
              value={formData.message}
              onChange={handleInputChange}
              rows={5}
              required
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader/>
                  Submitting...
                </>
              ) : (
                "Submit Ticket"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 