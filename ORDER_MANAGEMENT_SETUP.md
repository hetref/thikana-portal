# Order Management System Setup

This document explains the new order management system with status tracking and email notifications.

## Overview

The enhanced order management system now includes:
- **Order Status Management**: Orders start as "pending" and can be updated through various stages
- **Email Notifications**: Automatic emails sent to both customers and business owners
- **Enhanced Dashboard**: Updated stats and filtering options
- **Real-time Updates**: Status changes trigger notifications

## Order Status Flow

1. **Pending** - Order placed, payment completed, awaiting business confirmation
2. **Confirmed** - Business has confirmed the order
3. **Preparing** - Order is being prepared
4. **Ready** - Order is ready for pickup/delivery
5. **Completed** - Order has been fulfilled
6. **Cancelled** - Order has been cancelled

## Environment Variables Required

Add these variables to your `.env.local` file:

```env
# Gmail SMTP Configuration for Order Emails
GMAIL_EMAIL=your_gmail_address@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password

# Site URL for email links
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Gmail SMTP Setup

1. **Enable 2-Factor Authentication**:
   - Go to your Google Account settings
   - Security → 2-Step Verification → Turn on

2. **Generate App Password**:
   - Go to Google Account → Security → 2-Step Verification
   - Scroll down to "App passwords"
   - Select "Mail" and your device
   - Copy the generated 16-character password

3. **Configure Environment Variables**:
   ```env
   GMAIL_EMAIL=youremail@gmail.com
   GMAIL_APP_PASSWORD=your16charpassword
   ```

## Features

### For Customers
- **Order Confirmation Email**: Sent immediately after placing order
- **Status Update Emails**: Sent when order status changes
- **Order Tracking**: View order status in profile

### For Business Owners
- **New Order Email**: Notification when new order is received
- **Status Management**: Easy-to-use interface to update order status
- **Enhanced Stats**: View pending, completed, and total orders
- **Status Filtering**: Filter orders by status and time period

## API Endpoints

### New Endpoints Added:
1. **`/api/send-order-email`** - Sends order confirmation emails
2. **`/api/update-order-status`** - Updates order status
3. **`/api/send-order-status-email`** - Sends status update emails

## Database Schema Changes

### Orders Collection Structure:
```javascript
{
  orderId: "razorpay_order_id",
  userId: "customer_user_id",
  businessId: "business_user_id", // Added
  businessName: "Store Name", // Added
  products: [/* product details */],
  amount: 100.00,
  status: "pending", // Changed from "completed"
  statusUpdatedAt: timestamp, // Added
  timestamp: timestamp,
  // ... other fields
}
```

## Security Features

- **Input Validation**: All API endpoints validate required fields
- **Authentication**: Order updates require business ownership verification
- **Error Handling**: Graceful error handling for email failures
- **Rate Limiting**: Consider adding rate limiting for email endpoints

## Testing

1. **Place a Test Order**:
   - Add items to cart
   - Complete payment
   - Check email inbox for confirmation

2. **Update Order Status**:
   - Go to business dashboard → Orders tab
   - Click "Update Status" on any order
   - Select new status and save

3. **Verify Email Flow**:
   - Customer should receive status update email
   - Business owner should receive new order notification

## Troubleshooting

### Email Not Sending
1. Check Gmail credentials in environment variables
2. Verify app password is correct (not regular password)
3. Check Gmail account has 2FA enabled
4. Review server logs for specific error messages

### Order Status Not Updating
1. Verify business ownership (only business owner can update their orders)
2. Check Firebase permissions
3. Ensure orderId and businessId are correct

### Missing Notifications
1. Check notification settings in user profile
2. Verify email addresses are correct in user documents
3. Check spam/junk folders

## Support

For issues or questions:
1. Check server logs for error messages
2. Verify all environment variables are set correctly
3. Test with a simple email first to verify SMTP connection 