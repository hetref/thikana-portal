import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";

export async function POST(request) {
  try {
    const callUpdate = await request.json();
    console.log("Received Bland AI webhook:", callUpdate);

    // Extract data from the webhook payload
    const { call_id, status, transcript, metadata } = callUpdate;
    const { businessId, userId } = metadata || {};

    if (!businessId || !userId) {
      console.error(
        "Missing businessId or userId in webhook metadata",
        metadata
      );
      return NextResponse.json(
        {
          error: "Missing business ID or user ID in metadata",
        },
        { status: 400 }
      );
    }

    // Store call data in Firestore
    try {
      const callRef = doc(db, "users", userId, "calls", call_id.toString());
      await setDoc(
        callRef,
        {
          callId: call_id,
          status,
          transcript,
          updatedAt: new Date().toISOString(),
          ...metadata,
        },
        { merge: true }
      );

      // Add to call history if the call is completed
      if (status === "completed" || status === "failed") {
        await addDoc(collection(db, "users", userId, "callHistory"), {
          callId: call_id,
          timestamp: new Date().toISOString(),
          transcript,
          status,
          ...metadata,
        });
      }

      console.log(`Successfully updated call ${call_id} with status ${status}`);
    } catch (dbError) {
      console.error("Error storing call data in Firestore:", dbError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
