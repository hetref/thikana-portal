import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const franchiseFormSchema = z.object({
  adminName: z.string().min(2, { message: "Admin name is required" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
});

export default function FranchiseModal({ isOpen, onOpenChange }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const franchiseForm = useForm({
    resolver: zodResolver(franchiseFormSchema),
    defaultValues: {
      adminName: "",
      email: "",
      phone: "",
    },
  });

  const handleAddFranchise = async (data) => {
    if (!user) {
      toast.error("You must be logged in to add a franchise");
      return;
    }

    try {
      setIsSubmitting(true);

      // Get the current business data to copy to the franchise
      const businessRef = doc(db, "businesses", user.uid);
      const businessSnap = await getDoc(businessRef);

      if (!businessSnap.exists()) {
        toast.error("Business data not found");
        setIsSubmitting(false);
        return;
      }

      const businessData = businessSnap.data();

      // API call to create franchise
      const response = await fetch("/api/create-franchise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminName: data.adminName,
          email: data.email,
          phone: data.phone,
          franchiseOwner: user.uid,
          businessData: {
            businessName: businessData.businessName,
            business_type: businessData.business_type,
            business_categories: businessData.business_categories,
            plan: businessData.plan,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add franchise");
      }

      toast.success("Franchise added successfully!");
      onOpenChange(false);
      franchiseForm.reset();
    } catch (error) {
      console.error("Error adding franchise:", error);
      toast.error(error.message || "Failed to add franchise");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Franchise</DialogTitle>
          <DialogDescription>
            Fill in the details to add a new franchise administrator. A new
            account will be created with the default password "thikana2025".
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={franchiseForm.handleSubmit(handleAddFranchise)}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="adminName">Administrator Name</Label>
              <Input
                id="adminName"
                placeholder="Enter administrator name"
                {...franchiseForm.register("adminName")}
                disabled={isSubmitting}
              />
              {franchiseForm.formState.errors.adminName && (
                <p className="text-sm text-red-500">
                  {franchiseForm.formState.errors.adminName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                {...franchiseForm.register("email")}
                disabled={isSubmitting}
              />
              {franchiseForm.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {franchiseForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                {...franchiseForm.register("phone")}
                disabled={isSubmitting}
              />
              {franchiseForm.formState.errors.phone && (
                <p className="text-sm text-red-500">
                  {franchiseForm.formState.errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Franchise"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
