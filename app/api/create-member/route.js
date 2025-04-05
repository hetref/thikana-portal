import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getServerSession } from "next-auth";
import { sendNotificationToUser } from "@/lib/notifications";

export async function POST(req) {
  try {
    // Get the request body
    const { email, name, phone, role, businessId } = await req.json();

    // Validate input
    if (!email || !name || !businessId) {
      return NextResponse.json(
        { message: "Email, name, and businessId are required" },
        { status: 400 }
      );
    }

    // Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: email,
      password: "Thikana@123", // Default password
      displayName: name,
    });

    const memberId = userRecord.uid;

    // Set custom claims to identify as member
    await adminAuth.setCustomUserClaims(memberId, {
      role: "member",
      businessId: businessId,
    });

    // Get business name
    const businessDoc = await adminDb.collection("users").doc(businessId).get();
    const businessName = businessDoc.exists
      ? businessDoc.data()?.businessName || "Business"
      : "Business";

    // Create document in users collection
    await adminDb
      .collection("users")
      .doc(memberId)
      .set({
        email: email,
        name: name,
        phone: phone || "",
        role: "member", // Role in database
        businessId: businessId,
        businessName: businessName, // Store business name for reference
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    // Create document in businesses/{businessId}/members/{memberId}
    await adminDb
      .collection("businesses")
      .doc(businessId)
      .collection("members")
      .doc(memberId)
      .set({
        email: email,
        name: name,
        phone: phone || "",
        role: role || "Staff",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    // Send notification to the member
    await sendNotificationToUser(memberId, {
      title: "Welcome to Thikana as a Member",
      message: `${businessName} added you as a member on Thikana. You can now manage business operations.`,
      type: "system",
      email: true, // Send email notification
      whatsapp: false,
    });

    return NextResponse.json({ success: true, memberId }, { status: 201 });
  } catch (error) {
    console.error("Error creating member:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create member" },
      { status: 500 }
    );
  }
}
