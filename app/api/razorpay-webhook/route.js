import { db } from '@/lib/firebase';
import { updateDoc, doc } from "@firebase/firestore";
import Crypto from "crypto";

// Use the new `segment config` for API routes
export const dynamic = 'force-dynamic'; // This replaces the old config export

export async function POST(req) {
  try {
    // Log headers for debugging
    console.log('Headers:', Object.fromEntries(req.headers));

    // Read raw body
    const chunks = [];
    for await (const chunk of req.body) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');

    console.log('Raw Body:', rawBody);

    // Verify Razorpay webhook signature
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
      console.error('Signature is undefined');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 400,
      });
    }

    const expectedSignature = Crypto.createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    console.log('Received Signature:', signature);
    console.log('Expected Signature:', expectedSignature);

    if (signature !== expectedSignature) {
      console.error('Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
      });
    }

    // Parse the event
    const event = JSON.parse(rawBody);

    // Handle subscription events
    switch (event.event) {
      case 'subscription.activated':
        console.log('Subscription activated');
        await updateSubscriptionStatus(event.payload.subscription, 'active');
        break;
      case 'subscription.completed':
        console.log('Subscription completed');
        await updateSubscriptionStatus(event.payload.subscription, 'completed');
        break;
      case 'subscription.cancelled':
        console.log('Subscription cancelled');
        await updateSubscriptionStatus(event.payload.subscription, 'cancelled');
        break;
      case 'subscription.expired':
        console.log('Subscription expired');
        await updateSubscriptionStatus(event.payload.subscription, 'expired');
        break;
      case 'subscription.paused':
        console.log('Subscription paused');
        await updateSubscriptionStatus(event.payload.subscription, 'paused');
        break;
      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    console.log('Webhook processed successfully');
    return new Response(JSON.stringify({ status: 'success' }), { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    });
  }
}

async function updateSubscriptionStatus(subscription, status) {
  const subscriptionId = subscription.entity.id;
  const { userId } = subscription.entity.notes;

  console.log("UserID", userId);

  await updateDoc(doc(db, "users", userId), {
    updatedAt: new Date(),
    subscriptionStatus: status,
  });

  console.log(`Subscription ${subscriptionId} updated to ${status}`);
}
