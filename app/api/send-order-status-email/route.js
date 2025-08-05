import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Create Gmail SMTP transporter
const createTransporter = () => {
  // Validate environment variables
  if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Gmail SMTP credentials not configured. Please set GMAIL_EMAIL and GMAIL_APP_PASSWORD environment variables.");
  }

  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

// Generate status update email HTML template
const generateStatusUpdateEmailHTML = (orderData) => {
  const { orderId, newStatus, businessName, customerName, statusMessage } = orderData;
  
  const statusColors = {
    pending: "#ffa500",
    confirmed: "#3399cc",
    preparing: "#ff6b35",
    ready: "#22c55e",
    completed: "#22c55e",
    cancelled: "#ef4444"
  };

  const statusIcons = {
    pending: "⏳",
    confirmed: "✅",
    preparing: "👨‍🍳",
    ready: "📦",
    completed: "🎉",
    cancelled: "❌"
  };

  const statusColor = statusColors[newStatus] || "#3399cc";
  const statusIcon = statusIcons[newStatus] || "📋";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .status-update { background-color: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid ${statusColor}; }
            .status-badge { background-color: ${statusColor}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 10px 0; }
            .order-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
            .action-button { background-color: #3399cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .timeline { margin: 20px 0; }
            .timeline-item { display: flex; align-items: center; margin: 10px 0; }
            .timeline-dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 10px; }
            .timeline-dot.active { background-color: ${statusColor}; }
            .timeline-dot.inactive { background-color: #ddd; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${statusIcon} Order Status Update</h1>
            <p>Your order status has been updated</p>
        </div>
        
        <div class="content">
            <p>Dear ${customerName || 'Valued Customer'},</p>
            
            <div class="status-update">
                <h3>Order Status Updated</h3>
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Store:</strong> ${businessName}</p>
                <p><strong>New Status:</strong> <span class="status-badge">${newStatus.toUpperCase()}</span></p>
                <p><strong>Updated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="order-info">
                <h4>What's happening with your order?</h4>
                <p>${statusMessage}</p>
                
                <div class="timeline">
                    <div class="timeline-item">
                        <div class="timeline-dot ${['pending', 'confirmed', 'preparing', 'ready', 'completed'].includes(newStatus) ? 'active' : 'inactive'}"></div>
                        <span>Order Placed</span>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-dot ${['confirmed', 'preparing', 'ready', 'completed'].includes(newStatus) ? 'active' : 'inactive'}"></div>
                        <span>Order Confirmed</span>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-dot ${['preparing', 'ready', 'completed'].includes(newStatus) ? 'active' : 'inactive'}"></div>
                        <span>Preparing</span>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-dot ${['ready', 'completed'].includes(newStatus) ? 'active' : 'inactive'}"></div>
                        <span>Ready</span>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-dot ${newStatus === 'completed' ? 'active' : 'inactive'}"></div>
                        <span>Completed</span>
                    </div>
                </div>
            </div>
            
            ${newStatus === 'ready' ? `
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h4 style="color: #856404; margin: 0 0 10px 0;">📍 Ready for Pickup/Delivery</h4>
                    <p style="color: #856404; margin: 0;">Your order is ready! Please contact the merchant for pickup/delivery details.</p>
                </div>
            ` : ''}
            
            ${newStatus === 'completed' ? `
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h4 style="color: #155724; margin: 0 0 10px 0;">🎉 Order Completed</h4>
                    <p style="color: #155724; margin: 0;">Thank you for your order! We hope you enjoyed your purchase.</p>
                </div>
            ` : ''}
            
            ${newStatus === 'cancelled' ? `
                <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h4 style="color: #721c24; margin: 0 0 10px 0;">❌ Order Cancelled</h4>
                    <p style="color: #721c24; margin: 0;">Your order has been cancelled. If you have any questions, please contact the merchant.</p>
                </div>
            ` : ''}
            
            <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/profile?tab=orders" class="action-button">
                    View Order Details
                </a>
            </p>
            
            <p>If you have any questions about your order, please contact the merchant directly or reach out to our support team.</p>
            
            <p>Thank you for choosing Thikana Portal!</p>
        </div>
        
        <div class="footer">
            <p>This is an automated email. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Thikana Portal. All rights reserved.</p>
        </div>
    </body>
    </html>
  `;
};

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      customerEmail,
      customerName,
      orderId,
      newStatus,
      businessName,
      statusMessage,
    } = body;

    // Validate required fields
    if (!customerEmail || !orderId || !newStatus) {
      return NextResponse.json(
        { error: "Missing required fields: customerEmail, orderId, newStatus" },
        { status: 400 }
      );
    }

    // Validate Gmail credentials
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
      console.error("Gmail credentials not configured");
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const transporter = createTransporter();

    // Verify connection
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error("Gmail SMTP connection failed:", verifyError);
      return NextResponse.json(
        { error: "Email service connection failed" },
        { status: 500 }
      );
    }

    const mailOptions = {
      from: `"Thikana Portal" <${process.env.GMAIL_EMAIL}>`,
      to: customerEmail,
      subject: `Order Update: ${newStatus.toUpperCase()} - ${orderId.substring(0, 8)}`,
      html: generateStatusUpdateEmailHTML({
        orderId,
        newStatus,
        businessName,
        customerName,
        statusMessage,
      }),
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log("Status update email sent successfully:", result.messageId);
      
      // Close transporter
      transporter.close();

      return NextResponse.json({
        success: true,
        message: "Status update email sent successfully",
        messageId: result.messageId,
      });

    } catch (error) {
      console.error("Failed to send status update email:", error);
      transporter.close();
      return NextResponse.json(
        { error: "Failed to send status update email" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in send-order-status-email endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send status update email" },
      { status: 500 }
    );
  }
} 