import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CryptoJS from "crypto-js";
import Razorpay from "razorpay";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key";

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

    // Function to create order with given credentials
    const createOrderWithCredentials = async (keyId, keySecret) => {
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Razorpay expects amount in paise
        currency: "INR",
        receipt: `receipt_order_${Math.floor(Math.random() * 1000000)}`,
        notes: {
          userId,
          businessId: userId,
        },
      });

      return {
        orderId: order.id,
        amount: order.amount,
        keyId: keyId,
      };
    };

    // Try to get business-specific Razorpay credentials
    try {
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        if (userData.razorpayInfo && userData.razorpayInfo.razorpayKeyId && userData.razorpayInfo.razorpayKeySecret) {
          try {
            const decryptedKeyId = CryptoJS.AES.decrypt(
              userData.razorpayInfo.razorpayKeyId,
              ENCRYPTION_KEY
            ).toString(CryptoJS.enc.Utf8);

            const decryptedKeySecret = CryptoJS.AES.decrypt(
              userData.razorpayInfo.razorpayKeySecret,
              ENCRYPTION_KEY
            ).toString(CryptoJS.enc.Utf8);

            if (decryptedKeyId && decryptedKeySecret) {
              console.log("Using business-specific Razorpay credentials");
              try {
                const order = await createOrderWithCredentials(decryptedKeyId, decryptedKeySecret);
                
                return new Response(JSON.stringify(order), {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                });
              } catch (razorpayError) {
                console.error("Error creating order with business Razorpay credentials:", razorpayError);
                console.log("Business Razorpay credentials failed, falling back to system credentials");
              }
            } else {
              console.log("Decrypted business Razorpay credentials are empty, falling back to system credentials");
            }
          } catch (decryptError) {
            console.error("Error decrypting business Razorpay keys:", decryptError.message || decryptError);
            console.log("Decryption failed, falling back to system credentials");
          }
        } else {
          console.log("No business Razorpay credentials found, using system credentials");
        }
      }
    } catch (userError) {
      console.error("Error fetching user data:", userError);
    }

    // Fallback to system/default Razorpay credentials
    console.log("Using fallback system Razorpay credentials");
    
    const systemKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const systemKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!systemKeyId || !systemKeySecret) {
      console.error("System Razorpay credentials not configured");
      return new Response(
        JSON.stringify({ 
          error: "Payment system not configured. Please contact support." 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      const order = await createOrderWithCredentials(systemKeyId, systemKeySecret);
      
      return new Response(JSON.stringify({
        ...order,
        isSystemOrder: true, // Flag to indicate this was created with system credentials
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (systemOrderError) {
      console.error("Error creating order with system credentials:", systemOrderError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create payment order. Please try again." 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
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
