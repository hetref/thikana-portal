import { NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CryptoJS from "crypto-js";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// This endpoint is for testing webhook signature verification only
export async function POST(req, { params }) {
  try {
    // Fix: await params before destructuring
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get the raw body from the request
    const rawBody = await req.text();

    // Get the Razorpay signature from headers
    const razorpaySignature = req.headers.get("x-razorpay-signature");

    if (!razorpaySignature) {
      return NextResponse.json(
        {
          error: "No Razorpay signature found in request headers",
          headers: Object.fromEntries([...req.headers.entries()]),
        },
        { status: 400 }
      );
    }

    // Get user's webhook secret from Firestore
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDocSnap.data();

    if (!userData.razorpayInfo || !userData.razorpayInfo.webhookSecret) {
      return NextResponse.json(
        { error: "Webhook secret not found" },
        { status: 400 }
      );
    }

    // Decrypt the webhook secret
    const encryptedSecret = userData.razorpayInfo.webhookSecret;
    const decryptedWebhookSecret = CryptoJS.AES.decrypt(
      encryptedSecret,
      ENCRYPTION_KEY
    ).toString(CryptoJS.enc.Utf8);

    // Verify the webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", decryptedWebhookSecret)
      .update(rawBody)
      .digest("hex");

    // For testing - calculate with both string and buffer approaches
    const bufferBody = Buffer.from(rawBody);
    const expectedSignatureWithBuffer = crypto
      .createHmac("sha256", decryptedWebhookSecret)
      .update(bufferBody)
      .digest("hex");

    // Return extensive debug information
    return NextResponse.json({
      verificationResult: {
        receivedSignature: razorpaySignature,
        signatureMatches: expectedSignature === razorpaySignature,
        bufferSignatureMatches:
          expectedSignatureWithBuffer === razorpaySignature,
      },
      diagnostics: {
        secret: {
          length: decryptedWebhookSecret.length,
          firstChars: decryptedWebhookSecret.substring(0, 4) + "...", // Don't reveal the full secret
        },
        signatures: {
          expected: {
            method: "String",
            value: expectedSignature,
          },
          expectedWithBuffer: {
            method: "Buffer",
            value: expectedSignatureWithBuffer,
          },
          received: razorpaySignature,
        },
        body: {
          length: rawBody.length,
          preview: rawBody.substring(0, 100) + "...", // First 100 chars of the body
        },
        headers: Object.fromEntries([...req.headers.entries()]),
      },
    });
  } catch (error) {
    console.error("Error in webhook test:", error);
    return NextResponse.json(
      {
        error: "Error in webhook test",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
