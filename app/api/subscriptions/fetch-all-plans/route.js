import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import CryptoJS from "crypto-js";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

export async function GET(request) {
  try {
    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

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

    // Get all plans from Razorpay
    const plans = await razorpay.plans.all();

    // Format the plans for easier frontend consumption
    const formattedPlans = plans.items.map((plan) => ({
      id: plan.id,
      name: plan.item.name,
      description: plan.item.description,
      amount: plan.item.amount,
      currency: plan.item.currency,
      interval: plan.period,
      intervalCount: plan.interval,
      billingCycles: plan.total_count || null,
      trialDays: plan.trial_period || 0,
      created_at: plan.created_at,
      notes: plan.notes || {},
    }));

    console.log("PLANS", plans);

    return NextResponse.json({
      plans: formattedPlans,
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    const errorMessage = error.message || "Failed to fetch subscription plans";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
