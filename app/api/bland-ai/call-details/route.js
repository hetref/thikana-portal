import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    // Get the call_id from the query parameters
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get("call_id");

    if (!callId) {
      return NextResponse.json(
        { error: "Missing call_id parameter" },
        { status: 400 }
      );
    }

    // Get the API key from environment variables
    const apiKey = process.env.BLAND_AI_API_KEY;
    if (!apiKey) {
      console.error("Bland AI API key not configured");
      return NextResponse.json(
        { error: "API configuration error" },
        { status: 500 }
      );
    }

    // Make request to Bland AI to get call details
    console.log(`Fetching call details for call ID: ${callId}`);
    const blandResponse = await fetch(
      `https://api.bland.ai/v1/calls/${callId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!blandResponse.ok) {
      const errorData = await blandResponse.json();
      console.error("Bland AI API error:", errorData);
      return NextResponse.json(
        {
          error: "Failed to fetch call details from Bland AI",
          details: errorData,
        },
        { status: blandResponse.status }
      );
    }

    const callData = await blandResponse.json();
    console.log(`Received call data. Status: ${callData.status}`);

    // Generate a simplified transcript from the conversation
    let transcript = [];

    // Bland AI has different transcript formats based on API version
    // Check for standard transcript format
    if (callData.transcript && Array.isArray(callData.transcript)) {
      console.log(
        `Found standard transcript with ${callData.transcript.length} entries`
      );
      transcript = callData.transcript.map((entry) => ({
        speaker: entry.speaker === "assistant" ? "AI" : "Customer",
        text: entry.text || entry.message || "",
        timestamp: entry.timestamp,
      }));
    }
    // Check for the conversation format which is also used
    else if (callData.conversation && Array.isArray(callData.conversation)) {
      console.log(
        `Found conversation transcript with ${callData.conversation.length} entries`
      );
      transcript = callData.conversation.map((entry) => ({
        speaker: entry.role === "assistant" ? "AI" : "Customer",
        text: entry.content || "",
        timestamp: entry.timestamp,
      }));
    }
    // Check for the turns format (older API version)
    else if (callData.turns && Array.isArray(callData.turns)) {
      console.log(
        `Found turns transcript with ${callData.turns.length} entries`
      );
      transcript = callData.turns.map((entry) => ({
        speaker: entry.agent ? "AI" : "Customer",
        text: entry.utterance || "",
        timestamp: entry.timestamp,
      }));
    }
    // If no structured transcript is found, create a note about it
    else {
      console.log("No structured transcript found in the call data");
      // Add a placeholder message if no transcript was found
      transcript = [
        {
          speaker: "AI",
          text: "Transcript data is not available for this call.",
          timestamp: new Date().toISOString(),
        },
      ];
    }

    // Extract or generate a summary
    let summary = "";

    // First check if Bland AI provides a summary
    if (callData.summary) {
      summary = callData.summary;
    }
    // If not, check if there's a notes field
    else if (callData.notes) {
      summary = callData.notes;
    }
    // As a fallback, if there are results, use that
    else if (callData.results && callData.results.summary) {
      summary = callData.results.summary;
    }
    // If there's a call_result with a summary field
    else if (callData.call_result && callData.call_result.summary) {
      summary = callData.call_result.summary;
    }
    // If no predefined summary exists, provide a generic message
    else {
      summary =
        "No summary is available for this call yet. Once the call is completed, a summary will be generated automatically.";
    }

    // Extract booking information from the call if available
    let bookingInfo = null;

    // Check for structured data in different possible locations in the Bland AI response
    if (callData.results && callData.results.slots) {
      bookingInfo = callData.results.slots;
      console.log("Found booking info in results.slots:", bookingInfo);
    } else if (callData.extracted_data) {
      bookingInfo = callData.extracted_data;
      console.log("Found booking info in extracted_data:", bookingInfo);
    } else if (callData.call_result && callData.call_result.slots) {
      bookingInfo = callData.call_result.slots;
      console.log("Found booking info in call_result.slots:", bookingInfo);
    }

    // Return the formatted response
    return NextResponse.json({
      call_id: callId,
      status: callData.status || "unknown",
      duration: callData.duration || 0,
      start_time: callData.start_time || callData.started_at || null,
      end_time: callData.end_time || callData.completed_at || null,
      summary: summary,
      transcript: transcript,
      booking_info: bookingInfo,
      raw_data: callData, // Include the raw data for debugging
    });
  } catch (error) {
    console.error("Error fetching call details:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
