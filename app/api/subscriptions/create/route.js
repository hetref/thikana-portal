import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import CryptoJS from "crypto-js";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

export async function POST(req) {
  try {
    const {
      userId,
      planId,
      customerEmail,
      customerName,
      customerPhone,
      totalCount,
      startAt,
      expiresAt,
      notes,
    } = await req.json();

    if (!userId || !planId) {
      return NextResponse.json(
        { error: "User ID and plan ID are required" },
        { status: 400 }
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Customer email is required" },
        { status: 400 }
      );
    }

    // Get Razorpay credentials from users collection
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDocSnap.data();

    if (
      !userData.razorpayInfo ||
      !userData.razorpayInfo.razorpayKeyId ||
      !userData.razorpayInfo.razorpayKeySecret
    ) {
      return NextResponse.json(
        { error: "Razorpay credentials not found" },
        { status: 400 }
      );
    }

    // Decrypt the key ID and secret
    const decryptedKeyId = CryptoJS.AES.decrypt(
      userData.razorpayInfo.razorpayKeyId,
      ENCRYPTION_KEY
    ).toString(CryptoJS.enc.Utf8);

    const decryptedKeySecret = CryptoJS.AES.decrypt(
      userData.razorpayInfo.razorpayKeySecret,
      ENCRYPTION_KEY
    ).toString(CryptoJS.enc.Utf8);

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: decryptedKeyId,
      key_secret: decryptedKeySecret,
    });

    // Prepare the subscription data
    const subscriptionData = {
      plan_id: planId,
      customer_notify: 1,
      notify_info: {
        notify_email: customerEmail,
      },
    };

    // Remove the customer object that was causing the error
    // Instead, just add phone to notify_info if provided
    if (customerPhone) {
      subscriptionData.notify_info.notify_phone = customerPhone;
    }

    // Add total count if provided
    if (totalCount && totalCount > 0) {
      subscriptionData.total_count = totalCount;
    }

    // Add start date if provided
    if (startAt) {
      // Convert to Unix timestamp if needed
      const startTimestamp =
        typeof startAt === "string"
          ? Math.floor(new Date(startAt).getTime() / 1000)
          : Math.floor(startAt / 1000);

      subscriptionData.start_at = startTimestamp;
    }

    // Add expiry date if provided
    if (expiresAt) {
      // Convert to Unix timestamp if needed
      const expiryTimestamp =
        typeof expiresAt === "string"
          ? Math.floor(new Date(expiresAt).getTime() / 1000)
          : Math.floor(expiresAt / 1000);

      subscriptionData.expire_by = expiryTimestamp;
    }

    // Razorpay requires either total_count or end_at
    // If neither is provided, set a default total_count of 36 (3 years for monthly plans)
    if (!totalCount && !expiresAt) {
      subscriptionData.total_count = 36; // Default to 36 cycles
    }

    // Add notes if provided
    if (notes) {
      // Format notes as a dictionary as required by Razorpay
      if (typeof notes === "object" && !Array.isArray(notes)) {
        // If notes is already an object, use it directly
        subscriptionData.notes = notes;
      } else {
        // Otherwise, create an object with a 'note' property
        subscriptionData.notes = { note: notes };
      }
    }

    // Create subscription with Razorpay
    const subscription = await razorpay.subscriptions.create(subscriptionData);

    return NextResponse.json({
      id: subscription.id,
      planId: subscription.plan_id,
      status: subscription.status,
      customerEmail: subscription.customer_notify ? customerEmail : null,
      customerName: subscription.customer?.name || null,
      customerPhone: subscription.customer?.contact || null,
      totalCount: subscription.total_count || null,
      paidCount: subscription.paid_count || 0,
      currentStart: subscription.current_start
        ? new Date(subscription.current_start * 1000).toISOString()
        : null,
      currentEnd: subscription.current_end
        ? new Date(subscription.current_end * 1000).toISOString()
        : null,
      endDate: subscription.end_at
        ? new Date(subscription.end_at * 1000).toISOString()
        : null,
      createdAt: subscription.created_at
        ? new Date(subscription.created_at * 1000).toISOString()
        : null,
      shortUrl: subscription.short_url || null,
      paymentLinkUrl: subscription.payment_link_url || null,
      remainingCount: subscription.remaining_count || null,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    const errorMessage = error.message || "Failed to create subscription";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
