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
  setDoc,
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
import Loader from "@/components/Loader";

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
  const [savingBooking, setSavingBooking] = useState(false);
  const [processingDetails, setProcessingDetails] = useState(false);
  const [retryingFailedCalls, setRetryingFailedCalls] = useState(false);

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

      // Make the call with VAPI API
      const response = await fetch("/api/vapi/initiate-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: request.userPhone,
          script: scriptData.script,
          request_id: request.id,
          language: scriptData.language || "en",
          voiceConfig: {
            provider: scriptData.voiceProvider || "11labs",
            voiceId: scriptData.voiceId || "bIHbv24MWmeRgasZH58o",
            model: scriptData.voiceModel || "eleven_turbo_v2_5",
          },
          transcriptionConfig: {
            provider: "deepgram",
            model: "nova-2",
            language: scriptData.language === "hi" ? "hi" : "en",
          },
          assistantConfig: {
            provider: "openai",
            model: "gpt-4o-mini",
          },
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
        assistantId: responseData.assistant_id,
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
      const response = await fetch("/api/vapi/auto-call-handler", {
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
      const response = await fetch(`/api/vapi/call-details?call_id=${callId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

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

    // If call has been initiated or completed, check for summary
    if (
      request.callId &&
      (request.status === "initiated" || request.status === "completed")
    ) {
      // First check if we have summary in the database
      if (request.callSummary) {
        setCallSummary({
          summary: request.callSummary,
          transcript: request.transcript,
          booking_info: request.bookingInfo,
          duration: request.callDuration,
          ended_reason: request.endedReason,
        });
      } else {
        // If not in database, fetch from VAPI API
        fetchCallSummary(request.callId);
      }
    }
  };

  const processCallDetails = async (callId, businessId) => {
    if (!callId || !businessId) return;

    setProcessingDetails(true);
    try {
      const response = await fetch(`/api/vapi/process-call-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: callId,
          businessId: businessId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process call details");
      }

      const data = await response.json();

      // Update the call summary with processed data
      setCallSummary({
        summary: data.data.summary,
        transcript: data.data.transcript,
        booking_info: data.data.bookingInfo,
        duration: data.data.duration,
        ended_reason: data.data.endedReason,
      });

      toast.success("Call details processed successfully");
    } catch (error) {
      console.error("Error processing call details:", error);
      toast.error("Failed to process call details");
    } finally {
      setProcessingDetails(false);
    }
  };

  const retryFailedCalls = async () => {
    if (!user) return;

    setRetryingFailedCalls(true);
    try {
      const response = await fetch(`/api/vapi/retry-failed-calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to retry failed calls");
      }

      const data = await response.json();

      toast.success(
        `Processed ${data.processedCount} calls. ${data.successCount} successful, ${data.failCount} failed.`
      );

      console.log("Retry results:", data.results);
    } catch (error) {
      console.error("Error retrying failed calls:", error);
      toast.error("Failed to retry failed calls");
    } finally {
      setRetryingFailedCalls(false);
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
      case "completed":
        badge = (
          <Badge variant="outline" className={getBadgeClasses("green")}>
            Completed
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
      case "ended":
        badge = (
          <Badge variant="outline" className={getBadgeClasses("green")}>
            Ended
          </Badge>
        );
        break;
      case "in-progress":
        badge = (
          <Badge variant="outline" className={getBadgeClasses("blue")}>
            In Progress
          </Badge>
        );
        break;
      case "ringing":
        badge = (
          <Badge variant="outline" className={getBadgeClasses("yellow")}>
            Ringing
          </Badge>
        );
        break;
      default:
        badge = <Badge variant="outline">Unknown</Badge>;
    }

    return badge;
  };

  const saveBookingInfo = async (bookingInfo, callId) => {
    if (!user || !bookingInfo || !callId) return;

    setSavingBooking(true);
    try {
      // Format the booking data
      const bookingData = {
        ...bookingInfo,
        callId: callId,
        status: "new", // new, confirmed, cancelled, completed
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Add it to the bookings collection
      const bookingRef = doc(collection(db, "users", user.uid, "bookings"));
      await setDoc(bookingRef, bookingData);

      // Also update the call request to mark that booking was saved
      await updateDoc(
        doc(db, "users", user.uid, "requestCalls", selectedRequest.id),
        {
          bookingSaved: true,
          bookingId: bookingRef.id,
        }
      );

      toast.success("Booking information saved");

      // Update the local state to reflect the change
      setSelectedRequest({
        ...selectedRequest,
        bookingSaved: true,
        bookingId: bookingRef.id,
      });
    } catch (error) {
      console.error("Error saving booking information:", error);
      toast.error("Failed to save booking information");
    } finally {
      setSavingBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Call History</h2>
          <p className="text-muted-foreground">
            View and manage your call history
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={retryFailedCalls}
            disabled={retryingFailedCalls}
            className="shrink-0"
          >
            {retryingFailedCalls ? (
              <>
                <Loader />
                Processing...
              </>
            ) : (
              "Retry Failed Calls"
            )}
          </Button>
        </div>
      </div>

      {callRequests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="text-muted-foreground">No calls yet</div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>
              You have {callRequests.length} calls
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
                      {getStatusBadge(
                        request.callStatus || request.status,
                        request.autoProcessing
                      )}
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
              <DialogTitle>Call Details</DialogTitle>
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
                      selectedRequest.callStatus || selectedRequest.status,
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
                (selectedRequest.status === "initiated" ||
                  selectedRequest.status === "completed") && (
                  <>
                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Call Summary
                        </h3>
                        {!callSummary && !loadingSummary && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              processCallDetails(
                                selectedRequest.callId,
                                user.uid
                              )
                            }
                            disabled={processingDetails}
                          >
                            {processingDetails ? (
                              <>
                                <Loader />
                                Processing...
                              </>
                            ) : (
                              "Load Summary"
                            )}
                          </Button>
                        )}
                      </div>

                      {loadingSummary ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      ) : callSummary ? (
                        <div className="space-y-3">
                          <div className="text-sm bg-secondary/30 p-3 rounded-md">
                            {callSummary.summary || "No summary available."}
                          </div>

                          {/* Key Points extraction from summary/transcript */}
                          {callSummary && (
                            <div className="border-t pt-3">
                              <h4 className="text-sm font-medium mb-2">
                                Key Points
                              </h4>
                              {(() => {
                                const items = [];
                                const raw = `${callSummary.summary || ""}\n${callSummary.transcript || ""}`;
                                const text = raw.toLowerCase();
                                // Extract order number like #1234 or Order 1234
                                const orderMatch = raw.match(
                                  /(#\d{3,}|order\s*#?\s*(\d{3,}))/i
                                );
                                const phoneMatch = raw.match(
                                  /\+?[0-9][0-9\s\-()]{8,}/
                                );
                                const emailMatch = raw.match(
                                  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
                                );
                                if (text.includes("refund"))
                                  items.push({
                                    label: "Refund",
                                    value: "Requested",
                                  });
                                if (orderMatch)
                                  items.push({
                                    label: "Order",
                                    value: orderMatch[0]
                                      .replace(/order\s*/i, "")
                                      .trim(),
                                  });
                                if (phoneMatch)
                                  items.push({
                                    label: "Phone",
                                    value: phoneMatch[0],
                                  });
                                if (emailMatch)
                                  items.push({
                                    label: "Email",
                                    value: emailMatch[0],
                                  });
                                if (text.includes("address"))
                                  items.push({
                                    label: "Address",
                                    value: "Discussed",
                                  });
                                if (callSummary.ended_reason)
                                  items.push({
                                    label: "Ended Reason",
                                    value: callSummary.ended_reason,
                                  });
                                if (items.length === 0)
                                  items.push({
                                    label: "Info",
                                    value: "No specific key points detected",
                                  });
                                return (
                                  <ul className="list-disc pl-5 text-sm space-y-1">
                                    {items.map((kv, idx) => (
                                      <li key={idx}>
                                        <span className="font-medium">
                                          {kv.label}:
                                        </span>{" "}
                                        {kv.value}
                                      </li>
                                    ))}
                                  </ul>
                                );
                              })()}
                            </div>
                          )}

                          {/* Call Details */}
                          {(callSummary.duration ||
                            callSummary.ended_reason) && (
                            <div className="text-xs text-muted-foreground space-y-1">
                              {callSummary.duration && (
                                <div>
                                  Duration: {Math.round(callSummary.duration)}s
                                </div>
                              )}
                              {callSummary.ended_reason && (
                                <div>Ended: {callSummary.ended_reason}</div>
                              )}
                            </div>
                          )}

                          {/* Transcript Section */}
                          {callSummary.transcript && (
                            <div className="border-t pt-3">
                              <h4 className="text-sm font-medium mb-2">
                                Call Transcript
                              </h4>
                              <div className="text-xs bg-muted/50 p-3 rounded-md max-h-40 overflow-y-auto whitespace-pre-wrap">
                                {callSummary.transcript}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            Call summary not available. Click "Load Summary" to
                            fetch details from VAPI or wait for the call to
                            complete.
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

              {callSummary?.booking_info && (
                <>
                  <Separator />

                  <div>
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Booking Information
                    </h3>

                    <div className="bg-muted/30 p-4 rounded-md space-y-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {Object.entries(callSummary.booking_info).map(
                          ([key, value]) => (
                            <div key={key}>
                              <span className="text-sm font-medium capitalize">
                                {key.replace(/_/g, " ")}:
                              </span>
                              <p className="text-sm">
                                {value || "Not provided"}
                              </p>
                            </div>
                          )
                        )}
                      </div>

                      {!selectedRequest.bookingSaved && (
                        <Button
                          onClick={() =>
                            saveBookingInfo(
                              callSummary.booking_info,
                              callSummary.call_id
                            )
                          }
                          disabled={savingBooking}
                          className="mt-2 w-full"
                          variant="secondary"
                        >
                          {savingBooking ? (
                            <>
                              <Loader />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Save Booking Information
                            </>
                          )}
                        </Button>
                      )}

                      {selectedRequest.bookingSaved && (
                        <div className="flex items-center justify-center text-green-600 gap-1 bg-green-50 py-2 rounded-md">
                          <Check className="h-4 w-4" />
                          <span className="text-sm">
                            Booking information saved
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
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
                  {selectedRequest.recordingUrl && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium mb-1">Recording</h4>
                      <audio
                        controls
                        src={selectedRequest.recordingUrl}
                        className="w-full"
                      />
                      <div className="mt-1">
                        <a
                          href={selectedRequest.recordingUrl}
                          download
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Download recording
                        </a>
                      </div>
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
                        <Loader />
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
