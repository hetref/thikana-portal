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
    const { callId, businessId } = await req.json();

    if (!callId || !businessId) {
      return NextResponse.json(
        { error: "Missing callId or businessId" },
        { status: 400 }
      );
    }

    console.log(
      `Processing call details for call ${callId}, business ${businessId}`
    );

    // Find the request document
    const requestsRef = collection(db, "users", businessId, "requestCalls");
    const q = query(requestsRef, where("callId", "==", callId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: "Call request not found" },
        { status: 404 }
      );
    }

    const requestDoc = querySnapshot.docs[0];
    const requestData = requestDoc.data();

    // Check if call details have already been processed
    if (requestData.callDetailsProcessed) {
      return NextResponse.json({
        success: true,
        message: "Call details already processed",
        data: {
          summary: requestData.callSummary,
          transcript: requestData.transcript,
          bookingInfo: requestData.bookingInfo,
        },
      });
    }

    // Fetch call details from VAPI with retry logic (wait a bit first)
    console.log(
      `Waiting 3 seconds before fetching call details for ${callId}...`
    );
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds
    const callDetails = await fetchCallDetailsWithRetry(callId, 5);

    if (!callDetails) {
      return NextResponse.json(
        { error: "Failed to fetch call details from VAPI" },
        { status: 500 }
      );
    }

    // Update the request document with call details
    const updateData = {
      callSummary: callDetails.summary,
      transcript: callDetails.transcript,
      bookingInfo: callDetails.booking_info,
      ...(callDetails.recording_url && { recordingUrl: callDetails.recording_url }),
      callDetailsProcessed: true,
      callDetailsProcessedAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    };

    // Update status if call has ended
    if (callDetails.status === "ended" && requestData.status === "initiated") {
      updateData.status =
        callDetails.ended_reason === "hangup" ? "completed" : "failed";
      updateData.completedAt = serverTimestamp();
      updateData.callDuration = callDetails.duration;
      updateData.endedReason = callDetails.ended_reason;
    }

    await updateDoc(requestDoc.ref, updateData);

    console.log(`Successfully processed call details for ${callId}`);

    return NextResponse.json({
      success: true,
      message: "Call details processed successfully",
      data: {
        summary: callDetails.summary,
        transcript: callDetails.transcript,
        bookingInfo: callDetails.booking_info,
        duration: callDetails.duration,
        status: callDetails.status,
        endedReason: callDetails.ended_reason,
      },
    });
  } catch (error) {
    console.error("Error processing call details:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
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
