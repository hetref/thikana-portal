import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req) {
  try {
    const { requestId, businessId } = await req.json();

    if (!requestId || !businessId) {
      return NextResponse.json(
        { error: "Missing requestId or businessId" },
        { status: 400 }
      );
    }

    console.log(
      `Auto-handling call request: ${requestId} for business: ${businessId}`
    );

    // Get the request document
    const requestRef = doc(db, "users", businessId, "requestCalls", requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const requestData = requestDoc.data();

    if (requestData.status !== "pending") {
      return NextResponse.json(
        { error: "Request is not in pending status" },
        { status: 400 }
      );
    }

    // Get the script data
    const scriptRef = doc(
      db,
      "users",
      businessId,
      "callScripts",
      requestData.scriptId
    );
    const scriptDoc = await getDoc(scriptRef);

    if (!scriptDoc.exists()) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }

    const scriptData = scriptDoc.data();

    // Prepare the call data for VAPI
    const callData = {
      phone_number: requestData.userPhone,
      script: scriptData.script,
      request_id: requestId,
      language: scriptData.language || "en",
      voiceConfig: {
        provider: scriptData.voiceProvider || "11labs",
        voiceId: scriptData.voiceId || "Hmz0MdhDqv9vPpSMfDkh",
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
    };

    // Call the VAPI initiate-call endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/vapi/initiate-call`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(callData),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Failed to initiate call:", result);

      // Update request with failure
      await updateDoc(requestRef, {
        status: "failed",
        failedAt: serverTimestamp(),
        failureReason: result.error || "Failed to initiate call",
        autoProcessingAttempts: (requestData.autoProcessingAttempts || 0) + 1,
      });

      return NextResponse.json(
        { error: result.error || "Failed to initiate call" },
        { status: 500 }
      );
    }

    // Update request with success
    await updateDoc(requestRef, {
      status: "initiated",
      callStartedAt: serverTimestamp(),
      callId: result.call_id,
      assistantId: result.assistant_id,
      autoProcessed: true,
      autoProcessingAttempts: (requestData.autoProcessingAttempts || 0) + 1,
    });

    console.log(`Successfully auto-initiated call for request: ${requestId}`);

    return NextResponse.json({
      success: true,
      call_id: result.call_id,
      assistant_id: result.assistant_id,
      message: "Call initiated successfully",
    });
  } catch (error) {
    console.error("Error in auto-call-handler:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
