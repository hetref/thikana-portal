import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Parse the request body
    const {
      phone_number,
      script,
      request_id,
      voice_id = "alice",
      caller_id,
    } = await req.json();

    // Validate required parameters
    if (!phone_number || !script) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          details: "phone_number and script are required",
        },
        { status: 400 }
      );
    }

    // Validate phone number format (E.164 format, e.g. +12344145236)
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phone_number)) {
      return NextResponse.json(
        {
          error: "Invalid phone number format",
          details: "Phone number must be in E.164 format (e.g. +12344145236)",
        },
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

    // Set default caller_id if not provided
    const FIXED_CALLER_ID = "+12344145236"; // Our fixed Twilio number
    const finalCallerId = caller_id || FIXED_CALLER_ID;

    // Construct the webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/bland-ai/webhook`;

    // Prepare the API call
    const apiUrl = "https://api.bland.ai/v1/calls";

    const payload = {
      phone_number: phone_number,
      task: script,
      task_id: request_id || `direct_${Date.now()}`,
      voice_id: voice_id,
      wait_for_greeting: true,
      reduce_latency: true,
      webhook_url: webhookUrl,
      caller_id: finalCallerId, // Always use our Twilio number
      transfer_phone_number: finalCallerId, // Add this for additional caller ID enforcement

      // Enhanced voice settings for more natural speech and noise cancellation
      voice_settings: {
        stability: 0.7,
        similarity_boost: 0.75,
        style: 0.3, // Add some style variation for more natural speech
        use_voice_enhancement: true, // Enable voice enhancement
      },

      // Add settings for better call quality
      asr_settings: {
        endpointing: 500, // Shorter endpointing for more responsive conversation
        denoise: true, // Enable noise cancellation
        diarize: true, // Better speaker separation
      },

      // Define slots to extract structured booking data
      slots: [
        { name: "customer_name", entity_type: "any", required: true },
        { name: "phone_number", entity_type: "phone_number", required: true },
        { name: "email", entity_type: "email", required: false },
        { name: "booking_date", entity_type: "date", required: true },
        { name: "booking_time", entity_type: "time", required: true },
        { name: "number_of_people", entity_type: "number", required: true },
        { name: "special_requests", entity_type: "any", required: false },
        { name: "address", entity_type: "any", required: false },
      ],
    };

    console.log(
      "Initiate call API payload:",
      JSON.stringify({
        ...payload,
        phone_number: phone_number.substring(0, 4) + "****", // Log redacted phone number for privacy
      })
    );
    console.log(
      `Using caller_id: ${finalCallerId} for call to ${phone_number.substring(0, 4)}****`
    );

    // Make the API call to Bland AI
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    // Parse the response
    const result = await response.json();

    if (!response.ok) {
      console.error("Bland AI API error:", result);
      return NextResponse.json(
        {
          error: "Failed to initiate call",
          details: result.error || "Unknown error",
        },
        { status: 500 }
      );
    }

    console.log("Call initiated successfully:", result.call_id);

    // Note: The status will be updated by the caller (component)
    // We're not tracking detailed call status anymore per user requirements

    // Return the response
    return NextResponse.json({
      success: true,
      call_id: result.call_id,
      bland_response: result,
      caller_id_used: finalCallerId,
    });
  } catch (error) {
    console.error("Error in initiate-call API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
