import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ensure you have your Firebase setup in firebase.js
import CryptoJS from "crypto-js";
import Razorpay from "razorpay";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key"; // Use your actual encryption key

export async function POST(req) {
  try {
    console.log("Create product order API called");
    const body = await req.json();
    console.log("Request body:", body);

    const { userId, amount } = body;

    if (!userId) {
      console.error("Missing userId in request");
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      console.error("Invalid amount in request:", amount);
      return new Response(
        JSON.stringify({ error: "Valid amount is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Creating order for user ${userId} with amount ${amount}`);

    // Fetch and decrypt Razorpay keys
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      if (userData.razorpayInfo) {
        try {
          const decryptedKeyId = CryptoJS.AES.decrypt(
            userData.razorpayInfo.razorpayKeyId,
            ENCRYPTION_KEY
          ).toString(CryptoJS.enc.Utf8);

          const decryptedKeySecret = CryptoJS.AES.decrypt(
            userData.razorpayInfo.razorpayKeySecret,
            ENCRYPTION_KEY
          ).toString(CryptoJS.enc.Utf8);

          console.log("Successfully decrypted Razorpay keys");

          console.log(decryptedKeyId, decryptedKeySecret);

          // Create Razorpay order
          const razorpay = new Razorpay({
            key_id: decryptedKeyId,
            key_secret: decryptedKeySecret,
          });

          const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // Razorpay expects amount in paise
            currency: "INR",
            receipt: `receipt_order_${Math.floor(Math.random() * 1000000)}`,
            notes: {
              userId,
            },
          });

          console.log("Order created:", order);
          return new Response(
            JSON.stringify({
              orderId: order.id,
              amount: order.amount,
              keyId: decryptedKeyId,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (decryptError) {
          console.error("Error decrypting Razorpay keys:", decryptError);
          return new Response(
            JSON.stringify({ error: "Failed to decrypt Razorpay keys" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      } else {
        console.error("Razorpay info not found for user:", userId);
        return new Response(
          JSON.stringify({
            error:
              "Razorpay info not found. Please set up your payment account.",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } else {
      console.error("User not found:", userId);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
