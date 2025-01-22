import Razorpay from 'razorpay';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from "@/lib/firebase";

export async function POST(req) {
  const { subscription_id, payment_id, signature, plan, userId } = await req.json();

  try {
    // Fetch subscription details from Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const subscription = await razorpay.subscriptions.fetch(subscription_id);
    console.log("SUBSCRIPTION", subscription);

    await updateDoc(doc(db, "users", userId), {
      subscriptionInfo: { subscription },
      plan,
      subscriptionId: subscription_id,
      paymentId: payment_id,
      subscriptionStatus: subscription.status,
      signature,
      createdAt: new Date(),
      expiresAt: new Date(subscription.current_end * 1000),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Database Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to save subscription' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
