import { getDoc, setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ensure you have your Firebase setup in firebase.js
import CryptoJS from "crypto-js";
import { NextResponse } from "next/server";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Use your actual encryption key

export async function GET(request, { params }) {
  const { userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      if (userData.razorpayInfo) {
        const decryptedKeyId = CryptoJS.AES.decrypt(
          userData.razorpayInfo.razorpayKeyId,
          ENCRYPTION_KEY
        ).toString(CryptoJS.enc.Utf8);
        const decryptedKeySecret = CryptoJS.AES.decrypt(
          userData.razorpayInfo.razorpayKeySecret,
          ENCRYPTION_KEY
        ).toString(CryptoJS.enc.Utf8);
        return new Response(
          JSON.stringify({
            razorpayKeyId: decryptedKeyId,
            razorpayKeySecret: decryptedKeySecret,
          }),
          { status: 200 }
        );
      } else {
        return new Response(
          JSON.stringify({ error: "Razorpay info not found" }),
          { status: 404 }
        );
      }
    } else {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function POST(request, { params }) {
  const { userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const { razorpayKeyId, razorpayKeySecret } = await request.json(); // Parse JSON body

  try {
    const encryptedKeyId = CryptoJS.AES.encrypt(
      razorpayKeyId,
      ENCRYPTION_KEY
    ).toString();
    const encryptedKeySecret = CryptoJS.AES.encrypt(
      razorpayKeySecret,
      ENCRYPTION_KEY
    ).toString();
    const userDocRef = doc(db, "users", userId);
    await setDoc(
      userDocRef,
      {
        razorpayInfo: {
          razorpayKeyId: encryptedKeyId,
          razorpayKeySecret: encryptedKeySecret,
        },
      },
      { merge: true }
    );
    return new Response(
      JSON.stringify({ message: "Payment settings updated successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating payment settings:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
