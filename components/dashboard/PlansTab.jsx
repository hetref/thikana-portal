"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  ClockIcon,
  AlertCircle,
  CreditCard,
  Edit,
  Trash2,
  CalendarIcon,
  Eye,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import Loader from "@/components/Loader";

// Schema for subscription plan
const planSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().default("INR"),
  interval: z.string().min(1, "Billing interval is required"),
  intervalCount: z.string().min(1, "Interval count is required"),
  billingCycles: z.string().optional(),
  trialDays: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export default function PlansTab() {
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [isViewPlanDialogOpen, setIsViewPlanDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Plan creation/edit form
  const form = useForm({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      description: "",
      amount: "",
      currency: "INR",
      interval: "monthly",
      intervalCount: "1",
      billingCycles: "",
      trialDays: "",
      notes: "",
      isActive: true,
    },
  });

  // Check if Razorpay is configured
  useEffect(() => {
    const checkRazorpayConfiguration = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const response = await fetch(`/api/razorpay-check/${user.uid}`);
        const data = await response.json();

        setRazorpayConfigured(data.isConfigured);
      } catch (error) {
        console.error("Error checking Razorpay configuration:", error);
        setRazorpayConfigured(false);
      } finally {
        setLoading(false);
      }
    };

    checkRazorpayConfiguration();
  }, []);

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      if (!razorpayConfigured) return;

      const user = auth.currentUser;
      if (!user) return;

      try {
        setLoading(true);

        // Fetch plans directly from Razorpay
        const response = await fetch(
          `/api/subscriptions/fetch-all-plans?userId=${user.uid}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch plans from Razorpay");
        }

        const data = await response.json();

        // Format plans with local display data
        const formattedPlans = data.plans.map((plan) => {
          // Extract note text from notes object if needed
          let noteText = "";
          if (plan.notes) {
            if (typeof plan.notes === "string") {
              noteText = plan.notes;
            } else if (typeof plan.notes === "object") {
              // Try to get the note from the notes object
              noteText =
                plan.notes.note ||
                plan.notes.notes ||
                Object.values(plan.notes)[0] ||
                "";
            }
          }

          return {
            id: plan.id, // Use Razorpay plan ID directly as the ID
            planId: plan.id,
            name: plan.name,
            description: plan.description || "",
            amount: plan.amount,
            currency: plan.currency,
            interval: plan.interval,
            intervalCount: plan.intervalCount,
            billingCycles: plan.billingCycles,
            trialDays: plan.trialDays,
            notes: noteText, // Use the extracted note text
            rawNotes: plan.notes, // Keep the original notes object for API calls
            isActive: true, // Assume all Razorpay plans are active
            createdAtFormatted: new Date(
              plan.created_at * 1000
            ).toLocaleString(),
          };
        });

        setPlans(formattedPlans);
      } catch (error) {
        console.error("Error fetching plans:", error);
        toast.error("Failed to fetch subscription plans");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [razorpayConfigured]);

  // Function to refresh plans from Razorpay
  const refreshPlans = async () => {
    if (!razorpayConfigured) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      // Fetch plans directly from Razorpay
      const response = await fetch(
        `/api/subscriptions/fetch-all-plans?userId=${user.uid}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch plans from Razorpay");
      }

      const data = await response.json();

      // Format plans with local display data
      const formattedPlans = data.plans.map((plan) => {
        // Extract note text from notes object if needed
        let noteText = "";
        if (plan.notes) {
          if (typeof plan.notes === "string") {
            noteText = plan.notes;
          } else if (typeof plan.notes === "object") {
            // Try to get the note from the notes object
            noteText =
              plan.notes.note ||
              plan.notes.notes ||
              Object.values(plan.notes)[0] ||
              "";
          }
        }

        return {
          id: plan.id, // Use Razorpay plan ID directly as the ID
          planId: plan.id,
          name: plan.name,
          description: plan.description || "",
          amount: plan.amount,
          currency: plan.currency,
          interval: plan.interval,
          intervalCount: plan.intervalCount,
          billingCycles: plan.billingCycles,
          trialDays: plan.trialDays,
          notes: noteText, // Use the extracted note text
          rawNotes: plan.notes, // Keep the original notes object for API calls
          isActive: true, // Assume all Razorpay plans are active
          createdAtFormatted: new Date(plan.created_at * 1000).toLocaleString(),
        };
      });

      setPlans(formattedPlans);
    } catch (error) {
      console.error("Error refreshing plans:", error);
      toast.error("Failed to refresh subscription plans");
    }
  };

  // Create or update plan
  const handleCreateOrUpdatePlan = async (data) => {
    setIsSubmitting(true);

    const user = auth.currentUser;
    if (!user) {
      toast.error("You must be logged in");
      setIsSubmitting(false);
      return;
    }

    try {
      // Format data
      const planData = {
        ...data,
        amount: Number(data.amount) * 100, // Convert to paise
        intervalCount: Number(data.intervalCount),
        billingCycles: data.billingCycles ? Number(data.billingCycles) : null,
        trialDays: data.trialDays ? Number(data.trialDays) : 0,
      };

      // For edit mode
      if (selectedPlan) {
        // If we have the original rawNotes object, use it instead of the extracted notes text
        // to preserve the original structure when updating
        if (
          selectedPlan.rawNotes &&
          typeof selectedPlan.rawNotes === "object"
        ) {
          // Add userId to notes
          const updatedNotes = {
            ...selectedPlan.rawNotes,
            userId: user.uid,
          };

          // Update the customNote in the existing structure
          if (planData.notes) {
            updatedNotes.customNote = planData.notes;
          }

          // Replace the plain notes with the structured rawNotes
          planData.notes = updatedNotes;
        } else {
          // Create a new notes object with userId
          planData.notes = {
            userId: user.uid,
            customNote: planData.notes || "",
          };
        }

        // Update plan via API
        const response = await fetch(
          `/api/subscriptions/update-plan/${selectedPlan.id}`,
          {
            method: "PUT", // Make sure the method is PUT not POST
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.uid,
              ...planData,
            }),
          }
        );

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Failed to update plan");
        }

        toast.success("Subscription plan updated successfully");
        setIsViewPlanDialogOpen(false);
      } else {
        // Add userId to notes for new plans
        planData.notes = {
          userId: user.uid,
          customNote: planData.notes || "",
        };

        // Create plan via API
        const response = await fetch("/api/subscriptions/create-plan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.uid,
            ...planData,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to create plan");
        }

        toast.success("Subscription plan created successfully");
        setIsCreatePlanDialogOpen(false);
      }

      // Refresh plans from Razorpay
      await refreshPlans();
      form.reset();
    } catch (error) {
      console.error("Error creating/updating plan:", error);
      toast.error(error.message || "Failed to process subscription plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle view plan
  const handleViewPlan = (plan) => {
    setSelectedPlan(plan);
    setIsViewPlanDialogOpen(true);
  };

  // Format interval text
  const formatInterval = (interval, count) => {
    if (!interval) return "N/A";

    const intervalText = interval.charAt(0).toUpperCase() + interval.slice(1);

    if (count === 1) {
      return `${intervalText}`;
    }

    return `Every ${count} ${interval}s`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader/>
      </div>
    );
  }

  if (!razorpayConfigured) {
    return (
      <div className="space-y-4">
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-700">
            Razorpay Not Configured
          </AlertTitle>
          <AlertDescription className="text-amber-700">
            Add Razorpay Key ID and Key Secret in your profile settings to
            access plans features.
          </AlertDescription>
        </Alert>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>
              Create and manage subscription plans for your customers
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-10">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">Plans Not Available</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              To start creating subscription plans, please add your Razorpay API
              keys in your profile settings.
            </p>
            <Button asChild>
              <a href="/profile/settings">Configure Razorpay</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>
              Create and manage plans for recurring subscriptions
            </CardDescription>
          </div>
          <Button
            className="bg-primary"
            onClick={() => {
              form.reset();
              setSelectedPlan(null);
              setIsCreatePlanDialogOpen(true);
            }}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-10">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium">
                No subscription plans yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Create your first subscription plan using the button above.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{plan.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {plan.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>₹{(plan.amount / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        {formatInterval(plan.interval, plan.intervalCount)}
                        {plan.trialDays > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {plan.trialDays}-day trial
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {plan.isActive !== false ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-700 border-gray-200"
                          >
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewPlan(plan)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Plan Dialog */}
      <Dialog
        open={isCreatePlanDialogOpen}
        onOpenChange={setIsCreatePlanDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Subscription Plan</DialogTitle>
            <DialogDescription>
              Create a new subscription plan for your customers
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleCreateOrUpdatePlan)}
              className="space-y-4 py-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Basic Plan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Basic features with monthly billing"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="interval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Period</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="intervalCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interval Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of intervals between billings
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billingCycles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Cycles (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Leave empty for unlimited"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        How many times to bill (leave empty for unlimited)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trialDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trial Period (Days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Free trial period in days (0 for no trial)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this plan"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Plan Active</FormLabel>
                      <FormDescription>
                        Active plans can be used to create new subscriptions
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreatePlanDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader/>
                      Creating...
                    </>
                  ) : (
                    "Create Plan"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Plan Dialog */}
      <Dialog
        open={isViewPlanDialogOpen}
        onOpenChange={setIsViewPlanDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>View Subscription Plan</DialogTitle>
            <DialogDescription>
              Details of your subscription plan
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Plan Name
                </h4>
                <p className="text-lg font-medium">{selectedPlan.name}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Description
                </h4>
                <p className="text-sm">{selectedPlan.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Amount
                  </h4>
                  <p className="text-lg font-medium">
                    ₹{(selectedPlan.amount / 100).toFixed(2)}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Currency
                  </h4>
                  <p className="text-sm">{selectedPlan.currency}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Billing Period
                  </h4>
                  <p className="text-sm">
                    {formatInterval(
                      selectedPlan.interval,
                      selectedPlan.intervalCount
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Status
                  </h4>
                  <Badge
                    variant="outline"
                    className={
                      selectedPlan.isActive !== false
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }
                  >
                    {selectedPlan.isActive !== false ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {selectedPlan.billingCycles && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Billing Cycles
                  </h4>
                  <p className="text-sm">{selectedPlan.billingCycles} cycles</p>
                </div>
              )}

              {selectedPlan.trialDays > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Trial Period
                  </h4>
                  <p className="text-sm">{selectedPlan.trialDays} days</p>
                </div>
              )}

              {selectedPlan.notes && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Notes
                  </h4>
                  <p className="text-sm">{selectedPlan.notes}</p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Created At
                </h4>
                <p className="text-sm">{selectedPlan.createdAtFormatted}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsViewPlanDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
