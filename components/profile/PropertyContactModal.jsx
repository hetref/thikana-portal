"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, Timestamp, collection, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";

export default function PropertyContactModal({ property, businessId }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    budget: "",
    timeframe: "Immediately",
    queryType: "Visit",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = auth.currentUser;

      const inquiryData = {
        ...formData,
        propertyId: property.id,
        propertyTitle: property.title,
        propertyPrice: property.price,
        propertyType: property.propertyType,
        propertyLocation: `${property.city}, ${property.state}`,
        status: "pending",
        type: "real-estate",
        createdAt: Timestamp.now(),
        customerId: user ? user.uid : null,
        customerName: user ? formData.name : formData.name,
      };

      // Add the inquiry to the business's inquiries collection
      await addDoc(
        collection(db, "users", businessId, "inquiries"),
        inquiryData
      );

      toast.success("Your inquiry has been sent successfully!");
      setOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
        budget: "",
        timeframe: "Immediately",
        queryType: "Visit",
      });
    } catch (error) {
      console.error("Error sending inquiry:", error);
      toast.error("Failed to send inquiry. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-primary hover:bg-primary/90 text-white font-medium shadow-sm">
          Contact Now
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Inquire About Property</DialogTitle>
          <DialogDescription>
            Send your inquiry about{" "}
            <span className="font-medium">
              {property.title || "this property"}
            </span>{" "}
            in{" "}
            {property.city && property.state
              ? `${property.city}, ${property.state}`
              : "this location"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your name"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget">Your Budget (₹)</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                value={formData.budget}
                onChange={handleInputChange}
                placeholder="Enter your budget"
                required
              />
            </div>

            <div>
              <Label htmlFor="timeframe">Time Frame</Label>
              <Select
                name="timeframe"
                value={formData.timeframe}
                onValueChange={(value) =>
                  handleSelectChange("timeframe", value)
                }
              >
                <SelectTrigger id="timeframe">
                  <SelectValue placeholder="Select time frame" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Immediately">Immediately</SelectItem>
                  <SelectItem value="Within 1 month">Within 1 month</SelectItem>
                  <SelectItem value="1-3 months">1-3 months</SelectItem>
                  <SelectItem value="3-6 months">3-6 months</SelectItem>
                  <SelectItem value="6+ months">6+ months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="queryType">Inquiry Type</Label>
            <Select
              name="queryType"
              value={formData.queryType}
              onValueChange={(value) => handleSelectChange("queryType", value)}
            >
              <SelectTrigger id="queryType">
                <SelectValue placeholder="Select inquiry type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Visit">Schedule a Visit</SelectItem>
                <SelectItem value="More Info">
                  Request More Information
                </SelectItem>
                <SelectItem value="Negotiation">Price Negotiation</SelectItem>
                <SelectItem value="Availability">Check Availability</SelectItem>
                <SelectItem value="Other">Other Query</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message">Your Message</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Please provide details about your requirements..."
              rows={4}
              required
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isLoading ? (
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
  );
}
