import { NextResponse } from "next/server";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import CryptoJS from "crypto-js";
import crypto from "crypto";

// Get current date and time in YYYY-MM-DD HH:MM:SS format
const getCurrentDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Add to income collection
async function addToIncome(userId, amount, category) {
  try {
    const timestamp = getCurrentDateTime();

    // Create reference to user's income subcollection
    const incomesRef = collection(db, "transactions", userId, "user_income");

    // Add income document
    await addDoc(incomesRef, {
      name: timestamp, // Use timestamp as the name
      amount: amount / 100, // Convert from paise to rupees
      category,
      timestamp,
      type: "income",
    });

    console.log(
      `Added ${category} income of ${amount / 100} for user ${userId}`
    );
  } catch (error) {
    console.error("Error adding to income collection:", error);
  }
}

export async function POST(req, { params }) {
  try {
    // We'll still use the URL parameter to find the webhook secret for verification
    const { userId: urlUserId } = await params;

    if (!urlUserId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log("USERID", urlUserId);

    // Get the raw body from the request
    const rawBody = await req.text();

    // Get the Razorpay signature from headers
    const razorpaySignature = req.headers.get("x-razorpay-signature");

    if (!razorpaySignature) {
      console.error("No Razorpay signature found in request headers");
      return NextResponse.json(
        { error: "Signature verification failed" },
        { status: 401 }
      );
    }

    // Get user's webhook secret from Firestore
    const userDocRef = doc(db, "users", urlUserId);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.error("User document not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDocSnap.data();

    if (!userData.razorpayInfo || !userData.razorpayInfo.webhookSecret) {
      console.error("Webhook secret not found for user");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 400 }
      );
    }

    try {
      // Use the webhook secret directly without decryption
      console.log("Retrieved webhook secret");

      // Get the webhook secret directly (no decryption needed)
      const webhookSecret = userData.razorpayInfo.webhookSecret;

      // Log part of the secret for debugging (mask most of it)
      if (webhookSecret) {
        console.log(
          "WEBHOOK SECRET (masked):",
          webhookSecret.length > 6
            ? `${webhookSecret.substring(0, 3)}...${webhookSecret.substring(webhookSecret.length - 3)}`
            : "TOO SHORT"
        );
      } else {
        console.error("Webhook secret is empty");
        return NextResponse.json(
          { error: "Invalid webhook secret" },
          { status: 500 }
        );
      }

      // Parse the webhook data
      const webhookData = JSON.parse(rawBody);

      // Verify the webhook signature
      let signatureIsValid = false;
      let verificationMethod = "";

      // Method 1: Standard string-based verification (most common)
      try {
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(rawBody)
          .digest("hex");

        signatureIsValid = expectedSignature === razorpaySignature;
        if (signatureIsValid) verificationMethod = "string-based";
      } catch (err) {
        console.error("Method 1 verification error:", err);
      }

      // Method 2: Try with Buffer (sometimes needed for binary content)
      if (!signatureIsValid) {
        try {
          const bufferBody = Buffer.from(rawBody);
          const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(bufferBody)
            .digest("hex");

          signatureIsValid = expectedSignature === razorpaySignature;
          if (signatureIsValid) verificationMethod = "buffer-based";
        } catch (err) {
          console.error("Method 2 verification error:", err);
        }
      }

      // Method 3: Try with trimmed secret (in case there are whitespace issues)
      if (!signatureIsValid) {
        try {
          const trimmedSecret = webhookSecret.trim();
          const expectedSignature = crypto
            .createHmac("sha256", trimmedSecret)
            .update(rawBody)
            .digest("hex");

          console.log("Expected signature:", expectedSignature);
          console.log("WEBHOOK SECRET", webhookSecret);

          signatureIsValid = expectedSignature === razorpaySignature;
          if (signatureIsValid) verificationMethod = "trimmed-secret";
        } catch (err) {
          console.error("Method 3 verification error:", err);
        }
      }

      // If none of the methods worked, log detailed info and return error
      if (!signatureIsValid) {
        console.error("All signature verification methods failed");
        console.error(`Secret length: ${webhookSecret.length}`);
        console.error(
          `Signature received: ${razorpaySignature.substring(0, 10)}...`
        );

        return NextResponse.json(
          { error: "Signature verification failed" },
          { status: 401 }
        );
      }

      console.log(
        `Webhook signature verified successfully using ${verificationMethod} method`
      );

      // Signature verified, now process the webhook event
      const event = webhookData.event;
      const payload =
        webhookData.payload?.payment?.entity ||
        webhookData.payload?.subscription?.entity ||
        webhookData.payload?.payment_link?.entity ||
        {};

      console.log(`Received webhook event: ${event}`);

      // Extract userId from notes in the payload - this is the key change
      const notesUserId = payload.notes?.userId;

      // Use the userId from notes if available, otherwise use the URL param
      const effectiveUserId = notesUserId || urlUserId;

      console.log(
        `Processing webhook for user: ${effectiveUserId} (from ${notesUserId ? "notes" : "URL"})`
      );

      // Process different event types
      switch (event) {
        // Payment events
        case "payment.authorized":
          await updatePaymentStatus(
            effectiveUserId,
            payload.id,
            "authorized",
            payload
          );
          break;
        case "payment.captured":
          await updatePaymentStatus(
            effectiveUserId,
            payload.id,
            "paid",
            payload
          );
          // Add payment amount to income collection with category "Sales"
          await addToIncome(effectiveUserId, payload.amount, "Sales");

          if (payload.invoice_id) {
            // This payment might be for a subscription
            await updateSubscriptionStatusFromPayment(effectiveUserId, payload);
          }
          break;
        case "payment.failed":
          await updatePaymentStatus(
            effectiveUserId,
            payload.id,
            "failed",
            payload
          );
          break;
        case "payment.refunded":
          await updatePaymentStatus(
            effectiveUserId,
            payload.id,
            "refunded",
            payload
          );
          break;

        // Subscription events
        case "subscription.authenticated":
          await updateSubscriptionStatus(
            effectiveUserId,
            payload.id,
            "authenticated",
            payload
          );
          break;
        case "subscription.activated":
          await updateSubscriptionStatus(
            effectiveUserId,
            payload.id,
            "active",
            payload
          );
          // Add subscription amount to income collection with category "Subscriptions"
          if (payload.total_count > 0 && payload.amount) {
            await addToIncome(effectiveUserId, payload.amount, "Subscriptions");
          }
          break;
        case "subscription.charged":
          await updateSubscriptionStatus(
            effectiveUserId,
            payload.id,
            "charged",
            payload
          );
          break;
        case "subscription.halted":
          await updateSubscriptionStatus(
            effectiveUserId,
            payload.id,
            "halted",
            payload
          );
          break;
        case "subscription.cancelled":
          await updateSubscriptionStatus(
            effectiveUserId,
            payload.id,
            "cancelled",
            payload
          );
          break;
        case "subscription.completed":
          await updateSubscriptionStatus(
            effectiveUserId,
            payload.id,
            "completed",
            payload
          );
          break;

        // Payment link events
        case "payment_link.paid":
          await updatePaymentLinkStatus(
            effectiveUserId,
            payload.id,
            "paid",
            payload
          );
          // If there's a payment object with amount, add to income
          if (payload.payment && payload.payment.amount) {
            await addToIncome(effectiveUserId, payload.payment.amount, "Sales");
          }
          break;
        case "payment_link.expired":
          await updatePaymentLinkStatus(
            effectiveUserId,
            payload.id,
            "expired",
            payload
          );
          break;

        default:
          console.log("Unhandled event type:", event);
      }

      // Return a 200 OK response to acknowledge receipt of the webhook
      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Function to update payment status in Firestore
async function updatePaymentStatus(userId, paymentId, status, paymentData) {
  try {
    console.log("USERID", userId);
    console.log("PAYMENTID", paymentId);
    console.log("STATUS", status);

    // Extract uniqueId from payment notes if available
    const uniqueId = paymentData.notes?.uniqueId;

    if (uniqueId) {
      console.log("Found uniqueId in notes:", uniqueId);

      // First try to get the document directly using the uniqueId as document ID
      const paymentDocRef = doc(db, "users", userId, "paymentLinks", uniqueId);
      const paymentDoc = await getDoc(paymentDocRef);

      if (paymentDoc.exists()) {
        // Document exists with uniqueId, update it directly
        await updateDoc(paymentDocRef, {
          status: status,
          updatedAt: Timestamp.now(),
          paymentData: paymentData,
        });

        console.log(`Updated payment document with uniqueId: ${uniqueId}`);
        return;
      }
    }

    // Fallback: If uniqueId not found or document doesn't exist, search by linkId
    console.log("Falling back to search by linkId:", paymentId);
    const paymentsRef = collection(db, "users", userId, "paymentLinks");
    const q = query(paymentsRef, where("linkId", "==", paymentId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // Payment not found, log the situation
      console.log(`Payment ${paymentId} not found in database`);
      return;
    }

    // Update each matching payment record (should be just one)
    const promises = querySnapshot.docs.map((doc) => {
      return updateDoc(doc.ref, {
        status: status,
        updatedAt: Timestamp.now(),
        paymentData: paymentData,
      });
    });

    await Promise.all(promises);
    console.log(
      `Updated ${promises.length} payment records for payment ${paymentId}`
    );
  } catch (error) {
    console.error("Error updating payment status:", error);
  }
}

// Function to update payment link status in Firestore
async function updatePaymentLinkStatus(userId, linkId, status, linkData) {
  try {
    // Extract uniqueId from link notes if available
    const uniqueId = linkData.notes?.uniqueId;

    if (uniqueId) {
      console.log("Found uniqueId in notes:", uniqueId);

      // First try to get the document directly using the uniqueId as document ID
      const linkDocRef = doc(db, "users", userId, "paymentLinks", uniqueId);
      const linkDoc = await getDoc(linkDocRef);

      if (linkDoc.exists()) {
        // Document exists with uniqueId, update it directly
        await updateDoc(linkDocRef, {
          status: status,
          updatedAt: Timestamp.now(),
          linkData: linkData,
        });

        console.log(`Updated payment link document with uniqueId: ${uniqueId}`);
        return;
      }
    }

    // Fallback: If uniqueId not found or document doesn't exist, search by linkId
    console.log("Falling back to search by linkId:", linkId);
    const linksRef = collection(db, "users", userId, "paymentLinks");
    const q = query(linksRef, where("linkId", "==", linkId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`Payment link ${linkId} not found in Firestore`);
      return;
    }

    // Update each matching payment link record
    const promises = querySnapshot.docs.map((doc) => {
      return updateDoc(doc.ref, {
        status: status,
        updatedAt: Timestamp.now(),
        linkData: linkData,
      });
    });

    await Promise.all(promises);
    console.log(
      `Updated ${promises.length} payment link records for link ${linkId}`
    );
  } catch (error) {
    console.error("Error updating payment link status:", error);
  }
}

// Function to update subscription status in Firestore
async function updateSubscriptionStatus(
  userId,
  subscriptionId,
  status,
  subscriptionData
) {
  try {
    // Extract uniqueId from subscription notes if available
    const uniqueId = subscriptionData.notes?.uniqueId;

    if (uniqueId) {
      console.log("Found uniqueId in notes:", uniqueId);

      // First try to get the document directly using the uniqueId as document ID
      const subscriptionDocRef = doc(
        db,
        "users",
        userId,
        "subscriptions",
        uniqueId
      );
      const subscriptionDoc = await getDoc(subscriptionDocRef);

      if (subscriptionDoc.exists()) {
        // Document exists with uniqueId, update it directly
        await updateDoc(subscriptionDocRef, {
          status: status,
          updatedAt: Timestamp.now(),
          subscriptionData: subscriptionData,
        });

        console.log(`Updated subscription document with uniqueId: ${uniqueId}`);
        return;
      }
    }

    // Fallback: If uniqueId not found or document doesn't exist, search by subscriptionId
    console.log("Falling back to search by subscriptionId:", subscriptionId);
    const subsRef = collection(db, "users", userId, "subscriptions");
    const q = query(subsRef, where("subscriptionId", "==", subscriptionId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`Subscription ${subscriptionId} not found in Firestore`);
      return;
    }

    // Update each matching subscription record
    const promises = querySnapshot.docs.map((doc) => {
      return updateDoc(doc.ref, {
        status: status,
        updatedAt: Timestamp.now(),
        subscriptionData: subscriptionData,
      });
    });

    await Promise.all(promises);
    console.log(
      `Updated ${promises.length} subscription records for subscription ${subscriptionId}`
    );
  } catch (error) {
    console.error("Error updating subscription status:", error);
  }
}

// Function to update subscription status based on a payment
async function updateSubscriptionStatusFromPayment(userId, paymentData) {
  try {
    if (!paymentData.invoice_id) return;

    // Find the subscription associated with this invoice
    const subscriptionId = paymentData.notes?.subscription_id;
    if (!subscriptionId) {
      console.log("No subscription ID found in payment notes");
      return;
    }

    // Check if uniqueId is available in notes
    const uniqueId = paymentData.notes?.uniqueId;

    if (uniqueId) {
      console.log("Found uniqueId in payment notes:", uniqueId);

      // Try to get the subscription document directly using the uniqueId
      const subscriptionDocRef = doc(
        db,
        "users",
        userId,
        "subscriptions",
        uniqueId
      );
      const subscriptionDoc = await getDoc(subscriptionDocRef);

      if (subscriptionDoc.exists()) {
        // Document exists with uniqueId, update it directly
        await updateDoc(subscriptionDocRef, {
          lastPaymentId: paymentData.id,
          lastPaymentAmount: paymentData.amount,
          lastPaymentDate: Timestamp.now(),
          lastPaymentStatus: paymentData.status,
          updatedAt: Timestamp.now(),
        });

        console.log(
          `Updated payment info for subscription with uniqueId: ${uniqueId}`
        );
        return;
      }
    }

    // Fallback: If uniqueId not found or document doesn't exist, search by subscriptionId
    console.log("Falling back to search by subscriptionId:", subscriptionId);
    // Update the subscription status
    const subsRef = collection(db, "users", userId, "subscriptions");
    const q = query(subsRef, where("subscriptionId", "==", subscriptionId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`Subscription ${subscriptionId} not found in Firestore`);
      return;
    }

    const promises = querySnapshot.docs.map((doc) => {
      return updateDoc(doc.ref, {
        lastPaymentId: paymentData.id,
        lastPaymentAmount: paymentData.amount,
        lastPaymentDate: Timestamp.now(),
        lastPaymentStatus: paymentData.status,
        updatedAt: Timestamp.now(),
      });
    });

    await Promise.all(promises);
    console.log(`Updated payment info for subscription ${subscriptionId}`);
  } catch (error) {
    console.error("Error updating subscription from payment:", error);
  }
}
