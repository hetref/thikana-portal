import { db, storage } from "./firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  increment,
  runTransaction,
  setDoc,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { Timestamp } from "firebase/firestore";
import {
  ref as databaseRef,
  push,
  set,
  get,
  update,
  remove,
  onValue,
} from "firebase/database";
import { database } from "./firebase";

export function getProducts(userId, callback) {
  const productsCol = collection(db, `users/${userId}/products`);
  const unsubscribe = onSnapshot(
    productsCol,
    (productSnapshot) => {
      if (!productSnapshot.empty) {
        const products = productSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(products);
      } else {
        callback([]);
      }
    },
    (error) => {
      console.error("Error fetching products:", error);
      callback([]);
    }
  );

  return unsubscribe;
}

export function getProduct(userId, productId) {
  const productRef = doc(db, `users/${userId}/products`, productId);
  return new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(
      productRef,
      (productSnap) => {
        if (productSnap.exists()) {
          resolve({ id: productSnap.id, ...productSnap.data() });
        } else {
          resolve(null);
        }
      },
      (error) => {
        console.error("Error fetching product:", error);
        reject(error);
      }
    );
    // Return the unsubscribe function to allow the caller to stop listening
    return unsubscribe;
  });
}

export async function addProduct(userId, product, imageFile) {
  const storageRef = ref(storage, `${userId}/product-images/${imageFile.name}`);
  await uploadBytes(storageRef, imageFile);
  const imageUrl = await getDownloadURL(storageRef);

  const productRef = doc(collection(db, `users/${userId}/products`));
  const productId = productRef.id;

  await setDoc(productRef, {
    ...product,
    id: productId,
    imageUrl,
    totalSales: 0,
    totalRevenue: 0,
    purchaseCount: 0,
  });

  return productId;
}

export async function updateProduct(userId, product, imageFile) {
  if (!product.id) throw new Error("Product ID is required for update");

  let imageUrl = product.imageUrl;
  if (imageFile) {
    // Delete the previous image if it exists
    if (
      imageUrl &&
      imageUrl.startsWith("https://firebasestorage.googleapis.com")
    ) {
      const oldImageRef = ref(storage, imageUrl);
      await deleteObject(oldImageRef);
    }

    // Upload the new image
    const storageRef = ref(
      storage,
      `${userId}/product-images/${imageFile.name}`
    );
    await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(storageRef);
  }

  await updateDoc(doc(db, `users/${userId}/products`, product.id), {
    ...product,
    imageUrl,
  });
}

/**
 * Delete a product from Firestore and optionally its image from storage
 *
 * @param {string} userId - The ID of the user (business) who owns the product
 * @param {string} productId - The ID of the product to delete
 * @param {string} [imageUrl] - Optional URL of the product image to delete from storage
 * @returns {Promise<boolean>} - Returns true if deletion was successful
 */
export async function deleteProduct(userId, productId, imageUrl) {
  if (!userId || !productId) {
    throw new Error("User ID and Product ID are required");
  }

  try {
    // Reference to the product document in Firestore
    const productRef = doc(db, `users/${userId}/products`, productId);

    // First, verify the product exists
    const productDoc = await getDoc(productRef);
    if (!productDoc.exists()) {
      throw new Error("Product not found");
    }

    // Delete the product
    await deleteDoc(productRef);

    // Delete the product image from storage if provided
    if (
      imageUrl &&
      imageUrl.startsWith("https://firebasestorage.googleapis.com")
    ) {
      try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      } catch (imageError) {
        console.error("Error deleting product image:", imageError);
        // Continue with product deletion even if image deletion fails
      }
    }

    return true;
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
}

