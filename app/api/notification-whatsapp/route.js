import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { phone, notificationContent } = await request.json();

    const response = await fetch(
      "https://graph.facebook.com/v21.0/592543543932338/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer EAANrkthXHSQBO2honeOsJlypTcmyuEFVelzbBHJxxrMjnAF5AA3SfjmfQUm5FAaVMPEMbx2zqXs2ZAZCgRfatIUOdkdYajSrtPKSkZCvEeLo6nwDGEiOdOflZAen3iz8kpE57BemCKm2W8PDk0Mz5IpuqKqRfe6Gqk5WpszVCpD4vyKqApY0TqHAXICI5vqs6lhySN7tER8pwA8dNQFAboynOhQWZCGZBAI1jakZCTR",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: "notify_thikana",
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: notificationContent }],
              },
            ],
          },
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
