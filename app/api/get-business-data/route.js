import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    // Get the request body
    const { userId } = await req.json();

    // Validate input
    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user data to check if they're a member
    const userDoc = await adminDb.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();

    // If user is not a member or doesn't have a business ID, return error
    if (userData.role !== "member" || !userData.businessId) {
      return NextResponse.json(
        { message: "User is not a member of any business" },
        { status: 400 }
      );
    }

    // Get business data
    const businessDoc = await adminDb
      .collection("users")
      .doc(userData.businessId)
      .get();

    if (!businessDoc.exists) {
      return NextResponse.json(
        { message: "Business not found" },
        { status: 404 }
      );
    }

    const businessData = businessDoc.data();

    // Remove sensitive information from business data
    const sanitizedBusinessData = {
      businessId: userData.businessId,
      businessName: businessData.businessName,
      businessLogo: businessData.profilePic || null,
      businessCover: businessData.coverPic || null,
      businessAddress: businessData.locations || null,
      businessLocation: businessData.location || null,
      businessBio: businessData.bio || null,
      businessWebsite: businessData.website || null,
      businessCategories: businessData.business_categories || [],
    };

    return NextResponse.json(
      {
        success: true,
        businessData: sanitizedBusinessData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching business data:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch business data" },
      { status: 500 }
    );
  }
}
