import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET(request, { params }) {
  const { uid } = await params;

  // Get userId from query params if available
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || uid;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    // Get the user's Razorpay settings from the users collection
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);

    // Check if user exists and has Razorpay info
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();

      if (
        userData.razorpayInfo &&
        userData.razorpayInfo.razorpayKeyId &&
        userData.razorpayInfo.razorpayKeySecret
      ) {
        return NextResponse.json({ isConfigured: true });
      }
    }

    // If not configured or missing fields
    return NextResponse.json({ isConfigured: false });
  } catch (error) {
    console.error("Error checking Razorpay configuration:", error);
    return NextResponse.json(
      { error: "Failed to check Razorpay configuration" },
      { status: 500 }
    );
  }
}
