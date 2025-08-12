import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const call_id = searchParams.get("call_id");

    if (!call_id) {
      return NextResponse.json(
        { error: "Missing call_id parameter" },
        { status: 400 }
      );
    }

    // Get the API key from environment variables
    const apiKey = process.env.VAPI_PRIVATE_API_KEY;
    if (!apiKey) {
      console.error("VAPI Private API key not configured");
      return NextResponse.json(
        { error: "API configuration error" },
        { status: 500 }
      );
    }

    console.log(`Fetching call details for call ID: ${call_id}`);

    // Make the API call to VAPI to get call details
    const response = await fetch(`https://api.vapi.ai/call/${call_id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("VAPI Call Details API error:", result);
      return NextResponse.json(
        {
          error: "Failed to fetch call details",
          details: result.error || result.message || "Unknown error",
        },
        { status: response.status || 500 }
      );
    }

    // Process and format the response for our frontend
    const processedResult = {
      call_id: result.id,
      status: result.status,
      duration: result.duration,
      started_at: result.startedAt,
      ended_at: result.endedAt,
      ended_reason: result.endedReason,
      summary: result.summary || generateCallSummary(result),
      transcript: formatTranscript(result.transcript),
      // Extract booking information if available from function calls
      booking_info: extractBookingInfo(result),
      // Additional metadata
      metadata: result.metadata,
      assistant_id: result.assistantId,
      phone_number: result.customer?.number,
      // Cost information if available
      cost: result.cost,
      // Any error information
      error: result.error,
    };

    console.log(`Successfully fetched call details for ${call_id}`);

    return NextResponse.json(processedResult);
  } catch (error) {
    console.error("Error in VAPI call-details API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
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
        msg.text?.toLowerCase().includes("schedule")
    );

    if (hasBookingInfo) {
      summary += ". Customer discussed booking/appointment details.";
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
