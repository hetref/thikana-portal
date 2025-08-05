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

// Generate email HTML templates
const generateCustomerEmailHTML = (orderData) => {
  const { orderId, amount, products, businessName, customerName } = orderData;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3399cc; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .order-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .product-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .total { font-weight: bold; font-size: 18px; color: #3399cc; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Order Confirmation</h1>
            <p>Thank you for your order!</p>
        </div>
        
        <div class="content">
            <p>Dear ${customerName || 'Valued Customer'},</p>
            
            <p>We're excited to confirm that your order has been placed successfully and is currently being processed.</p>
            
            <div class="order-details">
                <h3>Order Details</h3>
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Store:</strong> ${businessName}</p>
                <p><strong>Order Status:</strong> <span style="color: #ffa500;">Pending</span></p>
                <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
                
                <h4>Items Ordered:</h4>
                ${products.map(product => `
                    <div class="product-item">
                        <span>${product.productName} (x${product.quantity})</span>
                        <span>₹${(product.amount * product.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                
                <div class="product-item total">
                    <span>Total Amount</span>
                    <span>₹${amount.toFixed(2)}</span>
                </div>
            </div>
            
            <p>Your order is currently being prepared by the merchant. You will receive another email once your order status is updated.</p>
            
            <p>You can track your order status by visiting your profile in the Thikana Portal.</p>
            
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

const generateBusinessEmailHTML = (orderData) => {
  const { orderId, amount, products, customerName, customerId } = orderData;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order Received</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #22c55e; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .order-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .product-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .total { font-weight: bold; font-size: 18px; color: #22c55e; }
            .action-button { background-color: #3399cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎉 New Order Received!</h1>
            <p>You have a new customer order</p>
        </div>
        
        <div class="content">
            <p>Great news! You've received a new order through Thikana Portal.</p>
            
            <div class="order-details">
                <h3>Order Information</h3>
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Customer:</strong> ${customerName || 'Customer'}</p>
                <p><strong>Customer ID:</strong> ${customerId}</p>
                <p><strong>Order Status:</strong> <span style="color: #ffa500;">Pending</span></p>
                <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
                
                <h4>Items Ordered:</h4>
                ${products.map(product => `
                    <div class="product-item">
                        <span>${product.productName} (x${product.quantity})</span>
                        <span>₹${(product.amount * product.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                
                <div class="product-item total">
                    <span>Total Order Value</span>
                    <span>₹${amount.toFixed(2)}</span>
                </div>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Review the order details in your business dashboard</li>
                <li>Prepare the items for delivery/pickup</li>
                <li>Update the order status as you process it</li>
                <li>Contact the customer if you have any questions</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/profile?tab=orders" class="action-button">
                    View Order in Dashboard
                </a>
            </p>
            
            <p>Please process this order promptly to maintain customer satisfaction.</p>
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
      type, // 'customer' or 'business'
      customerEmail,
      businessEmail,
      customerName,
      businessName,
      orderId,
      amount,
      products,
      customerId,
    } = body;
    console.log("BODY", body);

    // Validate required fields
    if (!type || !orderId || !amount || !products) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    const results = [];

    // Send customer email
    if (type === 'customer' || type === 'both') {
      if (!customerEmail) {
        return NextResponse.json(
          { error: "Customer email is required" },
          { status: 400 }
        );
      }

      const customerMailOptions = {
        from: `"Thikana Portal" <${process.env.GMAIL_EMAIL}>`,
        to: customerEmail,
        subject: `Order Confirmation - ${orderId.substring(0, 8)}`,
        html: generateCustomerEmailHTML({
          orderId,
          amount,
          products,
          businessName,
          customerName,
        }),
      };

      try {
        const customerResult = await transporter.sendMail(customerMailOptions);
        results.push({ type: 'customer', success: true, messageId: customerResult.messageId });
        console.log("Customer email sent successfully:", customerResult.messageId);
      } catch (error) {
        console.error("Failed to send customer email:", error);
        results.push({ type: 'customer', success: false, error: error.message });
      }
    }

    // Send business email
    if (type === 'business' || type === 'both') {
      if (!businessEmail) {
        return NextResponse.json(
          { error: "Business email is required" },
          { status: 400 }
        );
      }

      const businessMailOptions = {
        from: `"Thikana Portal" <${process.env.GMAIL_EMAIL}>`,
        to: businessEmail,
        subject: `🎉 New Order Received - ${orderId.substring(0, 8)}`,
        html: generateBusinessEmailHTML({
          orderId,
          amount,
          products,
          customerName,
          customerId,
        }),
      };

      try {
        const businessResult = await transporter.sendMail(businessMailOptions);
        results.push({ type: 'business', success: true, messageId: businessResult.messageId });
        console.log("Business email sent successfully:", businessResult.messageId);
      } catch (error) {
        console.error("Failed to send business email:", error);
        results.push({ type: 'business', success: false, error: error.message });
      }
    }

    // Close transporter
    transporter.close();

    return NextResponse.json({
      success: true,
      message: "Emails processed",
      results,
    });

  } catch (error) {
    console.error("Error in send-order-email endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send emails" },
      { status: 500 }
    );
  }
} 