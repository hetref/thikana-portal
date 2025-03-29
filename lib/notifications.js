import { db } from "./firebase";
import {
  collection,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  where,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

// Helper function to generate timestamp-based ID
function generateNotificationId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

// Step 1: Get notifications for a logged-in user
export function getNotifications(callback, userId) {
  // Validate userId
  if (!userId) {
    console.log("Error: No userId provided to getNotifications");
    return () => {};
  }

  try {
    // Step 2: Create reference to user's notifications collection
    const path = `users/${userId}/notifications`;
    console.log("Accessing notifications at path:", path);
    const notificationsRef = collection(db, path);

    // Step 3: Create query to get notifications in descending order
    const notificationsQuery = query(
      notificationsRef,
      orderBy("timestamp", "desc")
    );

    // Step 4: Set up real-time listener
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        // Log the raw snapshot data
        console.log(
          "Raw snapshot data:",
          snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }))
        );

        const notifications = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp:
            doc.data().timestamp?.toDate().toLocaleString() || "Just now",
        }));

        console.log("Processed notifications:", notifications);
        callback(notifications);
      },
      (error) => {
        console.error("Error in notifications listener:", error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up notifications listener:", error);
    return () => {};
  }
}

// Function to verify if notifications exist for a user
export async function verifyUserNotifications(userId) {
  if (!userId) {
    console.log("Error: No userId provided to verifyUserNotifications");
    return;
  }

  try {
    const notificationsRef = collection(db, `users/${userId}/notifications`);
    const snapshot = await getDocs(notificationsRef);

    console.log("User ID:", userId);
    console.log("Notifications path:", `users/${userId}/notifications`);
    console.log("Number of notifications found:", snapshot.size);

    snapshot.forEach((doc) => {
      console.log("Notification document:", doc.id, doc.data());
    });
  } catch (error) {
    console.error("Error verifying notifications:", error);
  }
}

// Add a new notification to specific users or everyone
export async function addNotification(notification) {
  try {
    console.log("Starting to add notification:", notification);
    const timestamp = Timestamp.now();
    const notificationId = generateNotificationId();

    const notificationData = {
      ...notification,
      timestamp,
      isRead: false,
      sender: notification.sender || "Admin",
      whatsapp: notification.whatsapp || false,
      email: notification.email || false,
    };

    console.log("Created notification data:", notificationData);

    // If sending to everyone
    if (notification.to === "everyone") {
      console.log("Sending to everyone");
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      console.log("Found", usersSnapshot.size, "users");

      const promises = usersSnapshot.docs.map(async (userDoc) => {
        console.log("Adding notification to user:", userDoc.id);

        // Add notification to Firestore
        await setDoc(
          doc(db, "users", userDoc.id, "notifications", notificationId),
          notificationData
        );

        // Send WhatsApp notification if enabled
        if (notificationData.whatsapp) {
          await sendWhatsAppNotification(userDoc.data(), notificationData);
        }

        // Send Email notification if enabled
        if (notificationData.email) {
          await sendEmailNotification(userDoc.data(), notificationData);
        }
      });

      await Promise.all(promises);
      console.log(
        "Successfully sent notification to all users with ID:",
        notificationId
      );
      return notificationId;
    }

    // If sending to specific user groups (business or users)
    else {
      console.log("Sending to specific group:", notification.to);
      const usersQuery = query(
        collection(db, "users"),
        where("role", "==", notification.to)
      );
      const usersSnapshot = await getDocs(usersQuery);
      console.log("Found", usersSnapshot.size, "users in group");

      const promises = usersSnapshot.docs.map(async (userDoc) => {
        console.log("Adding notification to user:", userDoc.id);

        // Add notification to Firestore
        await setDoc(
          doc(db, "users", userDoc.id, "notifications", notificationId),
          notificationData
        );

        // Send WhatsApp notification if enabled
        if (notificationData.whatsapp) {
          await sendWhatsAppNotification(userDoc.data(), notificationData);
        }

        // Send Email notification if enabled
        if (notificationData.email) {
          await sendEmailNotification(userDoc.data(), notificationData);
        }
      });

      await Promise.all(promises);
      console.log(
        "Successfully sent notification to target users with ID:",
        notificationId
      );
      return notificationId;
    }
  } catch (error) {
    console.error("Error adding notification:", error);
    throw error;
  }
}

