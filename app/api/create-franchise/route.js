import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request) {
  try {
    const {
      adminName,
      email,
      phone,
      franchiseOwner,
      businessData: franchiseData,
    } = await request.json();

    if (!adminName || !email || !phone || !franchiseOwner || !franchiseData) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details:
            "adminName, email, phone, franchiseOwner, and businessData are required",
        },
        { status: 400 }
      );
    }

    // First check if user already exists with this email
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      if (userRecord) {
        return NextResponse.json(
          {
            error: "User with this email already exists",
          },
          { status: 400 }
        );
      }
    } catch (error) {
      // If error code is auth/user-not-found, that's what we want
      if (error.code !== "auth/user-not-found") {
        console.error("Error checking existing user:", error);
        return NextResponse.json(
          {
            error: "Error checking existing user",
            details: error.message,
          },
          { status: 500 }
        );
      }
    }

    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: "thikana2025", // Default password
      displayName: adminName,
      phoneNumber: phone.startsWith("+") ? phone : `+91${phone}`,
    });

    // Get the owner's business data
    const ownerDoc = await getDoc(doc(db, "businesses", franchiseOwner));
    if (!ownerDoc.exists()) {
      // Delete the created user as we couldn't complete the process
      await admin.auth().deleteUser(userRecord.uid);
      return NextResponse.json(
        {
          error: "Owner business not found",
        },
        { status: 404 }
      );
    }

    const ownerData = ownerDoc.data();

    // Create user document
    const userData = {
      ...franchiseData,
      name: adminName,
      email: email,
      phone: phone,
      role: "business",
      username: `${franchiseData.businessName.toLowerCase().replace(/\s+/g, "-")}-franchise-${Math.floor(Math.random() * 90000) + 10000}`,
      profilePic:
        franchiseData.profilePic ||
        "https://firebasestorage.googleapis.com/v0/b/recommendation-system-62a42.appspot.com/o/assets%2Favatar.png?alt=media&token=7782c79f-c178-4b02-8778-bb3b93965aa5",
      uid: userRecord.uid,
      franchiseOwner: franchiseOwner,
      isFranchise: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSignIn: serverTimestamp(),
    };

    // Create business document
    const businessData = {
      ...ownerData,
      businessName: franchiseData.businessName,
      adminName: adminName,
      email: email,
      phone: phone,
      adminId: userRecord.uid,
      franchiseOwner: franchiseOwner,
      isFranchise: true,
      locations: franchiseData.locations || {},
      createdAt: serverTimestamp(),
    };

    // Save data to Firestore
    await Promise.all([
      setDoc(doc(db, "users", userRecord.uid), userData),
      setDoc(doc(db, "businesses", userRecord.uid), businessData),
    ]);

    return NextResponse.json({
      success: true,
      message: "Franchise created successfully",
      franchiseId: userRecord.uid,
    });
  } catch (error) {
    console.error("Error creating franchise:", error);
    return NextResponse.json(
      {
        error: "Failed to create franchise",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
