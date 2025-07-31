import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { phone, notificationContent } = await request.json();
    const properNotificationContent = `
    ${notificationContent}
    
— Thikana Team`

    const response = await fetch(
      "https://graph.facebook.com/v21.0/592543543932338/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: {
            body: properNotificationContent
          }
        }),
      }
    );

    const data = await response.json();
    console.log("RESPONSE", response);
    console.log("RESPONSE", data);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
