import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Ensure you have your Firebase setup in firebase.js
import CryptoJS from 'crypto-js';
import Razorpay from 'razorpay';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Use your actual encryption key

export async function POST(req) {
  try {
    const { amount, userId } = await req.json();

    // Fetch and decrypt Razorpay keys
    const userDocRef = doc(db, 'users', userId);
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

        console.log("KEYID KEYSECRET", decryptedKeyId, decryptedKeySecret);

        // Create Razorpay order
        const razorpay = new Razorpay({
          key_id: decryptedKeyId,
          key_secret: decryptedKeySecret,
        });

        const order = await razorpay.orders.create({
          amount: amount * 100, // Razorpay expects amount in paise
          currency: "INR",
          receipt: `receipt_order_${Math.random()}`,
          notes: {
            userId,
          },
        });

        console.log("Order created:", order);
        return new Response(JSON.stringify({ orderId: order.id, amount: order.amount, keyId: decryptedKeyId }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ error: 'Razorpay info not found' }), { status: 404 });
      }
    } else {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}