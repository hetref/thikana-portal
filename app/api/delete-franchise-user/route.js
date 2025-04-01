import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";

export async function DELETE(request) {
  try {
    // Get the user ID from the query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          error: "User ID is required",
        },
        { status: 400 }
      );
    }

    // Delete the user from Firebase Authentication
    await admin.auth().deleteUser(userId);

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      {
        error: "Failed to delete user",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
