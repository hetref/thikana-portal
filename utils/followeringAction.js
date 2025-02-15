import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

const getFollowers = async (userId) => {
  try {
    const followersRef = collection(db, "users", userId, "followers");
    const followersSnapshot = await getDocs(followersRef);
    const followersData = followersSnapshot.docs.map((doc) => doc.data());

    const followingRef = collection(db, "users", userId, "following");
    const followingSnapshot = await getDocs(followingRef);
    const followingData = followingSnapshot.docs.map((doc) => doc.data());

    const followingIds = new Set(followingData.map((doc) => doc.uid));

    // Batch the requests for user data of each follower
    const promises = followersData.map(async (follower) => {
      const uid = follower.uid;
      const userRef = doc(db, "users", uid);
      const userSnapshot = await getDoc(userRef);
      return {
        ...userSnapshot.data(),
        isFollowing: followingIds.has(uid),
      };
    });

    const res = await Promise.all(promises);
    console.log("Follower RES", res)
    return res;
  } catch (error) {
    console.error("Error fetching followers:", error);
    throw error;
  }
};

const getFollowing = async (userId) => {
  try {
    const followingRef = collection(db, "users", userId, "following");
    const snapshot = await getDocs(followingRef);
    const data = snapshot.docs.map((doc) => doc.data());

    // Batch the requests for user data
    const promises = data.map(async (resData) => {
      const uid = resData.uid;
      const userRef = doc(db, "users", uid);
      const userSnapshot = await getDoc(userRef);
      return userSnapshot.data();
    });

    const res = await Promise.all(promises);
    console.log("RES", res);
    return res;
  } catch (error) {
    console.error("Error fetching following:", error);
    throw error;
  }
};

export { getFollowers, getFollowing };