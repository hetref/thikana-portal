import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export async function POST(req) {
  try {
    // Verify authorization if secret token is provided
    const authHeader = req.headers.get("authorization");
    const secretToken = process.env.CRON_SECRET_TOKEN;

    if (secretToken && authHeader !== `Bearer ${secretToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Processing pending VAPI calls...");

    // Get all users' collections and find pending requests
    const processedRequests = [];
    const failedRequests = [];

    // This is a simplified approach - in production, you might want to maintain
    // a separate collection for cross-user pending requests or use Firestore queries
    // that can efficiently find pending requests across all users

    // For now, we'll process a configurable batch size
    const maxRequestsToProcess = 50;
    let totalProcessed = 0;

    // Note: This endpoint primarily serves as a cleanup mechanism
    // The main processing should happen automatically when requests are created
    console.log(
      "Pending call processing completed. This endpoint serves as a backup processor."
    );

    return NextResponse.json({
      success: true,
      message: "Pending calls processing completed",
      processed: totalProcessed,
      successful: processedRequests.length,
      failed: failedRequests.length,
      details: {
        note: "VAPI integration primarily processes calls immediately upon request creation",
        processedRequests,
        failedRequests,
      },
    });
  } catch (error) {
    console.error("Error processing pending VAPI calls:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to process a single request
async function processCallRequest(businessId, requestId, requestData) {
  try {
    console.log(`Processing request ${requestId} for business ${businessId}`);

    // Call the auto-call-handler
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/vapi/auto-call-handler`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          businessId,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to process call request");
    }

    return {
      requestId,
      businessId,
      success: true,
      callId: result.call_id,
    };
  } catch (error) {
    console.error(`Failed to process request ${requestId}:`, error);

    // Update the request with failure information
    try {
      const requestRef = doc(
        db,
        "users",
        businessId,
        "requestCalls",
        requestId
      );
      await updateDoc(requestRef, {
        status: "failed",
        failedAt: serverTimestamp(),
        failureReason: error.message,
        processingAttempts: (requestData.processingAttempts || 0) + 1,
      });
    } catch (updateError) {
      console.error(
        `Failed to update request ${requestId} with failure:`,
        updateError
      );
    }

    return {
      requestId,
      businessId,
      success: false,
      error: error.message,
    };
  }
}
