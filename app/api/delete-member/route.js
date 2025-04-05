import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    // Get the request body
    const { memberId, businessId } = await req.json();

    // Validate input
    if (!memberId || !businessId) {
      return NextResponse.json(
        { message: "MemberId and businessId are required" },
        { status: 400 }
      );
    }

    // Delete from businesses/{businessId}/members/{memberId}
    await adminDb
      .collection("businesses")
      .doc(businessId)
      .collection("members")
      .doc(memberId)
      .delete();

    // Delete from users collection
    await adminDb.collection("users").doc(memberId).delete();

    // Delete user from Firebase Authentication
    await adminAuth.deleteUser(memberId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json(
      { message: error.message || "Failed to delete member" },
      { status: 500 }
    );
  }
}
