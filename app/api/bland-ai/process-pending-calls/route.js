import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  updateDoc,
} from "firebase/firestore";

// This endpoint should be called by a scheduler (e.g., cron job)
// to process any pending call requests that didn't get auto-handled
export async function GET(req) {
  // Check for a basic auth token to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  const secretToken = process.env.CRON_SECRET_TOKEN;

  if (
    secretToken &&
    (!authHeader ||
      !authHeader.startsWith("Bearer ") ||
      authHeader.substring(7) !== secretToken)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("Starting scheduled job to process pending call requests");
  const processedRequests = [];
  const failedRequests = [];

  try {
    // Query for business users
    const businessUsersQuery = query(
      collection(db, "users"),
      where("role", "==", "business")
    );
    const businessUsersSnapshot = await getDocs(businessUsersQuery);
    console.log(
      `Found ${businessUsersSnapshot.size} business accounts to check`
    );

    for (const businessDoc of businessUsersSnapshot.docs) {
      const businessId = businessDoc.id;

      // Find pending call requests
      const now = Timestamp.now();
      const oneHourAgo = new Timestamp(now.seconds - 3600, now.nanoseconds);

      const requestsRef = collection(db, "users", businessId, "requestCalls");
      const pendingRequestsQuery = query(
        requestsRef,
        where("status", "==", "pending"),
        where("requestedAt", "<=", oneHourAgo) // Only process requests that are at least 1 hour old
      );

      const pendingRequests = await getDocs(pendingRequestsQuery);
      console.log(
        `Found ${pendingRequests.size} pending requests for business ${businessId}`
      );

      for (const requestDoc of pendingRequests.docs) {
        const requestId = requestDoc.id;
        console.log(`Processing pending request: ${requestId}`);

        try {
          // Call the auto-call-handler for each pending request
          const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
          const autoCallUrl = `${baseUrl}/api/bland-ai/auto-call-handler`;

          console.log(`Calling auto-call-handler at ${autoCallUrl}`);
          const response = await fetch(autoCallUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId,
              businessId,
            }),
          });

          if (response.ok) {
            const responseData = await response.json();
            processedRequests.push({
              requestId,
              callId: responseData.call_id,
              result: "success",
            });
            console.log(`Successfully processed request ${requestId}`);
          } else {
            const errorData = await response.json();
            console.error(`Failed to process request ${requestId}:`, errorData);
            failedRequests.push({
              requestId,
              error: errorData.error,
              details: errorData.details || "No details provided",
            });

            // Mark as failed after too many retries
            const requestData = requestDoc.data();
            const retryCount = requestData.retryCount || 0;

            if (retryCount >= 3) {
              console.log(
                `Request ${requestId} failed after ${retryCount} retries, marking as failed`
              );
              await updateDoc(
                doc(db, "users", businessId, "requestCalls", requestId),
                {
                  status: "failed",
                  failedAt: Timestamp.now(),
                  failureReason: "Failed after multiple retry attempts",
                }
              );
            } else {
              console.log(
                `Incrementing retry count for request ${requestId} to ${retryCount + 1}`
              );
              await updateDoc(
                doc(db, "users", businessId, "requestCalls", requestId),
                {
                  retryCount: retryCount + 1,
                }
              );
            }
          }
        } catch (requestError) {
          console.error(`Error processing request ${requestId}:`, requestError);
          failedRequests.push({ requestId, error: requestError.message });
        }
      }
    }

    console.log(
      `Scheduled job completed. Processed: ${processedRequests.length}, Failed: ${failedRequests.length}`
    );
    return NextResponse.json({
      success: true,
      processed: processedRequests.length,
      processedRequests,
      failed: failedRequests.length,
      failedRequests,
    });
  } catch (error) {
    console.error("Error in cron job for processing calls:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
