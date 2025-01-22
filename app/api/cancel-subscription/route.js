import Razorpay from "razorpay";

export async function POST(req) {
  try {
    const { subscriptionId } = await req.json(); // Extracting subscriptionId from the request body
    console.log("SUBSCRIPTIONID", subscriptionId)

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const cancellation = await razorpay.subscriptions.cancel(subscriptionId); // Canceling the subscription
    console.log("CANCELLING SUBSCRIPTION");

    return new Response(JSON.stringify(cancellation), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Subscription cancellation failed." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
