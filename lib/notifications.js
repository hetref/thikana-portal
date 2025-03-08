import { db } from "./firebase"
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
} from "firebase/firestore"

// Helper function to generate timestamp-based ID
function generateNotificationId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
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
    const unsubscribe = onSnapshot(notificationsQuery, 
      (snapshot) => {
        // Log the raw snapshot data
        console.log("Raw snapshot data:", snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));

        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate().toLocaleString() || "Just now"
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
    
    snapshot.forEach(doc => {
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
      profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(notification.sender || "Admin")}`,
    };

    console.log("Created notification data:", notificationData);

    // If sending to everyone
    if (notification.to === "everyone") {
      console.log("Sending to everyone");
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      console.log("Found", usersSnapshot.size, "users");
      
      const promises = usersSnapshot.docs.map(userDoc => {
        console.log("Adding notification to user:", userDoc.id);
        return setDoc(
          doc(db, "users", userDoc.id, "notifications", notificationId), 
          notificationData
        );
      });
      
      await Promise.all(promises);
      console.log("Successfully sent notification to all users with ID:", notificationId);
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
      
      const promises = usersSnapshot.docs.map(userDoc => {
        console.log("Adding notification to user:", userDoc.id);
        return setDoc(
          doc(db, "users", userDoc.id, "notifications", notificationId), 
          notificationData
        );
      });
      
      await Promise.all(promises);
      console.log("Successfully sent notification to target users with ID:", notificationId);
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
    console.log("Marking notification as read:", notificationId, "for user:", userId);
    const notificationRef = doc(db, "users", userId, "notifications", notificationId);
    await updateDoc(notificationRef, {
      isRead: true
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
    notificationsSnap.forEach(doc => {
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
      type: "test",
      sender: "System",
      timestamp: Timestamp.now(),
      isRead: false,
      to: "everyone",
      profileImage: `https://ui-avatars.com/api/?name=System`
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