import Razorpay from "razorpay";

export async function POST(req) {
  try {
    const { planId, userId } = await req.json(); // Extracting planId from the request body

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12,
      notes: {
        userId,
        note: "This is test note"
      }
    });

    console.log("SUBSCRIPTION", subscription)

    return new Response(JSON.stringify(subscription), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Subscription creation failed." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
