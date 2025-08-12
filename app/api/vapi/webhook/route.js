import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export async function POST(req) {
  try {
    // Get the raw payload for detailed logging
    const rawData = await req.text();
    console.log("RAW VAPI Webhook payload:", rawData);

    // Parse the JSON payload
    let data;
    try {
      data = JSON.parse(rawData);
      console.log(
        "Parsed VAPI Webhook payload:",
        JSON.stringify(data, null, 2)
      );
    } catch (parseError) {
      console.error("Failed to parse webhook payload:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Extract info from the VAPI webhook payload
    const { type, call, message, transcript, functionCall } = data;

    console.log(`VAPI WEBHOOK RECEIVED: Type=${type}, Call ID=${call?.id}`);

    if (!call?.id) {
      console.error("Missing call ID in webhook payload");
      return NextResponse.json(
        { error: "Missing call ID in webhook payload" },
        { status: 400 }
      );
    }

    // Handle different webhook types
    switch (type) {
      case "status-update":
        await handleStatusUpdate(call);
        break;
      case "transcript":
        await handleTranscript(call, transcript);
        break;
      case "function-call":
        await handleFunctionCall(call, functionCall);
        break;
      case "call-end":
        await handleCallEnd(call);
        break;
      case "call-start":
        await handleCallStart(call);
        break;
      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      webhookData: {
        type,
        callId: call?.id,
        status: call?.status,
      },
    });
  } catch (error) {
    console.error("Error processing VAPI webhook:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

async function handleStatusUpdate(call) {
  try {
    console.log(`Handling status update for call ${call.id}: ${call.status}`);

    // Find the request document using metadata
    if (call.metadata?.businessId) {
      const businessId = call.metadata.businessId;

      // Try to find the request by searching for the call ID
      const requestsRef = collection(db, "users", businessId, "requestCalls");
      const q = query(requestsRef, where("callId", "==", call.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const requestDoc = querySnapshot.docs[0];
        const updateData = {
          callStatus: call.status,
          lastWebhookReceived: serverTimestamp(),
        };

        // Map VAPI status to our internal status
        switch (call.status) {
          case "ringing":
            updateData.status = "initiated";
            break;
          case "in-progress":
            updateData.status = "initiated";
            updateData.callStartedAt = serverTimestamp();
            break;
          case "ended":
            updateData.status = "completed";
            updateData.completedAt = serverTimestamp();
            break;
          case "failed":
            updateData.status = "failed";
            updateData.failedAt = serverTimestamp();
            if (call.endedReason) {
              updateData.failureReason = call.endedReason;
            }
            break;
        }

        await updateDoc(requestDoc.ref, updateData);
        console.log(
          `Updated request ${requestDoc.id} with status ${call.status}`
        );
      }
    }
  } catch (error) {
    console.error("Error handling status update:", error);
  }
}

async function handleTranscript(call, transcript) {
  try {
    console.log(`Handling transcript for call ${call.id}`);

    if (call.metadata?.businessId && transcript) {
      const businessId = call.metadata.businessId;

      // Find the request document
      const requestsRef = collection(db, "users", businessId, "requestCalls");
      const q = query(requestsRef, where("callId", "==", call.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const requestDoc = querySnapshot.docs[0];
        const currentData = requestDoc.data();

        // Append to existing transcript or create new
        const existingTranscript = currentData.transcript || "";
        const newTranscript =
          existingTranscript +
          `\n[${new Date().toISOString()}] ${transcript.role}: ${transcript.text}`;

        await updateDoc(requestDoc.ref, {
          transcript: newTranscript.trim(),
          lastTranscriptUpdate: serverTimestamp(),
        });

        console.log(`Updated transcript for request ${requestDoc.id}`);
      }
    }
  } catch (error) {
    console.error("Error handling transcript:", error);
  }
}

async function handleFunctionCall(call, functionCall) {
  try {
    console.log(`Handling function call for call ${call.id}:`, functionCall);

    if (
      call.metadata?.businessId &&
      functionCall?.name === "save_booking_info"
    ) {
      const businessId = call.metadata.businessId;

      // Find the request document
      const requestsRef = collection(db, "users", businessId, "requestCalls");
      const q = query(requestsRef, where("callId", "==", call.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const requestDoc = querySnapshot.docs[0];

        await updateDoc(requestDoc.ref, {
          bookingInfo: functionCall.parameters,
          bookingExtracted: true,
          lastBookingUpdate: serverTimestamp(),
        });

        console.log(`Saved booking info for request ${requestDoc.id}`);
      }
    }
  } catch (error) {
    console.error("Error handling function call:", error);
  }
}

async function handleCallStart(call) {
  try {
    console.log(`Handling call start for call ${call.id}`);

    if (call.metadata?.businessId) {
      const businessId = call.metadata.businessId;

      // Find the request document
      const requestsRef = collection(db, "users", businessId, "requestCalls");
      const q = query(requestsRef, where("callId", "==", call.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const requestDoc = querySnapshot.docs[0];

        await updateDoc(requestDoc.ref, {
          status: "initiated",
          callStartedAt: serverTimestamp(),
          callStatus: "in-progress",
        });

        console.log(`Updated call start for request ${requestDoc.id}`);
      }
    }
  } catch (error) {
    console.error("Error handling call start:", error);
  }
}

async function handleCallEnd(call) {
  try {
    console.log(`Handling call end for call ${call.id}`);

    if (call.metadata?.businessId) {
      const businessId = call.metadata.businessId;

      // Find the request document
      const requestsRef = collection(db, "users", businessId, "requestCalls");
      const q = query(requestsRef, where("callId", "==", call.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const requestDoc = querySnapshot.docs[0];

        const updateData = {
          // Consider any ended call as completed; use endedReason for context
          status: "completed",
          completedAt: serverTimestamp(),
          callStatus: "ended",
          callDuration: call.duration,
          endedReason: call.endedReason,
          // Persist recording URL if provided by VAPI
          ...(call.recordingUrl && { recordingUrl: call.recordingUrl }),
        };


        // Wait a bit before trying to fetch call details as VAPI might need time to process
        console.log(
          `Call ${call.id} ended, waiting 5 seconds before fetching details...`
        );
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

        try {
          console.log(`Fetching call details for completed call ${call.id}`);
          const callDetails = await fetchCallDetailsWithRetry(call.id, 5); // Increased retries to 5

          if (callDetails) {
            updateData.callSummary = callDetails.summary;
            updateData.transcript = callDetails.transcript;
            updateData.bookingInfo = callDetails.booking_info;
            updateData.callDetailsProcessed = true;
            updateData.callDetailsProcessedAt = serverTimestamp();

            console.log(`Successfully processed call details for ${call.id}`);
          }
        } catch (detailsError) {
          console.error(
            `Error fetching call details for ${call.id}:`,
            detailsError
          );
          updateData.callDetailsError = detailsError.message;
          updateData.callDetailsProcessed = false;
          updateData.needsManualProcessing = true;
        }

        await updateDoc(requestDoc.ref, updateData);
        console.log(`Updated call end for request ${requestDoc.id}`);
      }
    }
  } catch (error) {
    console.error("Error handling call end:", error);
  }
}

// Helper function to fetch call details from VAPI with retry logic
async function fetchCallDetailsWithRetry(callId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Attempt ${attempt}/${maxRetries} to fetch call details for ${callId}`
      );

      // Add delay between retries (longer exponential backoff for call details)
      if (attempt > 1) {
        const delay = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s, 32s, 64s
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const callDetails = await fetchCallDetails(callId);
      console.log(`Successfully fetched call details on attempt ${attempt}`);
      return callDetails;
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error.message);

      // If it's a 404, the call might not be ready yet, so retry
      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
}

// Helper function to fetch call details from VAPI
async function fetchCallDetails(callId) {
  try {
    const apiKey = process.env.VAPI_PRIVATE_API_KEY;
    if (!apiKey) {
      throw new Error("VAPI Private API key not configured");
    }

    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      console.error(`VAPI API error for call ${callId}:`, error);

      // If it's a 404, the call details might not be ready yet
      if (response.status === 404) {
        throw new Error(`Call details not yet available for ${callId}`);
      }

      throw new Error(
        `VAPI API error: ${error.message || response.statusText}`
      );
    }

    const result = await response.json();

    // Process and format the response
    return {
      call_id: result.id,
      status: result.status,
      duration: result.duration,
      started_at: result.startedAt,
      ended_at: result.endedAt,
      ended_reason: result.endedReason,
      summary: result.summary || generateCallSummary(result),
      transcript: formatTranscript(result.transcript),
      booking_info: extractBookingInfo(result),
      metadata: result.metadata,
      cost: result.cost,
      recording_url: result.recordingUrl || result.recording?.url || null,
    };
  } catch (error) {
    console.error("Error fetching call details:", error);
    throw error;
  }
}

function generateCallSummary(callData) {
  // Generate a basic summary from available call data
  const { status, duration, endedReason, transcript } = callData;

  let summary = `Call ${status}`;

  if (duration) {
    summary += ` (Duration: ${Math.round(duration)}s)`;
  }

  if (endedReason) {
    summary += `. Ended due to: ${endedReason}`;
  }

  // Extract key points from transcript if available
  if (transcript && transcript.length > 0) {
    const messages = transcript.slice(-5); // Get last 5 messages
    const hasBookingInfo = messages.some(
      (msg) =>
        msg.text?.toLowerCase().includes("booking") ||
        msg.text?.toLowerCase().includes("appointment") ||
        msg.text?.toLowerCase().includes("schedule") ||
        msg.text?.toLowerCase().includes("order") ||
        msg.text?.toLowerCase().includes("support") ||
        msg.text?.toLowerCase().includes("problem") ||
        msg.text?.toLowerCase().includes("issue")
    );

    if (hasBookingInfo) {
      summary += ". Customer discussed booking/appointment/support details.";
    }

    // Extract more specific details
    const discussedTopics = [];
    const fullText = transcript
      .map((msg) => msg.text || "")
      .join(" ")
      .toLowerCase();

    if (fullText.includes("refund") || fullText.includes("money back")) {
      discussedTopics.push("refund request");
    }
    if (fullText.includes("delivery") || fullText.includes("order status")) {
      discussedTopics.push("delivery inquiry");
    }
    if (fullText.includes("complaint") || fullText.includes("problem")) {
      discussedTopics.push("complaint");
    }
    if (fullText.includes("appointment") || fullText.includes("booking")) {
      discussedTopics.push("appointment scheduling");
    }

    if (discussedTopics.length > 0) {
      summary += ` Topics: ${discussedTopics.join(", ")}.`;
    }
  }

  return summary;
}

function formatTranscript(transcript) {
  if (!transcript || !Array.isArray(transcript)) {
    return "";
  }

  return transcript
    .map((msg) => {
      const timestamp = msg.timestamp
        ? new Date(msg.timestamp).toLocaleTimeString()
        : "";
      const role = msg.role === "assistant" ? "AI" : "Customer";
      return `[${timestamp}] ${role}: ${msg.text || ""}`;
    })
    .join("\n");
}

function extractBookingInfo(callData) {
  // Look for booking information in function calls or transcript
  const { functionCalls, transcript } = callData;

  // First, check if there were any function calls with booking info
  if (functionCalls && Array.isArray(functionCalls)) {
    const bookingCall = functionCalls.find(
      (call) => call.name === "save_booking_info"
    );
    if (bookingCall && bookingCall.parameters) {
      return bookingCall.parameters;
    }
  }

  // If no function calls, try to extract from transcript
  if (transcript && Array.isArray(transcript)) {
    const bookingInfo = {};
    const fullText = transcript
      .map((msg) => msg.text || "")
      .join(" ")
      .toLowerCase();

    // Simple extraction patterns - this could be enhanced with better NLP
    const nameMatch = fullText.match(/my name is ([a-zA-Z\s]+)/);
    if (nameMatch) {
      bookingInfo.customer_name = nameMatch[1].trim();
    }

    const phoneMatch = fullText.match(/(\+?[\d\s\-\(\)]{10,})/);
    if (phoneMatch) {
      bookingInfo.phone_number = phoneMatch[1].trim();
    }

    const emailMatch = fullText.match(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
    );
    if (emailMatch) {
      bookingInfo.email = emailMatch[1];
    }

    // Return booking info only if we found something useful
    if (Object.keys(bookingInfo).length > 0) {
      return bookingInfo;
    }
  }

  return null;
}
