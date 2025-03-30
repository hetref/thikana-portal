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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  PlusCircle,
  Link as LinkIcon,
  Calendar as CalendarIcon,
  CreditCard,
  MoreHorizontal,
  AlertCircle,
  Copy,
  CheckCircle2,
  Clock,
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
  orderBy,
  Timestamp,
  updateDoc,
  serverTimestamp,
  onSnapshot,
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
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

// Schema for creating a payment link
const paymentLinkSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().default("INR"),
  description: z.string().min(1, "Description is required"),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  customerName: z.string().optional().or(z.literal("")),
  customerPhone: z.string().optional().or(z.literal("")),
  expiresAt: z.date().optional(),
});

// Schema for creating a subscription link
const subscriptionLinkSchema = z.object({
  planId: z.string().min(1, "Subscription plan is required"),
  customerEmail: z.string().email("Invalid email").min(1, "Email is required"),
  customerName: z.string().min(1, "Name is required"),
  customerPhone: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export default function PaymentsTab() {
  const [razorpayConfigured, setRazorpayConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isCreatePaymentDialogOpen, setIsCreatePaymentDialogOpen] =
    useState(false);
  const [isCreateSubscriptionDialogOpen, setIsCreateSubscriptionDialogOpen] =
    useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [paymentLinkUrl, setPaymentLinkUrl] = useState("");
  const [cancelSubscriptionDialogOpen, setCancelSubscriptionDialogOpen] =
    useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [cancelAtCycleEnd, setCancelAtCycleEnd] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [subscriptionDetailsOpen, setSubscriptionDetailsOpen] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Payment link form
  const paymentLinkForm = useForm({
    resolver: zodResolver(paymentLinkSchema),
    defaultValues: {
      amount: "",
      currency: "INR",
      description: "",
      customerEmail: "",
      customerName: "",
      customerPhone: "",
    },
  });

  // Subscription form
  const subscriptionForm = useForm({
    resolver: zodResolver(subscriptionLinkSchema),
    defaultValues: {
      planId: "",
      customerEmail: "",
      customerName: "",
      customerPhone: "",
      notes: "",
    },
  });

  // Check if Razorpay is configured
  useEffect(() => {
    const checkRazorpayConfiguration = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const response = await fetch(
          `/api/razorpay-check/${user.uid}?userId=${user.uid}`
        );
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

  // Fetch payment links function (extracted for reuse)
  useEffect(() => {
    if (!razorpayConfigured) return;

    const user = auth.currentUser;
    if (!user) return;

    // Set up real-time listener for payment links
    const linksRef = collection(db, "users", user.uid, "paymentLinks");
    const q = query(linksRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const links = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAtFormatted: doc.data().createdAt
            ? new Date(doc.data().createdAt.toDate()).toLocaleString()
            : "Unknown",
          expiresAtFormatted: doc.data().expiresAt
            ? new Date(doc.data().expiresAt.toDate()).toLocaleString()
            : "Never",
        }));

        setPaymentLinks(links);
      },
      (error) => {
        console.error("Error fetching payment links:", error);
        toast.error("Failed to fetch payment links");
      }
    );

    return () => unsubscribe();
  }, [razorpayConfigured]);

  // Fetch subscriptions
  useEffect(() => {
    if (!razorpayConfigured) return;

    const user = auth.currentUser;
    if (!user) return;

    // Set up real-time listener for subscriptions
    const subsRef = collection(db, "users", user.uid, "subscriptions");
    const q = query(subsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const subs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAtFormatted: doc.data().createdAt
            ? new Date(doc.data().createdAt.toDate()).toLocaleString()
            : "Unknown",
        }));

        setSubscriptions(subs);
      },
      (error) => {
        console.error("Error fetching subscriptions:", error);
        toast.error("Failed to fetch subscriptions");
      }
    );

    return () => unsubscribe();
  }, [razorpayConfigured]);

  // Fetch subscription plans
  useEffect(() => {
    const fetchPlans = async () => {
      if (!razorpayConfigured) return;

      const user = auth.currentUser;
      if (!user) return;

      try {
        // Fetch plans from the Razorpay API endpoint
        const response = await fetch(
          `/api/subscriptions/fetch-all-plans?userId=${user.uid}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch plans");
        }

        const data = await response.json();

        // Check if the plans array exists and has items
        if (data.plans && data.plans.length > 0) {
          // Store plans in state
          setPlans(data.plans);
        } else {
          setPlans([]);
        }
      } catch (error) {
        console.error("Error fetching subscription plans:", error);
        toast.error("Failed to fetch subscription plans");
        setPlans([]);
      }
    };

    fetchPlans();
  }, [razorpayConfigured]);

  // Handle payment link creation
  const handleCreatePaymentLink = async (data) => {
    setIsGeneratingLink(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      // Format data
      const paymentData = {
        ...data,
        amount: Number(data.amount) * 100, // Convert to paise
        notes: {
          userId: user.uid, // Add userId to notes
          ...(data.notes ? { customNote: data.notes } : {}), // If user provided notes, add them as customNote
        },
      };

      // Create payment link via API
      const response = await fetch("/api/payments/create-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          ...paymentData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create payment link");
      }

      toast.success("Payment link created successfully");

      // Show the payment link with copy option
      setPaymentLinkUrl(result.shortUrl);

      // We no longer need to manually refresh as onSnapshot will handle this
      // fetchPaymentLinks() is removed as onSnapshot will automatically update
    } catch (error) {
      console.error("Error creating payment link:", error);
      toast.error(error.message || "Failed to create payment link");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Handle subscription creation
  const handleCreateSubscription = async (data) => {
    setIsGeneratingLink(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      // Find the plan in the plans array
      const selectedPlan = plans.find((plan) => plan.id === data.planId);

      if (!selectedPlan) {
        throw new Error("Subscription plan not found");
      }

      // Create subscription via API
      const response = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          notes: {
            userId: user.uid, // Add userId to notes
            ...(data.notes ? { customNote: data.notes } : {}), // If user provided notes, add them as customNote
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create subscription");
      }

      // Save to Firestore
      // await addDoc(collection(db, "users", user.uid, "subscriptions"), {
      //   planId: data.planId,
      //   planName: selectedPlan.name,
      //   customerEmail: data.customerEmail,
      //   customerName: data.customerName,
      //   customerPhone: data.customerPhone,
      //   notes: {
      //     userId: user.uid,
      //     ...(data.notes ? { customNote: data.notes } : {}),
      //   },
      //   subscriptionId: result.id,
      //   status: "created",
      //   createdAt: serverTimestamp(),
      // });

      toast.success("Subscription created successfully");

      // Reset form
      subscriptionForm.reset();
      setIsCreateSubscriptionDialogOpen(false);
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast.error(error.message || "Failed to create subscription");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Copy payment link to clipboard
  const copyPaymentLink = () => {
    navigator.clipboard.writeText(paymentLinkUrl);
    setShowCopiedMessage(true);
    setTimeout(() => setShowCopiedMessage(false), 2000);
    toast.success("Payment link copied to clipboard");
  };

  // Reset payment link modal to create a new link
  const resetPaymentLinkModal = () => {
    setPaymentLinkUrl(""); // Clear the payment link URL
    paymentLinkForm.reset(); // Reset the form fields
  };

  // Get link status badge
  const getLinkStatusBadge = (status, expiresAt) => {
    // Check if expired
    if (expiresAt && new Date(expiresAt.toDate()) < new Date()) {
      return (
        <Badge
          variant="outline"
          className="bg-gray-50 text-gray-700 border-gray-200"
        >
          Expired
        </Badge>
      );
    }

    switch (status) {
      case "created":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Active
          </Badge>
        );
      case "paid":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Paid
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700">
            {status || "Unknown"}
          </Badge>
        );
    }
  };

  // Get subscription status badge
  const getSubscriptionStatusBadge = (status) => {
    switch (status) {
      case "created":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Active
          </Badge>
        );
      case "authenticated":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Authenticated
          </Badge>
        );
      case "active":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Active
          </Badge>
        );
      case "halted":
        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200"
          >
            Halted
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700">
            {status || "Unknown"}
          </Badge>
        );
    }
  };

  // Add a function to handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!selectedSubscription) return;

    setIsCancelling(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const response = await fetch(
        `/api/subscriptions/cancel/${selectedSubscription.subscriptionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.uid,
            cancelAtCycleEnd: cancelAtCycleEnd,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel subscription");
      }

      const result = await response.json();

      toast.success(result.message);
      setCancelSubscriptionDialogOpen(false);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error(error.message || "Failed to cancel subscription");
    } finally {
      setIsCancelling(false);
    }
  };

  // Add a function to open the cancel subscription dialog
  const openCancelDialog = (subscription) => {
    setSelectedSubscription(subscription);
    setCancelAtCycleEnd(true);
    setCancelSubscriptionDialogOpen(true);
  };

  // Add a function to open subscription details dialog
  const openSubscriptionDetails = async (subscription) => {
    setSelectedSubscription(subscription);
    setSubscriptionDetailsOpen(true);
    setLoadingDetails(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      // Fetch detailed subscription information from Razorpay
      const response = await fetch(
        `/api/subscriptions/details/${subscription.subscriptionId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch subscription details");
      }

      const result = await response.json();
      setSubscriptionDetails(result);
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      toast.error("Failed to fetch complete subscription details");
      // Still show the dialog with the basic information we have
      setSubscriptionDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  //   if (!razorpayConfigured) {
  //     return (
  //       <div className="space-y-4">
  //         <Alert className="bg-amber-50 border-amber-200">
  //           <AlertCircle className="h-4 w-4 text-amber-700" />
  //           <AlertTitle className="text-amber-700">
  //             Razorpay Not Configured
  //           </AlertTitle>
  //           <AlertDescription className="text-amber-700">
  //             Add Razorpay Key ID and Key Secret in your profile settings to
  //             access payment features.
  //           </AlertDescription>
  //         </Alert>
  //         <Card>
  //           <CardHeader className="pb-3">
  //             <CardTitle>Payment Management</CardTitle>
  //             <CardDescription>
  //               Create and manage payment links and subscriptions
  //             </CardDescription>
  //           </CardHeader>
  //           <CardContent className="text-center py-10">
  //             <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
  //               <CreditCard className="h-8 w-8 text-amber-500" />
  //             </div>
  //             <h3 className="text-lg font-medium mb-2">Payments Not Available</h3>
  //             <p className="text-muted-foreground mb-4 max-w-md mx-auto">
  //               To start accepting payments, please add your Razorpay API keys in
  //               your profile settings.
  //             </p>
  //             <Button asChild>
  //               <a href="/profile/settings">Configure Razorpay</a>
  //             </Button>
  //           </CardContent>
  //         </Card>
  //       </div>
  //     );
  //   }

  return (
    <div className="space-y-6">
      {/* Payment Links Section */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment Links</CardTitle>
            <CardDescription>
              Create and manage payment links for your customers
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-primary">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setIsCreatePaymentDialogOpen(true)}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Payment Link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsCreateSubscriptionDialogOpen(true)}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Subscription
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          {paymentLinks.length === 0 ? (
            <div className="text-center py-10">
              <LinkIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium">No payment links yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Create your first payment link using the button above.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">
                        {link.description}
                      </TableCell>
                      <TableCell>₹{(link.amount / 100).toFixed(2)}</TableCell>
                      <TableCell>{link.createdAtFormatted}</TableCell>
                      <TableCell>
                        {link.expiresAt ? link.expiresAtFormatted : "Never"}
                      </TableCell>
                      <TableCell>
                        {getLinkStatusBadge(link.status, link.expiresAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPaymentLinkUrl(link.shortUrl);
                            navigator.clipboard.writeText(link.shortUrl);
                            toast.success("Payment link copied to clipboard");
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscriptions Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>
            Manage recurring subscriptions for your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-10">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium">No subscriptions yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Create a subscription using the Create button above.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {subscription.customerName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {subscription.customerEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{subscription.planName}</TableCell>
                      <TableCell>{subscription.createdAtFormatted}</TableCell>
                      <TableCell>
                        {getSubscriptionStatusBadge(subscription.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                openSubscriptionDetails(subscription)
                              }
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openCancelDialog(subscription)}
                            >
                              Cancel Subscription
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Payment Link Dialog */}
      <Dialog
        open={isCreatePaymentDialogOpen}
        onOpenChange={setIsCreatePaymentDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Payment Link</DialogTitle>
            <DialogDescription>
              Create a payment link to share with your customers
            </DialogDescription>
          </DialogHeader>

          {paymentLinkUrl ? (
            <div className="space-y-4 py-4">
              <div className="text-center mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-medium">Payment Link Created!</h3>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                <input
                  type="text"
                  value={paymentLinkUrl}
                  readOnly
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                />
                <Button variant="ghost" size="sm" onClick={copyPaymentLink}>
                  {showCopiedMessage ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground mb-4">
                This link can be shared with your customer for immediate
                payment.
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreatePaymentDialogOpen(false)}
                >
                  Close
                </Button>
                <Button onClick={resetPaymentLinkModal}>Create Another</Button>
              </div>
            </div>
          ) : (
            <Form {...paymentLinkForm}>
              <form
                onSubmit={paymentLinkForm.handleSubmit(handleCreatePaymentLink)}
                className="space-y-4 py-4"
              >
                <FormField
                  control={paymentLinkForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentLinkForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Service payment" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={paymentLinkForm.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={paymentLinkForm.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Email (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="customer@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={paymentLinkForm.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentLinkForm.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expiry Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Never Expires</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreatePaymentDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isGeneratingLink}>
                    {isGeneratingLink ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Payment Link"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Subscription Dialog */}
      <Dialog
        open={isCreateSubscriptionDialogOpen}
        onOpenChange={setIsCreateSubscriptionDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Subscription</DialogTitle>
            <DialogDescription>
              Subscribe a customer to one of your subscription plans
            </DialogDescription>
          </DialogHeader>

          <Form {...subscriptionForm}>
            <form
              onSubmit={subscriptionForm.handleSubmit(handleCreateSubscription)}
              className="space-y-4 py-4"
            >
              <FormField
                control={subscriptionForm.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Plan</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.length === 0 ? (
                          <SelectItem value="no-plans" disabled>
                            No plans available
                          </SelectItem>
                        ) : (
                          plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} (₹{(plan.amount / 100).toFixed(2)} /{" "}
                              {plan.interval})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {plans.length === 0 && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-700" />
                  <AlertTitle className="text-amber-700">
                    No plans available
                  </AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Create a subscription plan in the Plans tab before creating
                    a subscription.
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={subscriptionForm.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Email</FormLabel>
                    <FormControl>
                      <Input placeholder="customer@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={subscriptionForm.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={subscriptionForm.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={subscriptionForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this subscription"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateSubscriptionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isGeneratingLink || plans.length === 0}
                >
                  {isGeneratingLink ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Subscription"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Subscription Details Dialog */}
      <Dialog
        open={subscriptionDetailsOpen}
        onOpenChange={setSubscriptionDetailsOpen}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              Complete information about this subscription
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="py-4 space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Customer Information
                </h3>
                <div className="bg-muted rounded-md p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Name
                    </p>
                    <p>
                      {selectedSubscription?.customerName || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Email
                    </p>
                    <p>
                      {selectedSubscription?.customerEmail || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Phone
                    </p>
                    <p>
                      {selectedSubscription?.customerPhone || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan Details */}
              <div>
                <h3 className="text-lg font-medium mb-2">Plan Information</h3>
                <div className="bg-muted rounded-md p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Plan Name
                    </p>
                    <p>{selectedSubscription?.planName || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Plan ID
                    </p>
                    <p className="font-mono text-sm">
                      {selectedSubscription?.planId || "Not specified"}
                    </p>
                  </div>
                  {subscriptionDetails?.planDetails && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Amount
                        </p>
                        <p>
                          ₹
                          {(
                            (subscriptionDetails.planDetails.amount || 0) / 100
                          ).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Interval
                        </p>
                        <p>
                          {subscriptionDetails.planDetails.interval ||
                            "Not specified"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Subscription Status */}
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Subscription Status
                </h3>
                <div className="bg-muted rounded-md p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Status
                    </p>
                    <div className="mt-1">
                      {getSubscriptionStatusBadge(selectedSubscription?.status)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Created On
                    </p>
                    <p>
                      {selectedSubscription?.createdAtFormatted ||
                        "Not specified"}
                    </p>
                  </div>
                  {subscriptionDetails && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Subscription ID
                        </p>
                        <p className="font-mono text-sm">
                          {selectedSubscription?.subscriptionId}
                        </p>
                      </div>
                      {subscriptionDetails.currentPeriod && (
                        <>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Current Period Start
                            </p>
                            <p>
                              {new Date(
                                subscriptionDetails.currentPeriod.start * 1000
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Current Period End
                            </p>
                            <p>
                              {new Date(
                                subscriptionDetails.currentPeriod.end * 1000
                              ).toLocaleString()}
                            </p>
                          </div>
                        </>
                      )}
                      {subscriptionDetails.total_count !== undefined && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Total Payments
                          </p>
                          <p>{subscriptionDetails.total_count}</p>
                        </div>
                      )}
                      {subscriptionDetails.paid_count !== undefined && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Successful Payments
                          </p>
                          <p>{subscriptionDetails.paid_count}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Additional Notes */}
              {selectedSubscription?.notes && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Notes</h3>
                  <div className="bg-muted rounded-md p-4">
                    <p>
                      {selectedSubscription.notes.customNote ||
                        "No additional notes"}
                    </p>
                  </div>
                </div>
              )}

              {/* Payment History */}
              {subscriptionDetails?.payments &&
                subscriptionDetails.payments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Payment History
                    </h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subscriptionDetails.payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>
                                {new Date(
                                  payment.created_at * 1000
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                ₹{(payment.amount / 100).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`
                                  ${payment.status === "captured" ? "bg-green-50 text-green-700 border-green-200" : ""}
                                  ${payment.status === "failed" ? "bg-red-50 text-red-700 border-red-200" : ""}
                                  ${payment.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" : ""}
                                `}
                                >
                                  {payment.status.charAt(0).toUpperCase() +
                                    payment.status.slice(1)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setSubscriptionDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog
        open={cancelSubscriptionDialogOpen}
        onOpenChange={setCancelSubscriptionDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this subscription?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedSubscription && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Customer
                      </p>
                      <p className="text-sm">
                        {selectedSubscription.customerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Email
                      </p>
                      <p className="text-sm">
                        {selectedSubscription.customerEmail}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Plan
                      </p>
                      <p className="text-sm">{selectedSubscription.planName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Status
                      </p>
                      <p className="text-sm">{selectedSubscription.status}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cancelAtCycleEnd"
                    checked={cancelAtCycleEnd}
                    onCheckedChange={setCancelAtCycleEnd}
                  />
                  <label
                    htmlFor="cancelAtCycleEnd"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Cancel at the end of current billing cycle
                  </label>
                </div>

                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-700" />
                  <AlertTitle className="text-amber-700">
                    Cancellation Policy
                  </AlertTitle>
                  <AlertDescription className="text-amber-700">
                    {cancelAtCycleEnd
                      ? "The subscription will continue until the end of the current billing cycle, then it will be cancelled."
                      : "The subscription will be cancelled immediately, and the customer will no longer be charged."}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelSubscriptionDialogOpen(false)}
            >
              Keep Subscription
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Subscription"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
