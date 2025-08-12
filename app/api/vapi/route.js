import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { callType, phoneNumber, businessId, scriptData } =
      await request.json();

    // Validate the API key is available
    if (!process.env.VAPI_PRIVATE_API_KEY) {
      return NextResponse.json(
        {
          error: "Missing VAPI_PRIVATE_API_KEY environment variable",
        },
        { status: 500 }
      );
    }

    // Format phone number to E.164 format if needed
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Validate Twilio configuration
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    if (!twilioSid || !twilioToken) {
      return NextResponse.json(
        {
          error: "Missing Twilio configuration",
          details:
            "Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.local",
        },
        { status: 500 }
      );
    }

    // Create VAPI assistant first
    const assistant = await createVAPIAssistant({
      ...scriptData,
      script: normalizeScript(scriptData?.script || ""),
    });

    if (!assistant || !assistant.id) {
      throw new Error("Failed to create VAPI assistant");
    }

    // Make API call to VAPI to initiate call
    const response = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "outboundPhoneCall",
        phoneNumber: {
          twilioPhoneNumber: "+17622545834", // Default outbound number in E.164 format
          twilioAccountSid: twilioSid,
          twilioAuthToken: twilioToken,
        },
        customer: {
          number: formattedPhone,
        },
        assistantId: assistant.id,
        // Optional webhook for call status updates
        // If your VAPI project supports per-call webhooks, uncomment below and set the correct property name.
        // webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/vapi/webhook`,
        // Metadata for tracking
        metadata: {
          businessId,
          callType,
          userId: scriptData.userId,
          scriptId: scriptData.scriptId,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("VAPI API error:", data);
      return NextResponse.json(
        { error: data.error || data.message || "Failed to initiate call" },
        { status: response.status || 400 }
      );
    }

    return NextResponse.json({
      ...data,
      assistantId: assistant.id,
    });
  } catch (error) {
    console.error("Error making VAPI call:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Remove placeholders so the agent doesn't read them literally
function normalizeScript(raw) {
  if (!raw) return "";
  const pairs = [
    ["[Customer Name]", ""],
    ["[ग्राहक का नाम]", ""],
    ["[Business Name]", ""],
    ["[व्यवसाय का नाम]", ""],
    ["[AI Assistant]", ""],
    ["[AI Assistant Name]", ""],
    ["[Your Name/AI Assistant Name]", ""],
    ["[आपका नाम/एआई असिस्टेंट नाम]", ""],
  ];
  let s = raw;
  for (const [k, v] of pairs) {
    const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    s = s.replace(re, v);
  }
  // Remove any other [placeholder]
  s = s.replace(/\[[^\]]+\]/g, "");
  return s.replace(/\s{2,}/g, " ").trim();
}

// Helper function to create VAPI assistant
async function createVAPIAssistant(scriptData) {
  try {
    const {
      script,
      language = "en",
      voiceProvider = "11labs",
      voiceId = "bobby", // Bobby from 11Labs
      voiceModel = "eleven_turbo_v2_5",
      assistantModel = "gpt-4o-mini",
      transcriptionProvider = "deepgram",
      transcriptionModel = "nova-2",
    } = scriptData;

    // Configure transcription based on language
    const transcriptionConfig = {
      provider: transcriptionProvider,
      model: transcriptionModel,
      ...(language === "hi" && { language: "hi" }), // Hindi language code
      ...(language === "en" && { language: "en" }), // English language code
    };

    // Configure voice based on selected settings
    const voiceConfig = {
      provider: voiceProvider,
      voiceId: voiceId,
      ...(voiceProvider === "11labs" && { model: voiceModel }),
    };

    // Configure AI model
    const modelConfig = {
      provider: "openai",
      model: assistantModel,
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant making calls on behalf of a business. 

Your task is to follow this script: ${script}

Guidelines:
- Be natural and conversational
- Follow the script but adapt based on customer responses
- Be polite and professional
- Listen carefully to the customer
- Extract relevant information when needed
- Handle objections gracefully
- End the call appropriately

Language: ${language === "hi" ? "Hindi" : "English"}

Remember to be helpful and represent the business professionally.`,
        },
      ],
      temperature: 0.7,
      maxTokens: 500,
    };

    const assistantPayload = {
      name: `AI Call ${Date.now().toString().slice(-8)}`,
      model: modelConfig,
      voice: voiceConfig,
      transcriber: transcriptionConfig,
      // Add functions for extracting structured data if needed
      ...(scriptData.enableDataExtraction && {
        functions: [
          {
            name: "save_booking_info",
            description:
              "Save booking or appointment information from the call",
            parameters: {
              type: "object",
              properties: {
                customer_name: {
                  type: "string",
                  description: "Customer's full name",
                },
                phone_number: {
                  type: "string",
                  description: "Customer's phone number",
                },
                email: {
                  type: "string",
                  description: "Customer's email address",
                },
                booking_date: {
                  type: "string",
                  description: "Requested booking date",
                },
                booking_time: {
                  type: "string",
                  description: "Requested booking time",
                },
                number_of_people: {
                  type: "number",
                  description: "Number of people for booking",
                },
                special_requests: {
                  type: "string",
                  description: "Any special requests or notes",
                },
              },
              required: [
                "customer_name",
                "phone_number",
                "booking_date",
                "booking_time",
              ],
            },
          },
        ],
      }),
      // Call settings
      firstMessage:
        "Hello! This is an automated call. Is this a good time to talk?",
      endCallMessage: "Thank you for your time. Have a great day!",
      // Background sound settings
      backgroundSound: "office",
      // Call recording
      recordingEnabled: true,
      // Silence detection
      silenceTimeoutSeconds: 30,
      maxDurationSeconds: 300, // 5 minutes max call duration
    };

    console.log(
      "Creating VAPI assistant with config:",
      JSON.stringify(assistantPayload, null, 2)
    );

    const response = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_PRIVATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(assistantPayload),
    });

    const assistant = await response.json();

    if (!response.ok) {
      console.error("Failed to create VAPI assistant:", assistant);
      throw new Error(
        assistant.error || assistant.message || "Failed to create assistant"
      );
    }

    console.log("Created VAPI assistant:", assistant.id);
    return assistant;
  } catch (error) {
    console.error("Error creating VAPI assistant:", error);
    throw error;
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

  // For Indian numbers, add +91 if it's 10 digits and doesn't start with country code
  if (digits.length === 10 && !phoneNumber.startsWith("+91")) {
    return "+91" + digits;
  }

  // Otherwise just add + prefix
  return "+" + digits;
}
