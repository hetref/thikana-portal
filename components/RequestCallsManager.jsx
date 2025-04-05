"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  Loader2,
  Check,
  X,
  Clock,
  Calendar,
  User,
  Mail,
  FileText,
  AlertCircle,
  Code,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RequestCallsManager() {
  const [callRequests, setCallRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [processingCall, setProcessingCall] = useState(false);
  const [callSummary, setCallSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const user = auth.currentUser;
  const [debugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const requestsRef = collection(db, "users", user.uid, "requestCalls");
    const q = query(requestsRef, orderBy("requestedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const requests = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCallRequests(requests);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching call requests:", error);
        toast.error("Failed to load call requests");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleMakeCall = async (request) => {
    if (!user) return;

    if (!request.userPhone) {
      toast.error("User has no phone number registered");
      return;
    }

    setProcessingCall(true);

    try {
      // Get the script content
      const scriptDoc = await getDoc(
        doc(db, "users", user.uid, "callScripts", request.scriptId)
      );

      if (!scriptDoc.exists()) {
        throw new Error("Script not found");
      }

      const scriptData = scriptDoc.data();

      // Make the call with Bland AI API
      const response = await fetch("/api/bland-ai/initiate-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: request.userPhone,
          script: scriptData.script,
          request_id: request.id,
          // Use Twilio number as caller_id if available
          caller_id: user.twilioNumber || undefined,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to initiate call");
      }

      // Update the request status
      await updateDoc(doc(db, "users", user.uid, "requestCalls", request.id), {
        status: "initiated",
        callStartedAt: Timestamp.now(),
        callId: responseData.call_id,
      });

      toast.success("Call initiated successfully");
      setShowDetailsDialog(false);

      // Reset summary when opening a new call details
      setCallSummary(null);

      // If call has been initiated, fetch the summary
      if (responseData.call_id && request.status === "initiated") {
        fetchCallSummary(responseData.call_id);
      }
    } catch (error) {
      console.error("Error initiating call:", error);
      toast.error(error.message || "Failed to initiate call");
    } finally {
      setProcessingCall(false);
    }
  };

  const handleCancelRequest = async (request) => {
    if (!user) return;

    if (!confirm("Are you sure you want to cancel this request?")) return;

    try {
      await updateDoc(doc(db, "users", user.uid, "requestCalls", request.id), {
        status: "cancelled",
        cancelledAt: Timestamp.now(),
      });

      toast.success("Request cancelled");
      setShowDetailsDialog(false);
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("Failed to cancel request");
    }
  };

  const handleDeleteRequest = async (request) => {
    if (!user) return;

    if (
      !confirm(
        "Are you sure you want to delete this request? This action cannot be undone."
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "requestCalls", request.id));
      toast.success("Request deleted");
      setShowDetailsDialog(false);
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error("Failed to delete request");
    }
  };

  const handleRetryCall = async (request) => {
    setProcessingCall(true);
    try {
      const response = await fetch("/api/bland-ai/auto-call-handler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          businessId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to initiate call");
      }

      toast.success("Call initiated successfully");
      setShowDetailsDialog(false);
    } catch (error) {
      console.error("Error retrying call:", error);
      toast.error(error.message || "Failed to retry call");
    } finally {
      setProcessingCall(false);
    }
  };

  const fetchCallSummary = async (callId) => {
    if (!callId) return;

    setLoadingSummary(true);
    try {
      const response = await fetch(
        `/api/bland-ai/call-details?call_id=${callId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch call details");
      }

      const data = await response.json();
      setCallSummary(data);
    } catch (error) {
      console.error("Error fetching call summary:", error);
      toast.error("Failed to load call summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const openDetailsDialog = (request) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);

    // Reset summary when opening a new call details
    setCallSummary(null);

    // If call has been initiated, fetch the summary
    if (request.callId && request.status === "initiated") {
      fetchCallSummary(request.callId);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";

    try {
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  const getStatusBadge = (status, autoHandled) => {
    // Create badge classnames based on status
    const getBadgeClasses = (color) =>
      `bg-${color}-50 text-${color}-700 border-${color}-200`;

    let badge;
    switch (status) {
      case "pending":
        badge = (
          <Badge variant="outline" className={getBadgeClasses("yellow")}>
            {autoHandled ? "Auto-processing" : "Pending"}
          </Badge>
        );
        break;
      case "initiated":
        badge = (
          <Badge variant="outline" className={getBadgeClasses("blue")}>
            Call Initiated
          </Badge>
        );
        break;
      case "cancelled":
        badge = (
          <Badge variant="outline" className={getBadgeClasses("red")}>
            Cancelled
          </Badge>
        );
        break;
      case "failed":
        badge = (
          <Badge variant="outline" className={getBadgeClasses("red")}>
            Failed
          </Badge>
        );
        break;
      default:
        badge = <Badge variant="outline">Unknown</Badge>;
    }

    return badge;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Call Requests</h2>
        <p className="text-muted-foreground">
          Manage call requests from your customers
        </p>
      </div>

      {callRequests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="text-muted-foreground">No call requests yet</div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>
              You have {callRequests.length} call requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Call Type</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.userName}
                    </TableCell>
                    <TableCell>
                      {request.callTypeName || request.callType}
                    </TableCell>
                    <TableCell>{formatDate(request.requestedAt)}</TableCell>
                    <TableCell>
                      {getStatusBadge(request.status, request.autoProcessing)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetailsDialog(request)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Request Details Dialog */}
      {selectedRequest && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Call Request Details</DialogTitle>
              <DialogDescription>
                Request from {selectedRequest.userName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div>
                    {getStatusBadge(
                      selectedRequest.status,
                      selectedRequest.autoProcessing
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Requested At
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedRequest.requestedAt)}
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-2">Customer Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedRequest.userName}</span>
                  </div>
                  {selectedRequest.userPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedRequest.userPhone}</span>
                    </div>
                  )}
                  {selectedRequest.userEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedRequest.userEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-2">Call Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Script:{" "}
                    </span>
                    <span>{selectedRequest.scriptName}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Call Type:{" "}
                    </span>
                    <span>
                      {selectedRequest.callTypeName || selectedRequest.callType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Add Call Summary section */}
              {selectedRequest.callId &&
                selectedRequest.status === "initiated" && (
                  <>
                    <Separator />

                    <div>
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Call Summary
                      </h3>

                      {loadingSummary ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      ) : callSummary ? (
                        <div className="text-sm bg-secondary/30 p-3 rounded-md">
                          {callSummary.summary || "No summary available yet."}
                        </div>
                      ) : (
                        // <Tabs defaultValue="summary" className="w-full">
                        //   <TabsList className="grid w-full grid-cols-1">
                        //     <TabsTrigger value="summary">Summary</TabsTrigger>
                        //     {/* <TabsTrigger value="transcript">
                        //       Transcript
                        //     </TabsTrigger> */}
                        //   </TabsList>

                        //   <TabsContent value="summary" className="pt-2">

                        //   </TabsContent>

                        //   {/* <TabsContent value="transcript" className="pt-2">
                        //     <ScrollArea className="h-60 rounded-md border p-2">
                        //       {callSummary?.transcript &&
                        //       callSummary.transcript.length > 0 ? (
                        //         <div className="space-y-2 text-sm">
                        //           {callSummary.transcript.map((entry, i) => (
                        //             <div
                        //               key={i}
                        //               className={`p-2 rounded-md ${
                        //                 entry.speaker === "AI"
                        //                   ? "bg-muted/50"
                        //                   : "bg-primary/10"
                        //               }`}
                        //             >
                        //               <span className="font-semibold">
                        //                 {entry.speaker === "AI"
                        //                   ? "Assistant"
                        //                   : "Customer"}
                        //                 :
                        //               </span>{" "}
                        //               {entry.text}
                        //             </div>
                        //           ))}
                        //         </div>
                        //       ) : (
                        //         <div className="text-center text-muted-foreground p-4 flex flex-col items-center gap-2">
                        //           <AlertCircle className="h-5 w-5" />
                        //           <span>
                        //             No transcript data available yet. The call
                        //             may still be in progress or the transcript
                        //             hasn't been processed.
                        //           </span>
                        //         </div>
                        //       )}
                        //     </ScrollArea>
                        //   </TabsContent> */}
                        // </Tabs>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            Call summary not available. The call may still be in
                            progress or has not been processed yet.
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}

              {/* Add a debug section that displays the raw data in development mode for troubleshooting */}
              {process.env.NODE_ENV === "development" && callSummary && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => setDebugOpen(!debugOpen)}
                  >
                    <Code className="h-4 w-4" />
                    <span>Debug: Raw Call Data</span>
                    {debugOpen ? (
                      <ChevronUp className="h-4 w-4 ml-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </Button>

                  {debugOpen && (
                    <pre className="text-xs p-2 bg-muted rounded-md overflow-auto max-h-40 mt-2">
                      {JSON.stringify(callSummary, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              <Separator />

              <div>
                <h3 className="font-medium mb-2">Call Status</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Status:{" "}
                    </span>
                    <span>{selectedRequest.callStatus}</span>
                  </div>
                  {selectedRequest.callId && (
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Call ID:{" "}
                      </span>
                      <span className="font-mono text-xs">
                        {selectedRequest.callId}
                      </span>
                    </div>
                  )}
                  {selectedRequest.callStartedAt && (
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Started:{" "}
                      </span>
                      <span>{formatDate(selectedRequest.callStartedAt)}</span>
                    </div>
                  )}
                  {selectedRequest.completedAt && (
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Completed:{" "}
                      </span>
                      <span>{formatDate(selectedRequest.completedAt)}</span>
                    </div>
                  )}
                  {selectedRequest.failedAt && (
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Failed:{" "}
                      </span>
                      <span>{formatDate(selectedRequest.failedAt)}</span>
                    </div>
                  )}
                  {selectedRequest.failureReason && (
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Reason:{" "}
                      </span>
                      <span className="text-red-600">
                        {selectedRequest.failureReason}
                      </span>
                    </div>
                  )}
                  {selectedRequest.autoProcessing && (
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-600 border-blue-200"
                      >
                        Auto-processing enabled
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {selectedRequest.transcript && (
                <div className="mt-4">
                  <h4 className="font-medium mb-1">Call Transcript</h4>
                  <div className="max-h-[200px] overflow-y-auto border rounded p-3 text-sm bg-gray-50">
                    <p className="whitespace-pre-line">
                      {selectedRequest.transcript}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              {selectedRequest.status === "pending" && (
                <>
                  <Button
                    onClick={() => handleMakeCall(selectedRequest)}
                    disabled={processingCall || !selectedRequest.userPhone}
                    className="w-full sm:w-auto"
                  >
                    {processingCall ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Initiating...
                      </>
                    ) : (
                      <>
                        <Phone className="mr-2 h-4 w-4" />
                        Make Call
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCancelRequest(selectedRequest)}
                    className="w-full sm:w-auto"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel Request
                  </Button>
                </>
              )}

              {(selectedRequest.status === "initiated" ||
                selectedRequest.status === "cancelled") && (
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteRequest(selectedRequest)}
                  className="w-full sm:w-auto"
                >
                  Delete Request
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