export async function recordPurchase(userId, productId, quantity, price) {
  try {
    await runTransaction(db, async (transaction) => {
      const productRef = doc(db, `users/${userId}/products`, productId);
      const userAnalyticsRef = doc(db, `analytics/${userId}`);
      const now = Timestamp.now();
      const monthYear = now.toDate().toISOString().slice(0, 7); // Format: YYYY-MM
      const year = now.toDate().getFullYear().toString();

      // Read product and user analytics documents
      const productDoc = await transaction.get(productRef);
      const userAnalyticsDoc = await transaction.get(userAnalyticsRef);

      if (!productDoc.exists()) {
        throw new Error("Product not found");
      }

      const productData = productDoc.data();
      if (productData.quantity < quantity) {
        throw new Error("Not enough stock");
      }

      // Update product
      transaction.update(productRef, {
        quantity: increment(-quantity),
        purchaseCount: increment(1),
        totalSales: increment(quantity),
        totalRevenue: increment(price * quantity),
      });

      // Update monthly sales for the product
      const productMonthlyData = productData.monthlySales || {};
      const currentMonthData = productMonthlyData[monthYear] || {
        sales: 0,
        revenue: 0,
      };

      transaction.update(productRef, {
        [`monthlySales.${monthYear}.sales`]: increment(quantity),
        [`monthlySales.${monthYear}.revenue`]: increment(price * quantity),
      });

      // Update yearly sales for the product
      const productYearlyData = productData.yearlySales || {};
      const currentYearData = productYearlyData[year] || {
        sales: 0,
        revenue: 0,
      };

      transaction.update(productRef, {
        [`yearlySales.${year}.sales`]: increment(quantity),
        [`yearlySales.${year}.revenue`]: increment(price * quantity),
      });

      // Handle user analytics updates
      if (!userAnalyticsDoc.exists()) {
        transaction.set(userAnalyticsRef, {
          totalProductsBought: quantity,
          totalSales: 1,
          totalRevenue: price * quantity,
          averageOrderValue: price * quantity,
        });
      } else {
        const userAnalytics = userAnalyticsDoc.data();
        const newTotalSales = userAnalytics.totalSales + 1;
        const newTotalRevenue = userAnalytics.totalRevenue + price * quantity;
        transaction.update(userAnalyticsRef, {
          totalProductsBought: increment(quantity),
          totalSales: increment(1),
          totalRevenue: increment(price * quantity),
          averageOrderValue: newTotalRevenue / newTotalSales,
        });
      }

      // Update monthly analytics
      const monthlyAnalyticsRef = doc(
        db,
        `analytics/${userId}/monthly`,
        monthYear
      );
      transaction.set(
        monthlyAnalyticsRef,
        {
          sales: increment(quantity),
          revenue: increment(price * quantity),
        },
        { merge: true }
      );

      // Update yearly analytics
      const yearlyAnalyticsRef = doc(db, `analytics/${userId}/yearly`, year);
      transaction.set(
        yearlyAnalyticsRef,
        {
          sales: increment(quantity),
          revenue: increment(price * quantity),
        },
        { merge: true }
      );
    });
  } catch (error) {
    console.error("Error recording purchase:", error);
    throw error;
  }
}

// export async function getProductAnalytics(userId, productId) {
//   const productDoc = await getDoc(doc(db, `users/${userId}/products`, productId))
//   if (!productDoc.exists()) {
//     throw new Error("Product not found")
//   }
//   return { id: productDoc.id, ...productDoc.data() }
// }

export function getUserAnalytics(userId, callback) {
  const userAnalyticsRef = doc(db, `analytics/${userId}`);
  const unsubscribe = onSnapshot(
    userAnalyticsRef,
    (userAnalyticsDoc) => {
      if (userAnalyticsDoc.exists()) {
        callback(userAnalyticsDoc.data());
      } else {
        callback({
          totalProductsBought: 0,
          totalSales: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
        });
      }
    },
    (error) => {
      console.error("Error fetching user analytics:", error);
      callback({
        totalProductsBought: 0,
        totalSales: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      });
    }
  );

  return unsubscribe;
}

