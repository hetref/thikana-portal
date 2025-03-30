import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * This is a diagnostic endpoint that simulates a webhook call from Bland AI.
 * It can be used to manually trigger a status update for a request to test if
 * the webhook handling is working properly.
 */
export async function POST(req) {
  try {
    // Parse the request body
    const {
      requestId, // the task_id/request_id to update
      businessId, // the business account ID
      status = "initiated", // we only support 'pending' and 'initiated' now
      call_id = "test_" + Date.now(), // a test call ID
    } = await req.json();

    if (!requestId || !businessId) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          details: "requestId and businessId are required",
        },
        { status: 400 }
      );
    }

    if (status !== "pending" && status !== "initiated") {
      return NextResponse.json(
        {
          error: "Invalid status parameter",
          details: "Status must be either 'pending' or 'initiated'",
        },
        { status: 400 }
      );
    }

    console.log(
      `TEST WEBHOOK: Setting status for request ${requestId} to ${status}`
    );

    // Check if the request exists
    const requestRef = doc(db, "users", businessId, "requestCalls", requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      return NextResponse.json(
        {
          error: "Request not found",
          details: `Request ${requestId} not found for business ${businessId}`,
        },
        { status: 404 }
      );
    }

    // Update the status directly
    await updateDoc(requestRef, {
      status: status,
      callStatus: status,
      lastUpdated: serverTimestamp(),
      callStartedAt: status === "initiated" ? serverTimestamp() : null,
      callId: status === "initiated" ? call_id : null,
    });

    return NextResponse.json({
      success: true,
      message: `Updated request ${requestId} status to ${status}`,
      requestId,
      businessId,
      status,
    });
  } catch (error) {
    console.error("Error in test webhook:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// Also add a GET method to allow testing through a browser
export async function GET(req) {
  const url = new URL(req.url);

  // Get parameters from query string
  const requestId = url.searchParams.get("requestId");
  const businessId = url.searchParams.get("businessId");
  const status = url.searchParams.get("status") || "initiated";

  if (!requestId || !businessId) {
    return NextResponse.json(
      {
        error: "Missing required parameters",
        details: "requestId and businessId are required as query parameters",
      },
      { status: 400 }
    );
  }

  if (status !== "pending" && status !== "initiated") {
    return NextResponse.json(
      {
        error: "Invalid status parameter",
        details: "Status must be either 'pending' or 'initiated'",
      },
      { status: 400 }
    );
  }

  // Manually update the request status directly
  try {
    const requestRef = doc(db, "users", businessId, "requestCalls", requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      return NextResponse.json(
        {
          error: "Request not found",
          details: `Request ${requestId} not found for business ${businessId}`,
        },
        { status: 404 }
      );
    }

    // Update the status directly
    await updateDoc(requestRef, {
      status: status,
      callStatus: status,
      lastUpdated: serverTimestamp(),
      callStartedAt: status === "initiated" ? serverTimestamp() : null,
      callId: status === "initiated" ? `test_${Date.now()}` : null,
    });

    return NextResponse.json({
      success: true,
      message: `Directly updated request ${requestId} status to ${status}`,
      requestId,
      businessId,
      status,
    });
  } catch (error) {
    console.error("Error updating request status:", error);
    return NextResponse.json(
      { error: "Failed to update request status", details: error.message },
      { status: 500 }
    );
  }
}
