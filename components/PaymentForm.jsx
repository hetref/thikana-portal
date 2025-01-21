"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";

const paymentSchema = z.object({
  razorpayKeyId: z.string().min(1, "Razorpay Key ID is required"),
  razorpayKeySecret: z.string().min(1, "Razorpay Key Secret is required"),
});

export default function PaymentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const user = auth.currentUser;
  const form = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      razorpayKeyId: "",
      razorpayKeySecret: "",
    },
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/razorpay-encrypt/${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          form.reset({
            razorpayKeyId: data.razorpayKeyId,
            razorpayKeySecret: data.razorpayKeySecret,
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, form]);

  async function onSubmit(data) {
    setIsSubmitting(true);
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }
      const response = await fetch(`/api/razorpay-encrypt/${user.uid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast.success("Payment settings updated successfully!");
      } else {
        toast.error("Failed to update payment settings. Please try again.");
      }
    } catch (error) {
      console.error("Error updating payment settings:", error);
      toast.error("Failed to update payment settings. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="razorpayKeyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razorpay Key ID</FormLabel>
              <FormControl>
                <Input placeholder="Enter your Razorpay Key ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="razorpayKeySecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razorpay Key Secret</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Enter your Razorpay Key Secret"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Payment Settings"}
        </Button>
      </form>
    </Form>
  );
}
