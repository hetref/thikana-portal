import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Resolves the effective business ID for orders and cart operations
 * @param {string} businessId - The original business ID
 * @param {Object} product - The product object
 * @returns {string} - The resolved business ID
 */
export const resolveBusinessId = (businessId, product = null) => {
  // If we have a valid business ID, use it
  if (businessId && businessId !== "default-business") {
    return businessId;
  }

  // Try to get from product
  if (product?.businessId && product.businessId !== "default-business") {
    return product.businessId;
  }

  // Try to get from product's userId (some products might use userId as businessId)
  if (product?.userId && product.userId !== "default-business") {
    return product.userId;
  }

  // If all else fails, use system default
  return process.env.NEXT_PUBLIC_DEFAULT_BUSINESS_ID || "system-business";
};

/**
 * Gets the business name for a given business ID
 * @param {string} businessId - The business ID
 * @returns {Promise<string>} - The business name
 */
export const getBusinessName = async (businessId) => {
  if (!businessId || businessId === "default-business" || businessId === "system-business") {
    return "Thikana Store";
  }

  try {
    const businessDoc = await getDoc(doc(db, "users", businessId));
    if (businessDoc.exists()) {
      const businessData = businessDoc.data();
      return businessData.businessName || businessData.name || "Store";
    }
    return "Store";
  } catch (error) {
    console.error("Error fetching business name:", error);
    return "Store";
  }
};

/**
 * Checks if a business ID is a system/default business
 * @param {string} businessId - The business ID to check
 * @returns {boolean} - True if it's a system business
 */
export const isSystemBusiness = (businessId) => {
  const systemBusinessIds = [
    "default-business",
    "system-business", 
    process.env.NEXT_PUBLIC_DEFAULT_BUSINESS_ID
  ];
  return systemBusinessIds.includes(businessId);
};

/**
 * Gets the business owner's user ID from business ID
 * @param {string} businessId - The business ID
 * @returns {Promise<string|null>} - The business owner's user ID
 */
export const getBusinessOwnerId = async (businessId) => {
  if (isSystemBusiness(businessId)) {
    return null; // System businesses don't have individual owners
  }

  try {
    // First try the businesses collection
    const businessDoc = await getDoc(doc(db, "businesses", businessId));
    if (businessDoc.exists()) {
      const businessData = businessDoc.data();
      return businessData.userId || businessId;
    }

    // If not found in businesses collection, assume businessId is the userId
    const userDoc = await getDoc(doc(db, "users", businessId));
    if (userDoc.exists()) {
      return businessId;
    }

    return null;
  } catch (error) {
    console.error("Error getting business owner ID:", error);
    return null;
  }
}; 