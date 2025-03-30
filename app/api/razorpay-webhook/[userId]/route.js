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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import CryptoJS from "crypto-js";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

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

    // Decrypt the webhook secret
    try {
      const decryptedWebhookSecret = CryptoJS.AES.decrypt(
        userData.razorpayInfo.webhookSecret,
        ENCRYPTION_KEY
      ).toString(CryptoJS.enc.Utf8);
      console.log(
        "DECRYPTED WEBHOOK SECRET PREV",
        decryptedWebhookSecret,
        ENCRYPTION_KEY
      );

      // Verify the webhook signature - try multiple methods as Razorpay's verification can be tricky
      let signatureIsValid = false;
      let verificationMethod = "";

      // Method 1: Standard string-based verification (most common)
      try {
        const expectedSignature = crypto
          .createHmac("sha256", decryptedWebhookSecret)
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
            .createHmac("sha256", decryptedWebhookSecret)
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
          const trimmedSecret = decryptedWebhookSecret.trim();
          const expectedSignature = crypto
            .createHmac("sha256", trimmedSecret)
            .update(rawBody)
            .digest("hex");

          console.log("Expected signature:", expectedSignature);
          console.log("DECRYPTED WEBHOOK SECRET", decryptedWebhookSecret);

          signatureIsValid = expectedSignature === razorpaySignature;
          if (signatureIsValid) verificationMethod = "trimmed-secret";
        } catch (err) {
          console.error("Method 3 verification error:", err);
        }
      }

      // If none of the methods worked, log detailed info and return error
      if (!signatureIsValid) {
        console.error("All signature verification methods failed");
        console.error(`Secret length: ${decryptedWebhookSecret.length}`);
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
      const webhookData = JSON.parse(rawBody);
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
    } catch (decryptionError) {
      console.error("Error decrypting webhook secret:", decryptionError);
      return NextResponse.json(
        { error: "Failed to decrypt webhook secret" },
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
    // Find the payment in the payments collection
    const paymentsRef = collection(db, "users", userId, "payments");
    const q = query(paymentsRef, where("paymentId", "==", paymentId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // Payment not found, let's create a record
      console.log(`Payment ${paymentId} not found, creating a new record`);
      // Ideally we would create a new payment record here
      return;
    }

    // Update each matching payment record (should be just one)
    const promises = querySnapshot.docs.map((doc) => {
      return updateDoc(doc.ref, {
        status: status,
        updatedAt: Timestamp.now(),
        paymentData: paymentData, // Store the full payment data for reference
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
    // Find the payment link in the paymentLinks collection
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
        linkData: linkData, // Store the full payment link data for reference
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
    // Find the subscription in the subscriptions collection
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
        subscriptionData: subscriptionData, // Store the full subscription data for reference
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
