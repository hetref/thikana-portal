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
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"

export async function getProducts(userId) {
  const productsCol = collection(db, `users/${userId}/products`)
  const productSnapshot = await getDocs(productsCol)
  return productSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

export async function getProduct(userId, productId) {
  try {
    const productRef = doc(db, `users/${userId}/products`, productId)
    const productSnap = await getDoc(productRef)
    if (productSnap.exists()) {
      return { id: productSnap.id, ...productSnap.data() }
    } else {
      return null
    }
  } catch (error) {
    console.error("Error fetching product:", error)
    throw error
  }
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
      const userAnalyticsRef = doc(db, `businesses/${userId}`)

      // Read product data
      const productDoc = await transaction.get(productRef)
      if (!productDoc.exists()) {
        throw new Error("Product not found")
      }

      const productData = productDoc.data()
      if (productData.quantity < quantity) {
        throw new Error("Not enough stock")
      }

      // Read user analytics data
      const userAnalyticsDoc = await transaction.get(userAnalyticsRef)

      // Perform all updates after reads
      transaction.update(productRef, {
        quantity: increment(-quantity),
        purchaseCount: increment(1),
        totalSales: increment(quantity),
        totalRevenue: increment(price * quantity),
      })

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
    })
  } catch (error) {
    console.error("Error recording purchase:", error)
    throw error
  }
}

export async function getProductAnalytics(userId, productId) {
  const productDoc = await getDoc(doc(db, `users/${userId}/products`, productId))
  if (!productDoc.exists()) {
    throw new Error("Product not found")
  }
  return { id: productDoc.id, ...productDoc.data() }
}

export async function getUserAnalytics(userId) {
  try {
    const userAnalyticsRef = doc(db, `users/${userId}`, "analytics")
    const userAnalyticsDoc = await getDoc(userAnalyticsRef)
    if (userAnalyticsDoc.exists()) {
      return userAnalyticsDoc.data()
    } else {
      return {
        totalProductsBought: 0,
        totalSales: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      }
    }
  } catch (error) {
    console.error("Error fetching user analytics:", error)
    throw error
  }
}