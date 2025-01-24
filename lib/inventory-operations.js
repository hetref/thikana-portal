import { db, storage } from "./firebase"
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
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { Timestamp } from "firebase/firestore"

export function getProducts(userId, callback) {
  const productsCol = collection(db, `users/${userId}/products`);
  const unsubscribe = onSnapshot(productsCol, (productSnapshot) => {
    if (!productSnapshot.empty) {
      const products = productSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      callback(products);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Error fetching products:", error);
    callback([]);
  });

  return unsubscribe;
}

export function getProduct(userId, productId) {
  const productRef = doc(db, `users/${userId}/products`, productId);
  return new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(productRef, (productSnap) => {
      if (productSnap.exists()) {
        resolve({ id: productSnap.id, ...productSnap.data() });
      } else {
        resolve(null);
      }
    }, (error) => {
      console.error("Error fetching product:", error);
      reject(error);
    });
    // Return the unsubscribe function to allow the caller to stop listening
    return unsubscribe;
  });
}

export async function addProduct(userId, product, imageFile) {
  const storageRef = ref(storage, `${userId}/product-images/${imageFile.name}`)
  await uploadBytes(storageRef, imageFile)
  const imageUrl = await getDownloadURL(storageRef)

  const productRef = doc(collection(db, `users/${userId}/products`))
  const productId = productRef.id

  await setDoc(productRef, {
    ...product,
    id: productId,
    imageUrl,
    totalSales: 0,
    totalRevenue: 0,
    purchaseCount: 0,
  })

  return productId
}

export async function updateProduct(userId, product, imageFile) {
  if (!product.id) throw new Error("Product ID is required for update")

  let imageUrl = product.imageUrl
  if (imageFile) {
    // Delete the previous image if it exists
    if (imageUrl && imageUrl.startsWith("https://firebasestorage.googleapis.com")) {
      const oldImageRef = ref(storage, imageUrl)
      await deleteObject(oldImageRef)
    }

    // Upload the new image
    const storageRef = ref(storage, `${userId}/product-images/${imageFile.name}`)
    await uploadBytes(storageRef, imageFile)
    imageUrl = await getDownloadURL(storageRef)
  }

  await updateDoc(doc(db, `users/${userId}/products`, product.id), {
    ...product,
    imageUrl,
  })
}

export async function deleteProduct(userId, productId, imageUrl) {
  await deleteDoc(doc(db, `users/${userId}/products`, productId))

  if (imageUrl.startsWith("https://firebasestorage.googleapis.com")) {
    const imageRef = ref(storage, imageUrl)
    await deleteObject(imageRef)
  }
}

export async function recordPurchase(userId, productId, quantity, price) {
  try {
    await runTransaction(db, async (transaction) => {
      const productRef = doc(db, `users/${userId}/products`, productId)
      const userAnalyticsRef = doc(db, `analytics/${userId}`)
      const now = Timestamp.now()
      const monthYear = now.toDate().toISOString().slice(0, 7) // Format: YYYY-MM
      const year = now.toDate().getFullYear()

      // Read product and user analytics documents
      const productDoc = await transaction.get(productRef)
      const userAnalyticsDoc = await transaction.get(userAnalyticsRef)

      if (!productDoc.exists()) {
        throw new Error("Product not found")
      }

      const productData = productDoc.data()
      if (productData.quantity < quantity) {
        throw new Error("Not enough stock")
      }

      // Update product
      transaction.update(productRef, {
        quantity: increment(-quantity),
        purchaseCount: increment(1),
        totalSales: increment(quantity),
        totalRevenue: increment(price * quantity),
      })

      // Handle user analytics updates
      if (!userAnalyticsDoc.exists()) {
        transaction.set(userAnalyticsRef, {
          totalProductsBought: quantity,
          totalSales: 1,
          totalRevenue: price * quantity,
          averageOrderValue: price * quantity,
        })
      } else {
        const userAnalytics = userAnalyticsDoc.data()
        const newTotalSales = userAnalytics.totalSales + 1
        const newTotalRevenue = userAnalytics.totalRevenue + price * quantity
        transaction.update(userAnalyticsRef, {
          totalProductsBought: increment(quantity),
          totalSales: increment(1),
          totalRevenue: increment(price * quantity),
          averageOrderValue: newTotalRevenue / newTotalSales,
        })
      }

      // Update monthly analytics
      const monthlyAnalyticsRef = doc(db, `analytics/${userId}/monthly`, monthYear)
      transaction.set(
        monthlyAnalyticsRef,
        {
          sales: increment(quantity),
          revenue: increment(price * quantity),
        },
        { merge: true },
      )

      // Update yearly analytics
      const yearlyAnalyticsRef = doc(db, `analytics/${userId}/yearly`, year.toString())
      transaction.set(
        yearlyAnalyticsRef,
        {
          sales: increment(quantity),
          revenue: increment(price * quantity),
        },
        { merge: true },
      )
    })
  } catch (error) {
    console.error("Error recording purchase:", error)
    throw error
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
  const unsubscribe = onSnapshot(userAnalyticsRef, (userAnalyticsDoc) => {
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
  }, (error) => {
    console.error("Error fetching user analytics:", error);
    callback({
      totalProductsBought: 0,
      totalSales: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
    });
  });

  return unsubscribe;
}

export function getMonthlyAnalytics(userId, limitValue = 12, callback) {
  const monthlyAnalyticsRef = collection(db, `analytics/${userId}/monthly`);
  const unsubscribe = onSnapshot(query(monthlyAnalyticsRef, orderBy("month", "desc"), limit(limitValue)), (querySnapshot) => {
    const monthlyAnalytics = querySnapshot.docs.map((doc) => ({
      month: doc.id,
      ...doc.data(),
    })).reverse();
    callback(monthlyAnalytics);
  }, (error) => {
    console.error("Error fetching monthly analytics:", error);
    callback([]);
  });

  return unsubscribe;
}

export function getYearlyAnalytics(userId, limitValue = 5, callback) {
  const yearlyAnalyticsRef = collection(db, `analytics/${userId}/yearly`);
  const unsubscribe = onSnapshot(query(yearlyAnalyticsRef, orderBy("year", "desc"), limit(limitValue)), (querySnapshot) => {
    const yearlyAnalytics = querySnapshot.docs.map((doc) => ({
      year: Number.parseInt(doc.id),
      ...doc.data(),
    })).reverse();
    callback(yearlyAnalytics);
  }, (error) => {
    console.error("Error fetching yearly analytics:", error);
    callback([]);
  });

  return unsubscribe;
}