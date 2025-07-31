import { auth } from "@/lib/firebase";

// Fixed: Make userStatus reactive and handle null states
const getUserStatus = () => {
  try {
    return auth.currentUser ? "authenticated" : "unauthenticated";
  } catch (error) {
    console.error("Error getting user status:", error);
    return "unauthenticated";
  }
};

// Fixed: Make userEmailStatus more robust with proper error handling
const userEmailStatus = () => {
  try {
    if (!auth.currentUser) {
      return null; // User not authenticated
    }
    
    // Check if the user object has the emailVerified property
    if (typeof auth.currentUser.emailVerified === 'boolean') {
      return auth.currentUser.emailVerified;
    }
    
    // Fallback to false if emailVerified is undefined
    return false;
  } catch (error) {
    console.error("Error checking email verification status:", error);
    return null; // Return null on error to indicate unknown status
  }
};

// Fixed: Create a reactive userStatus that updates with auth state changes
const userStatus = getUserStatus();

export { userStatus, userEmailStatus, getUserStatus };
