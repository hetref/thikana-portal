import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { callType, phoneNumber, businessId, scriptData } =
      await request.json();

    // Validate the API key is available
    if (!process.env.BLAND_AI_API_KEY) {
      return NextResponse.json(
        {
          error: "Missing BLAND_AI_API_KEY environment variable",
        },
        { status: 500 }
      );
    }

    // Format phone number to E.164 format if needed
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Make an actual API call to Bland AI
    const response = await fetch("https://api.bland.ai/v1/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BLAND_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number: formattedPhone,
        task: scriptData.task,
        reduce_latency: true,
        wait_for_greeting: true,
        voice_id: scriptData.voiceId || "clara", // default voice
        caller_id: "+12344145236", // Add your Twilio number here
        metadata: {
          businessId,
          callType,
          userId: scriptData.userId,
        },
        webhook: `${process.env.NEXT_PUBLIC_BASE_URL}/api/bland-ai/webhook`,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Bland AI API error:", data.error);
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error making Bland AI call:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to format phone number to E.164
function formatPhoneNumber(phoneNumber) {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, "");

  // Check if the number already has a + prefix
  if (phoneNumber.startsWith("+")) {
    return "+" + digits;
  }

  // For US numbers, add +1 if it's 10 digits
  if (digits.length === 10) {
    return "+1" + digits;
  }

  // Otherwise just add + prefix
  return "+" + digits;
}