export function getMonthlyAnalytics(userId, callback) {
  const monthlyAnalyticsRef = collection(db, `analytics/${userId}/monthly`);

  // Get all documents from the monthly collection
  const unsubscribe = onSnapshot(
    monthlyAnalyticsRef,
    (querySnapshot) => {
      if (querySnapshot.empty) {
        console.log("No monthly analytics found");
        callback({});
        return;
      }

      // Create an object with all monthly data
      const monthlyData = {};
      querySnapshot.forEach((doc) => {
        monthlyData[doc.id] = doc.data();
      });

      console.log("Monthly data from Firebase:", monthlyData);
      callback(monthlyData);
    },
    (error) => {
      console.error("Error fetching monthly analytics:", error);
      callback({});
    }
  );

  return unsubscribe;
}

export function getYearlyAnalytics(userId, callback) {
  const yearlyAnalyticsRef = collection(db, `analytics/${userId}/yearly`);

  // Get all documents from the yearly collection
  const unsubscribe = onSnapshot(
    yearlyAnalyticsRef,
    (querySnapshot) => {
      if (querySnapshot.empty) {
        console.log("No yearly analytics found");
        callback({});
        return;
      }

      // Create an object with all yearly data
      const yearlyData = {};
      querySnapshot.forEach((doc) => {
        yearlyData[doc.id] = doc.data();
      });

      console.log("Yearly data from Firebase:", yearlyData);
      callback(yearlyData);
    },
    (error) => {
      console.error("Error fetching yearly analytics:", error);
      callback({});
    }
  );

  return unsubscribe;
}

// Add a new product
export const addProductToDatabase = async (businessId, productData) => {
  try {
    const productsRef = databaseRef(database, "products");
    const newProductRef = push(productsRef);
    const productId = newProductRef.key;

    // Add business ID to product data
    const product = {
      ...productData,
      id: productId,
      businessId: businessId,
      createdAt: new Date().toISOString(),
    };

    await set(newProductRef, product);
    return productId;
  } catch (error) {
    console.error("Error adding product:", error);
    throw error;
  }
};

// Update an existing product
export const updateProductInDatabase = async (productId, productData) => {
  try {
    const productRef = databaseRef(database, `products/${productId}`);
    await update(productRef, {
      ...productData,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};

// Delete a product
export const deleteProductFromDatabase = async (productId) => {
  try {
    const productRef = databaseRef(database, `products/${productId}`);
    await remove(productRef);
    return true;
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

// Get all products for a business
export const getBusinessProductsFromDatabase = (businessId, callback) => {
  const productsRef = databaseRef(database, "products");

  return onValue(productsRef, (snapshot) => {
    const products = [];
    snapshot.forEach((childSnapshot) => {
      const product = childSnapshot.val();
      if (product.businessId === businessId) {
        products.push(product);
      }
    });
    callback(products);
  });
};

// Get a single product by ID
export const getProductByIdFromDatabase = async (productId) => {
  try {
    const productRef = databaseRef(database, `products/${productId}`);
    const snapshot = await get(productRef);

    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting product:", error);
    throw error;
  }
};

// Upload a product image
export const uploadProductImageToDatabase = async (businessId, file) => {
  try {
    const fileRef = storageRef(
      storage,
      `products/${businessId}/${Date.now()}_${file.name}`
    );
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

// Record a purchase
export const recordPurchaseFromDatabase = async (
  userId,
  productId,
  quantity,
  price
) => {
  try {
    // Get the product details first
    const product = await getProductByIdFromDatabase(productId);
    if (!product) throw new Error("Product not found");

    // Make sure there's enough stock
    if (product.quantity < quantity) {
      throw new Error("Not enough stock available");
    }

    // Update product quantity
    await updateProductInDatabase(productId, {
      quantity: product.quantity - quantity,
    });

    // Record the purchase
    const purchasesRef = databaseRef(database, "purchases");
    const newPurchaseRef = push(purchasesRef);

    await set(newPurchaseRef, {
      userId,
      productId,
      productName: product.name,
      businessId: product.businessId,
      quantity,
      price,
      totalAmount: price * quantity,
      status: "completed",
      purchaseDate: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error recording purchase:", error);
    throw error;
  }
};
