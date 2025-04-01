import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET(request) {
  try {
    // Get the business ID from the query parameters
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        {
          error: "Business ID is required",
        },
        { status: 400 }
      );
    }

    // Get business data from Firestore
    const businessDoc = await getDoc(doc(db, "businesses", businessId));

    if (!businessDoc.exists()) {
      return NextResponse.json(
        {
          error: "Business not found",
        },
        { status: 404 }
      );
    }

    // Get user data for the business
    const userDoc = await getDoc(doc(db, "users", businessId));

    if (!userDoc.exists()) {
      return NextResponse.json(
        {
          error: "User data not found",
        },
        { status: 404 }
      );
    }

    // Combine and return the data
    const businessData = businessDoc.data();
    const userData = userDoc.data();

    return NextResponse.json({
      business: businessData,
      user: userData,
    });
  } catch (error) {
    console.error("Error fetching business data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch business data",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
