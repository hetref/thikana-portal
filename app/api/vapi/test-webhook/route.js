import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const data = await req.json();

    console.log("VAPI Test Webhook received:", JSON.stringify(data, null, 2));

    return NextResponse.json({
      success: true,
      message: "Test webhook received successfully",
      receivedData: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in test webhook:", error);
    return NextResponse.json(
      { error: "Error processing test webhook", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  return NextResponse.json({
    status: "VAPI test webhook endpoint is active",
    timestamp: new Date().toISOString(),
    message: "Use POST to send test webhook data",
  });
}
