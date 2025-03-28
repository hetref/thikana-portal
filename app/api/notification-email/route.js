import { NextResponse } from "next/server";
import { Resend } from "resend";
import NotificationEmail from "@/emails/notification-email";

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    // Extract notification data from the request
    const { email, name, subject, message, type, timestamp, sender } =
      await request.json();

    // Validate required fields
    if (!email || !subject || !message) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: email, subject, and message are required",
        },
        { status: 400 }
      );
    }

    console.log(`Sending email notification to ${email}`);

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: "Thikana <thikana@aryanshinde.in>",
      to: email,
      subject: subject,
      react: NotificationEmail({
        name: name || "User",
        message,
        subject,
        timestamp: timestamp
          ? new Date(timestamp).toLocaleString()
          : new Date().toLocaleString(),
        type,
        sender: sender || "Thikana",
      }),
    });

    // Check for errors
    if (error) {
      console.error("Error sending email:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Email sent successfully:", data);
    return NextResponse.json({
      success: true,
      message: "Email notification sent successfully",
      data,
    });
  } catch (error) {
    console.error("Error in notification-email endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email notification" },
      { status: 500 }
    );
  }
}
