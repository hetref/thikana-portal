"use client";
import { useState, useEffect, useCallback } from "react";
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
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/Loader";

// Schema with more specific validations
const paymentSchema = z.object({
  razorpayKeyId: z.string().min(10, "Razorpay Key ID is too short"),
  razorpayKeySecret: z.string().min(10, "Razorpay Key Secret is too short"),
});

export default function PaymentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const user = auth.currentUser;

  // Create form with better defaults
  const form = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      razorpayKeyId: "",
      razorpayKeySecret: "",
    },
    mode: "onChange", // Validate on change for immediate feedback
  });

  // Save data function
  const saveData = useCallback(
    async (data) => {
      if (!user) throw new Error("User not authenticated");

      const response = await fetch(`/api/razorpay-encrypt/${user.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update payment settings");
      }

      return await response.json();
    },
    [user]
  );

  // Load user data - only once on component mount
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage("");
        const response = await fetch(`/api/razorpay-encrypt/${user.uid}`);

        if (!response.ok) {
          if (response.status !== 404) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          // 404 is handled silently - just means no data yet
          if (isMounted) setIsLoading(false);
          return;
        }

        const data = await response.json();

        if (isMounted) {
          form.reset({
            razorpayKeyId: data.razorpayKeyId || "",
            razorpayKeySecret: data.razorpayKeySecret || "",
          });
        }
      } catch (error) {
        console.error("Error fetching Razorpay data:", error);
        if (isMounted) {
          setErrorMessage("Failed to load payment settings. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Execute fetch immediately
    fetchData();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array ensures this runs only once

  async function onSubmit(data) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await saveData(data);
      toast.success("Payment settings updated successfully!");
    } catch (error) {
      console.error("Error updating payment settings:", error);
      setErrorMessage(error.message || "Failed to update payment settings");
      toast.error(error.message || "Failed to update payment settings");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader/>
        <span>Loading payment settings...</span>
      </div>
    );
  }

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle>Razorpay Payment Settings</CardTitle>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-md text-sm">
            {errorMessage}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="razorpayKeyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razorpay Key ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your Razorpay Key ID"
                      {...field}
                      autoComplete="off"
                    />
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
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your Razorpay Key Secret"
                        {...field}
                        autoComplete="off"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-700"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isDirty}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader/>
                  Saving...
                </>
              ) : (
                "Save Payment Settings"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
