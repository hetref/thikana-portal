import { NextResponse } from "next/server";
import { doc, updateDoc, getDoc, collection, getDocs, where, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getServerSession } from "next-auth/next";

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, newStatus, businessId } = body;

    // Validate required fields
    if (!orderId || !newStatus || !businessId) {
      return NextResponse.json(
        { error: "Missing required fields: orderId, newStatus, businessId" },
        { status: 400 }
      );
    }

    // Validate status values
    const validStatuses = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: " + validStatuses.join(", ") },
        { status: 400 }
      );
    }

    // Get the business document to verify ownership (security check)
    const businessDoc = await getDoc(doc(db, "businesses", businessId));
    if (!businessDoc.exists()) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Find the order in business orders collection
    const businessOrderRef = doc(db, "businesses", businessId, "orders", orderId);
    const businessOrderDoc = await getDoc(businessOrderRef);

    if (!businessOrderDoc.exists()) {
      return NextResponse.json(
        { error: "Order not found in business records" },
        { status: 404 }
      );
    }

    const orderData = businessOrderDoc.data();
    const userId = orderData.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Order data incomplete - missing user ID" },
        { status: 400 }
      );
    }

    // Update status in business orders collection
    await updateDoc(businessOrderRef, {
      status: newStatus,
      statusUpdatedAt: new Date(),
      lastModified: new Date(),
    });

    // Update status in user orders collection
    const userOrderRef = doc(db, "users", userId, "orders", orderId);
    const userOrderDoc = await getDoc(userOrderRef);

    if (userOrderDoc.exists()) {
      await updateDoc(userOrderRef, {
        status: newStatus,
        statusUpdatedAt: new Date(),
        lastModified: new Date(),
      });
    }

    // Send status update notification (if needed)
    try {
      // Get user info for notification
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.exists() ? userDoc.data() : null;

      if (userData && userData.email) {
        // Send status update email to customer
        const statusMessages = {
          confirmed: "Your order has been confirmed and is being prepared.",
          preparing: "Your order is currently being prepared.",
          ready: "Your order is ready for pickup/delivery.",
          completed: "Your order has been completed successfully.",
          cancelled: "Your order has been cancelled."
        };

        const statusEmailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-order-status-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerEmail: userData.email,
            customerName: userData.name || userData.displayName,
            orderId: orderId,
            newStatus: newStatus,
            businessName: orderData.businessName || "Store",
            statusMessage: statusMessages[newStatus] || `Your order status has been updated to ${newStatus}.`,
          }),
        });

        if (!statusEmailResponse.ok) {
          console.warn("Failed to send status update email:", await statusEmailResponse.text());
        }
      }
    } catch (emailError) {
      console.error("Error sending status update email:", emailError);
      // Don't fail the status update if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Order status updated successfully",
      orderId,
      newStatus,
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update order status" },
      { status: 500 }
    );
  }
} 