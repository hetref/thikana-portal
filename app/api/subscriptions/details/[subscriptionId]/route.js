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
} from "firebase/firestore";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

export async function GET(req, { params }) {
  try {
    const { subscriptionId } = params;
    // Get userId from query params
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    // If userId is not provided in the query params, try to extract it from the subscription document
    let userIdToUse = userId;
    let firestoreSubscription = null;

    if (!userIdToUse) {
      // Find the subscription in Firestore to get the userId
      // This is a fallback if userId is not provided in the query
      const allUsersRef = collection(db, "users");
      const allUsersSnap = await getDocs(allUsersRef);

      for (const userDoc of allUsersSnap.docs) {
        const userSubsRef = collection(
          db,
          "users",
          userDoc.id,
          "subscriptions"
        );
        const subsQuery = query(
          userSubsRef,
          where("subscriptionId", "==", subscriptionId)
        );
        const subsQuerySnap = await getDocs(subsQuery);

        if (!subsQuerySnap.empty) {
          userIdToUse = userDoc.id;
          firestoreSubscription = subsQuerySnap.docs[0].data();
          break;
        }
      }
    } else {
      // If userId is provided, just get the subscription document
      const userSubsRef = collection(db, "users", userIdToUse, "subscriptions");
      const subsQuery = query(
        userSubsRef,
        where("subscriptionId", "==", subscriptionId)
      );
      const subsQuerySnap = await getDocs(subsQuery);

      if (!subsQuerySnap.empty) {
        firestoreSubscription = subsQuerySnap.docs[0].data();
      }
    }

    if (!userIdToUse) {
      return NextResponse.json(
        { error: "Could not determine user for this subscription" },
        { status: 404 }
      );
    }

    // Get Razorpay credentials from users collection
    const userDocRef = doc(db, "users", userIdToUse);
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

    // Fetch the subscription details from Razorpay
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);

    // Fetch the plan details
    const plan = await razorpay.plans.fetch(subscription.plan_id);

    // Fetch payment history for this subscription
    const payments = await razorpay.payments.all({
      subscription_id: subscriptionId,
    });

    // Combine all data for a comprehensive response
    const responseData = {
      ...subscription,
      planDetails: plan,
      payments: payments.items,
      firestoreData: firestoreSubscription,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching subscription details:", error);
    const errorMessage =
      error.message || "Failed to fetch subscription details";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
