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
  writeBatch,
} from "firebase/firestore";

export async function POST(req) {
  try {
    // Get the raw payload for detailed logging
    const rawData = await req.text();
    console.log("RAW Bland AI Webhook payload:", rawData);

    // Parse the JSON payload
    let data;
    try {
      data = JSON.parse(rawData);
      console.log(
        "Parsed Bland AI Webhook payload:",
        JSON.stringify(data, null, 2)
      );
    } catch (parseError) {
      console.error("Failed to parse webhook payload:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Extract info from the webhook payload
    const { task_id, call_id, status, call_details, transcript } = data;

    console.log(
      `WEBHOOK RECEIVED: Status=${status}, task_id=${task_id}, call_id=${call_id}`
    );

    if (!task_id && !call_id) {
      console.error("Missing both task_id and call_id in webhook payload");
      return NextResponse.json(
        { error: "Missing task_id or call_id in webhook payload" },
        { status: 400 }
      );
    }

    // We're ignoring detailed status tracking now. Just log the webhook.
    console.log(
      `Received webhook with status ${status}, but not updating status per user requirements`
    );

    // Store the call transcript if available for history
    if (transcript && task_id && task_id.includes("_")) {
      const [businessId] = task_id.split("_");

      try {
        // Try to find the request document
        const requestRef = doc(
          db,
          "users",
          businessId,
          "requestCalls",
          task_id
        );
        const requestSnapshot = await getDoc(requestRef);

        if (requestSnapshot.exists()) {
          console.log(`Storing transcript for request ${task_id}`);

          // Only update the transcript and other non-status data
          await updateDoc(requestRef, {
            transcript: transcript || "",
            lastWebhookReceived: serverTimestamp(),
          });

          console.log(`Successfully stored transcript for ${task_id}`);
        }
      } catch (error) {
        console.error(`Error storing transcript for ${task_id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Webhook received, status tracking disabled per user requirements",
      webhookData: {
        task_id,
        call_id,
        status,
      },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
