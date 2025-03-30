import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import CryptoJS from "crypto-js";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Valid period values for Razorpay
const VALID_PERIODS = ["daily", "weekly", "monthly", "yearly"];

export async function POST(req) {
  try {
    const {
      userId,
      name,
      description,
      amount,
      currency,
      interval,
      intervalCount,
      billingCycles,
      trialDays,
      notes,
      isActive,
    } = await req.json();

    if (!userId || !name || !amount || !interval) {
      return NextResponse.json(
        { error: "User ID, plan name, amount, and interval are required" },
        { status: 400 }
      );
    }

    // Validate period value
    if (!VALID_PERIODS.includes(interval.toLowerCase())) {
      return NextResponse.json(
        {
          error: `Invalid interval value. Must be one of: ${VALID_PERIODS.join(", ")}`,
        },
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

    console.log("RAZORPAY", decryptedKeyId, decryptedKeySecret);

    // Prepare the plan data
    const planData = {
      period: interval.toLowerCase(), // Ensure lowercase to match Razorpay's expectations
      interval: intervalCount || 1,
      item: {
        name: name,
        description: description,
        amount: amount,
        currency: currency || "INR",
      },
    };

    // Add notes if provided
    if (notes) {
      // Format notes as a dictionary as required by Razorpay
      if (typeof notes === "object" && !Array.isArray(notes)) {
        // If notes is already an object, ensure it includes userId
        planData.notes = {
          ...notes,
          userId: userId, // Ensure userId is always present
        };
      } else {
        // Otherwise, create an object with a customNote property and userId
        planData.notes = {
          customNote: notes,
          userId: userId,
        };
      }
    } else {
      // Always include userId in notes even if no other notes provided
      planData.notes = { userId: userId };
    }

    // Add trial period if provided
    if (trialDays && trialDays > 0) {
      planData.trial_period = trialDays;
      planData.trial_period_unit = "day";
    }

    // Add billing cycles if provided
    if (billingCycles && billingCycles > 0) {
      planData.total_count = billingCycles;
    }

    console.log("PLAN DATA", planData);

    // Create plan with Razorpay
    const plan = await razorpay.plans.create(planData);

    console.log("PLAN", plan);

    return NextResponse.json({
      id: plan.id,
      name: plan.item.name,
      amount: plan.item.amount,
      currency: plan.item.currency,
      description: plan.item.description,
      interval: plan.period,
      intervalCount: plan.interval,
      billingCycles: plan.total_count || null,
      trialDays: plan.trial_period || 0,
      created_at: plan.created_at,
      status: isActive !== false ? "active" : "inactive",
    });
  } catch (error) {
    console.error("Error creating subscription plan:", error);
    const errorMessage = error.message || "Failed to create subscription plan";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
