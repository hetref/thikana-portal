import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import CryptoJS from "crypto-js";
import { db } from "@/lib/firebase";
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

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

export async function POST(req, { params }) {
  try {
    const { subscriptionId } = params;
    const { userId, cancelAtCycleEnd = false } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
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

    // Cancel the subscription in Razorpay
    const cancelOptions = { cancel_at_cycle_end: cancelAtCycleEnd };
    const cancelledSubscription = await razorpay.subscriptions.cancel(
      subscriptionId,
      cancelOptions
    );

    // Update subscription status in Firestore
    await updateSubscriptionInFirestore(
      userId,
      subscriptionId,
      cancelAtCycleEnd ? "scheduled_to_cancel" : "cancelled",
      cancelledSubscription
    );

    return NextResponse.json({
      success: true,
      message: cancelAtCycleEnd
        ? "Subscription scheduled to cancel at the end of the billing cycle"
        : "Subscription cancelled successfully",
      subscription: cancelledSubscription,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    const errorMessage = error.message || "Failed to cancel subscription";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Function to update subscription in Firestore
async function updateSubscriptionInFirestore(
  userId,
  subscriptionId,
  status,
  subscriptionData
) {
  try {
    // Find the subscription document
    const subsRef = collection(db, "users", userId, "subscriptions");
    const q = query(subsRef, where("subscriptionId", "==", subscriptionId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`Subscription ${subscriptionId} not found in Firestore`);
      return;
    }

    // Update subscription status
    const promises = querySnapshot.docs.map((doc) => {
      return updateDoc(doc.ref, {
        status: status,
        updatedAt: Timestamp.now(),
        subscriptionData: subscriptionData,
      });
    });

    await Promise.all(promises);
    console.log(
      `Updated subscription status to ${status} for ${subscriptionId}`
    );
  } catch (error) {
    console.error("Error updating subscription in Firestore:", error);
    throw error;
  }
}
