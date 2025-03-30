import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

export async function POST(req) {
  try {
    const data = await req.json();
    const { requestId, businessId } = data;

    if (!requestId || !businessId) {
      return NextResponse.json(
        { error: "Request ID and Business ID are required" },
        { status: 400 }
      );
    }

    // Get the request details
    const requestRef = doc(db, "users", businessId, "requestCalls", requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const requestData = requestDoc.data();

    // Check if there's a phone number to call
    if (!requestData.userPhone) {
      await updateDoc(requestRef, {
        status: "failed",
        failedAt: serverTimestamp(),
        failureReason: "User has no phone number registered",
      });

      return NextResponse.json(
        { error: "User has no phone number registered" },
        { status: 400 }
      );
    }

    // Get the script content
    const scriptRef = doc(
      db,
      "users",
      businessId,
      "callScripts",
      requestData.scriptId
    );
    const scriptDoc = await getDoc(scriptRef);

    if (!scriptDoc.exists()) {
      await updateDoc(requestRef, {
        status: "failed",
        failedAt: serverTimestamp(),
        failureReason: "Script not found",
      });

      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }

    const scriptData = scriptDoc.data();

    // Get business info for the call
    const businessRef = doc(db, "users", businessId);
    const businessDoc = await getDoc(businessRef);
    const businessData = businessDoc.exists() ? businessDoc.data() : {};

    // Replace placeholders in the script
    let processedScript = scriptData.script.replace(
      /\[Business Name\]/g,
      businessData.businessName || "our business"
    );

    // Make the call with Bland AI API
    const blandApiKey = process.env.BLAND_AI_API_KEY;

    if (!blandApiKey) {
      await updateDoc(requestRef, {
        status: "failed",
        failedAt: serverTimestamp(),
        failureReason: "Bland AI API key is not configured",
      });

      return NextResponse.json(
        { error: "Bland AI API key is not configured" },
        { status: 500 }
      );
    }

    const webhookBaseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Use the callerNumber from the request, or fall back to business Twilio number, or use default
    const callerNumber =
      requestData.callerNumber || businessData.twilioNumber || "+12344145236";

    const payload = {
      phone_number: requestData.userPhone,
      task: processedScript, // Bland AI uses 'task' for the script
      task_id: requestId,
      voice_id: "alice", // You can customize the voice
      webhook_url: `${webhookBaseUrl}/api/bland-ai/webhook`,
      reduce_latency: true,
      caller_id: callerNumber, // Always include the caller_id to ensure proper number is used
      transfer_phone_number: callerNumber, // Add this for additional caller ID reinforcement
      voice_settings: {
        stability: 0.7, // Stability helps ensure consistent voice quality
        similarity_boost: 0.7, // Enhances voice consistency
      },
    };

    // Log all request details for debugging
    console.log("Auto-calling user:", requestData.userPhone);
    console.log("Using caller_id:", callerNumber);
    console.log("Using task_id:", requestId);
    console.log("Full payload:", JSON.stringify(payload));

    const response = await fetch("https://api.bland.ai/v1/calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${blandApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Bland AI API error:", responseData);

      await updateDoc(requestRef, {
        status: "failed",
        failedAt: serverTimestamp(),
        failureReason: responseData.message || "Failed to initiate call",
      });

      return NextResponse.json(
        { error: "Failed to initiate call", details: responseData },
        { status: response.status }
      );
    }

    // Update the request status
    await updateDoc(requestRef, {
      status: "initiated",
      callStartedAt: serverTimestamp(),
      callId: responseData.call_id,
      autoHandled: true,
    });

    return NextResponse.json({
      success: true,
      message: "Call initiated successfully",
      call_id: responseData.call_id,
    });
  } catch (error) {
    console.error("Error initiating automatic call:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