// Mark a notification as read
export async function markNotificationAsRead(userId, notificationId) {
  try {
    console.log(
      "Marking notification as read:",
      notificationId,
      "for user:",
      userId
    );
    const notificationRef = doc(
      db,
      "users",
      userId,
      "notifications",
      notificationId
    );
    await updateDoc(notificationRef, {
      isRead: true,
    });
    console.log("Successfully marked notification as read");
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

// Add this function to test if notifications exist
export async function checkNotificationsStructure(userId) {
  try {
    console.log("Checking notifications structure for user:", userId);

    // Check if user document exists
    const userDoc = await getDoc(doc(db, "users", userId));
    console.log("User document exists:", userDoc.exists());

    // Get notifications collection
    const notificationsRef = collection(db, "users", userId, "notifications");
    const notificationsSnap = await getDocs(notificationsRef);
    console.log("Number of notifications:", notificationsSnap.size);

    // Log each notification
    notificationsSnap.forEach((doc) => {
      console.log("Notification:", doc.id, doc.data());
    });
  } catch (error) {
    console.error("Error checking structure:", error);
  }
}

// Add a test notification
export async function addTestNotification(userId) {
  try {
    const notificationId = generateNotificationId();
    const notificationData = {
      title: "Test Notification",
      message:
        "This is a test notification to verify the notification system is working correctly.",
      type: "test",
      sender: "System",
      timestamp: Timestamp.now(),
      isRead: false,
      to: "everyone",
      whatsapp: false,
      email: false,
    };

    await setDoc(
      doc(db, "users", userId, "notifications", notificationId),
      notificationData
    );

    console.log("Test notification added successfully");
    return notificationId;
  } catch (error) {
    console.error("Error adding test notification:", error);
    throw error;
  }
}

// Send notification to a specific user
export async function sendNotificationToUser(targetUserId, notification) {
  try {
    if (!targetUserId) {
      throw new Error("Target user ID is required");
    }

    console.log("Sending notification to user:", targetUserId);

    const notificationId = generateNotificationId();
    const timestamp = Timestamp.now();

    // Default values for the notification
    const defaultData = {
      title: "New Notification",
      type: "system",
      sender: "System",
      timestamp,
      isRead: false,
      whatsapp: notification.whatsapp || false,
      email: notification.email || false,
    };

    // Merge with provided notification data
    const notificationData = {
      ...defaultData,
      ...notification,
    };

    // Get user data
    const userDoc = await getDoc(doc(db, "users", targetUserId));
    const userData = userDoc.exists() ? userDoc.data() : null;

    // Set the notification document
    await setDoc(
      doc(db, "users", targetUserId, "notifications", notificationId),
      notificationData
    );

    // Send WhatsApp notification if enabled
    if (notificationData.whatsapp && userData) {
      await sendWhatsAppNotification(userData, notificationData);
    }

    // Send Email notification if enabled
    if (notificationData.email && userData) {
      await sendEmailNotification(userData, notificationData);
    }

    console.log("Notification sent successfully to user:", targetUserId);
    return notificationId;
  } catch (error) {
    console.error("Error sending notification to user:", error);
    throw error;
  }
}

// Get unread notification count
export function getUnreadNotificationCount(callback, userId) {
  if (!userId) {
    console.log("Error: No userId provided to getUnreadNotificationCount");
    return () => {};
  }

  try {
    const path = `users/${userId}/notifications`;
    const notificationsRef = collection(db, path);

    // Create query to get only unread notifications
    const unreadQuery = query(notificationsRef, where("isRead", "==", false));

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      unreadQuery,
      (snapshot) => {
        const count = snapshot.size;
        console.log("Unread notification count:", count);
        callback(count);
      },
      (error) => {
        console.error("Error in unread notifications listener:", error);
        callback(0);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up unread notifications listener:", error);
    return () => {};
  }
}

// Delete a notification
export async function deleteNotification(userId, notificationId) {
  try {
    if (!userId || !notificationId) {
      throw new Error("User ID and notification ID are required");
    }

    console.log("Deleting notification:", notificationId, "for user:", userId);

    const notificationRef = doc(
      db,
      "users",
      userId,
      "notifications",
      notificationId
    );
    await deleteDoc(notificationRef);

    console.log("Notification deleted successfully");
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId) {
  try {
    if (!userId) {
      console.log("Error: No userId provided to markAllNotificationsAsRead");
      throw new Error("User ID is required");
    }

    console.log("Marking all notifications as read for user:", userId);

    // Query to get all unread notifications
    const notificationsRef = collection(db, `users/${userId}/notifications`);
    const unreadQuery = query(notificationsRef, where("isRead", "==", false));

    const unreadSnapshot = await getDocs(unreadQuery);
    console.log(`Found ${unreadSnapshot.size} unread notifications`);

    // Update all unread notifications in parallel
    const batch = writeBatch(db);

    unreadSnapshot.forEach((doc) => {
      const notifRef = doc.ref;
      batch.update(notifRef, { isRead: true });
    });

    if (unreadSnapshot.size > 0) {
      await batch.commit();
      console.log("Successfully marked all notifications as read");
    } else {
      console.log("No unread notifications to mark as read");
    }
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

// Helper function to send WhatsApp notification
async function sendWhatsAppNotification(userData, notificationData) {
  try {
    if (!userData.phone) {
      console.log(
        "Cannot send WhatsApp notification: No phone number available"
      );
      return;
    }

    // Format phone to international format (keep only digits and + symbol)
    let phoneNumber = userData.phone.replace(/[^\d+]/g, "");

    // Ensure it has a country code (add 91 for India if not present)
    if (!phoneNumber.startsWith("+")) {
      if (!phoneNumber.startsWith("91")) {
        phoneNumber = "91" + phoneNumber;
      }
    } else {
      // Remove the + if present
      phoneNumber = phoneNumber.substring(1);
    }

    console.log(`Sending WhatsApp notification to ${phoneNumber}`);

    // Create a simple text message for the notification
    const messageText = `${notificationData.title}: ${notificationData.message}`;

    const response = await fetch("/api/notification-whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: phoneNumber,
        notificationContent: messageText,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("WhatsApp API response error:", errorData);
      throw new Error(`WhatsApp notification failed: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log("WhatsApp notification sent successfully:", responseData);
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
  }
}

// Helper function to send Email notification
async function sendEmailNotification(userData, notificationData) {
  try {
    if (!userData.email) {
      console.log("Cannot send Email notification: No email available");
      return;
    }

    const response = await fetch("/api/notification-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userData.email,
        name: userData.name || userData.displayName || "User",
        subject: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        timestamp: new Date().toISOString(),
        sender: notificationData.sender,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email notification failed: ${response.statusText}`);
    }

    console.log("Email notification sent successfully");
  } catch (error) {
    console.error("Error sending Email notification:", error);
  }
}
