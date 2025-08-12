import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const {
      phone_number,
      script,
      request_id,
      language = "en",
      voiceConfig = {},
      transcriptionConfig = {},
      assistantConfig = {},
      customer_name,
      business_name,
      assistant_name,
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

    // Validate phone number format (E.164 format)
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
    const apiKey = process.env.VAPI_PRIVATE_API_KEY;
    if (!apiKey) {
      console.error("VAPI Private API key not configured");
      return NextResponse.json(
        { error: "API configuration error" },
        { status: 500 }
      );
    }

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

    // Configure default settings
    const defaultVoiceConfig = {
      provider: "11labs",
      voiceId: "Hmz0MdhDqv9vPpSMfDkh", // Bobby from 11Labs
      model: "eleven_turbo_v2_5",
      ...voiceConfig,
    };

    const defaultTranscriptionConfig = {
      provider: "deepgram",
      model: "nova-2",
      language: language === "hi" ? "hi" : "en",
      ...transcriptionConfig,
    };

    const defaultAssistantConfig = {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 500,
      ...assistantConfig,
    };

    // Helper to render script with variables and strip unknown placeholders
    const renderScriptWithVariables = (rawScript) => {
      if (!rawScript) return "";
      let s = rawScript;
      const replacements = [
        {
          keys: ["[Customer Name]", "[ग्राहक का नाम]"],
          value: customer_name || "",
        },
        {
          keys: ["[Business Name]", "[व्यवसाय का नाम]"],
          value: business_name || "",
        },
        {
          keys: [
            "[AI Assistant]",
            "[AI Assistant Name]",
            "[Your Name/AI Assistant Name]",
            "[आपका नाम/एआई असिस्टेंट नाम]",
          ],
          value: assistant_name || "",
        },
      ];
      for (const rep of replacements) {
        for (const k of rep.keys) {
          const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
          s = s.replace(re, rep.value);
        }
      }
      // Remove any remaining [placeholders]
      s = s.replace(/\[[^\]]+\]/g, "");
      return s.replace(/\s{2,}/g, " ").trim();
    };

    const preparedScript = renderScriptWithVariables(script);

    // Create the assistant first
    const assistantPayload = {
      name: `AI Call ${Date.now().toString().slice(-8)}`,
      model: {
        provider: defaultAssistantConfig.provider,
        model: defaultAssistantConfig.model,
        temperature: defaultAssistantConfig.temperature,
        maxTokens: defaultAssistantConfig.maxTokens,
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant making calls on behalf of a business.

Important rules:
- Never read placeholders like [Customer Name], [AI Assistant Name], [Your Name/AI Assistant Name], [ग्राहक का नाम] out loud.
- If a value is missing (e.g., customer name), use a neutral greeting instead.
- If the script includes templated values that are blank, omit them gracefully.

Your task is to follow this script: ${preparedScript}

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
      },
      voice: defaultVoiceConfig,
      transcriber: defaultTranscriptionConfig,
      firstMessage:
        language === "hi"
          ? "नमस्ते! यह एक स्वचालित कॉल है। क्या यह बात करने का अच्छा समय है?"
          : "Hello! This is an automated call. Is this a good time to talk?",
      endCallMessage:
        language === "hi"
          ? "आपके समय के लिए धन्यवाद। आपका दिन शुभ हो!"
          : "Thank you for your time. Have a great day!",
      backgroundSound: "office",
      recordingEnabled: true,
      silenceTimeoutSeconds: 30,
      maxDurationSeconds: 300, // 5 minutes
      functions: [
        {
          name: "save_booking_info",
          description: "Save booking or appointment information from the call",
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
            required: ["customer_name", "phone_number"],
          },
        },
      ],
    };

    console.log(
      "Creating VAPI assistant with payload:",
      JSON.stringify(assistantPayload, null, 2)
    );

    // Create the assistant
    const assistantResponse = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(assistantPayload),
    });

    const assistant = await assistantResponse.json();

    if (!assistantResponse.ok) {
      console.error("VAPI Assistant creation error:", assistant);
      return NextResponse.json(
        {
          error: "Failed to create assistant",
          details: assistant.error || assistant.message || "Unknown error",
        },
        { status: 500 }
      );
    }

    console.log("Created VAPI assistant:", assistant.id);

    // Now initiate the call
    const callPayload = {
      type: "outboundPhoneCall",
      phoneNumber: {
        twilioPhoneNumber: "+17622545834", // Default outbound number in E.164 format
        twilioAccountSid: twilioSid,
        twilioAuthToken: twilioToken,
      },
      customer: {
        number: phone_number,
      },
      assistantId: assistant.id,
      // Webhook URL is configured in VAPI dashboard; omit from payload to avoid 400
      // ...(process.env.NEXT_PUBLIC_BASE_URL && {
      //   serverUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/vapi/webhook`,
      // }),
      metadata: {
        request_id: request_id || `direct_${Date.now()}`,
        language,
        created_at: new Date().toISOString(),
      },
    };

    console.log(
      "Initiating VAPI call with payload:",
      JSON.stringify(callPayload, null, 2)
    );

    // Make the API call to VAPI
    const response = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(callPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("VAPI Call API error:", result);
      return NextResponse.json(
        {
          error: "Failed to initiate call",
          details: result.error || result.message || "Unknown error",
        },
        { status: 500 }
      );
    }

    console.log("Call initiated successfully:", result.id);

    return NextResponse.json({
      success: true,
      call_id: result.id,
      assistant_id: assistant.id,
      vapi_response: result,
      language_used: language,
      voice_config: defaultVoiceConfig,
      transcription_config: defaultTranscriptionConfig,
    });
  } catch (error) {
    console.error("Error in VAPI initiate-call API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
