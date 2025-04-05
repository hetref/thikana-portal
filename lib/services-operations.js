import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * Gets a specific service by ID
 * @param {string} userId - The user ID who owns the service
 * @param {string} serviceId - The ID of the service to retrieve
 * @returns {Promise<Object>} - The service data
 */
export async function getService(userId, serviceId) {
  try {
    const serviceDoc = await getDoc(
      doc(db, `users/${userId}/services`, serviceId)
    );

    if (!serviceDoc.exists()) {
      throw new Error("Service not found");
    }

    return {
      id: serviceDoc.id,
      ...serviceDoc.data(),
    };
  } catch (error) {
    console.error("Error getting service:", error);
    throw error;
  }
}
