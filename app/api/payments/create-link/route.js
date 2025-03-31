import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import CryptoJS from "crypto-js";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Function to generate a unique ID without external dependencies
function generateUniqueId(length = 20) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const timestamp = new Date().getTime().toString(36);

  // Add timestamp as prefix for additional uniqueness
  result += timestamp;

  // Add random characters until we reach desired length
  const randomLength = Math.max(0, length - result.length);
  for (let i = 0; i < randomLength; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

export async function POST(req) {
  try {
    const {
      userId,
      amount,
      currency,
      description,
      customerEmail,
      customerName,
      customerPhone,
      expiresAt,
      notes,
    } = await req.json();

    if (!userId || !amount || !description) {
      return NextResponse.json(
        { error: "User ID, amount, and description are required" },
        { status: 400 }
      );
    }

    // Generate a unique ID for this payment link
    const uniqueId = generateUniqueId();

    // Get Razorpay credentials from users collection using client Firebase SDK
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

    // Decrypt the key secret
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

    // Prepare the payment link payload
    const paymentLinkData = {
      amount: amount,
      currency: currency || "INR",
      accept_partial: false,
      description: description,
      customer: {
        email: customerEmail || "",
        name: customerName || "",
        contact: customerPhone || "",
      },
      notify: {
        email: Boolean(customerEmail),
        sms: Boolean(customerPhone),
      },
      reminder_enable: true,
      notes: {
        userId: userId,
        uniqueId: uniqueId,
        ...notes,
      },
    };

    // Add expiry if provided
    if (expiresAt) {
      paymentLinkData.expire_by = Math.floor(
        new Date(expiresAt).getTime() / 1000
      );
    }

    // Create payment link with Razorpay
    const paymentLink = await razorpay.paymentLink.create(paymentLinkData);

    // Prepare data to save
    const paymentLinkToSave = {
      uniqueId: uniqueId,
      linkId: paymentLink.id,
      amount: parseInt(amount),
      currency: currency || "INR",
      description: description,
      customerEmail: customerEmail || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      shortUrl: paymentLink.short_url,
      status: paymentLink.status,
      notes: paymentLinkData.notes,
      createdAt: serverTimestamp(),
    };

    // Add expiry if provided
    if (expiresAt) {
      paymentLinkToSave.expiresAt = new Date(expiresAt);
    }

    // Reference to the document with our custom uniqueId
    const paymentLinkDocRef = doc(
      collection(db, "users", userId, "paymentLinks"),
      uniqueId
    );

    // Save to Firestore with the uniqueId as the document ID
    await setDoc(paymentLinkDocRef, paymentLinkToSave);

    return NextResponse.json({
      id: paymentLink.id,
      uniqueId: uniqueId,
      shortUrl: paymentLink.short_url,
      longUrl: paymentLink.long_url,
      status: paymentLink.status,
    });
  } catch (error) {
    console.error("Error creating payment link:", error);
    const errorMessage = error.message || "Failed to create payment link";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
