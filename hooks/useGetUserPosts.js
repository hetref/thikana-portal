import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const useGetUserPosts = (userId, initialLimit = 5) => {
  const [posts, setPosts] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [postLimit, setPostLimit] = useState(initialLimit);
  const [businessId, setBusinessId] = useState(null);

  useEffect(() => {
    // Reset state when userId changes
    setPosts([]);
    setLastVisible(null);
    setHasMore(true);
    setLoading(true);
    setError(null);
    setBusinessId(null);

    if (!userId) {
      setLoading(false);
      return;
    }

    // First check if the user is a member with a businessId
    const checkIfMember = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === "member" && userData.businessId) {
            setBusinessId(userData.businessId);
            return userData.businessId;
          }
        }
        return null;
      } catch (err) {
        console.error("Error checking if user is a member:", err);
        return null;
      }
    };

    const fetchPosts = async () => {
      try {
        // Check if user is a member
        const businessId = await checkIfMember();

        // Use businessId if user is a member, otherwise use userId
        const targetUserId = businessId || userId;

        // Fixed: Use correct field names - 'uid' and 'createdAt' as per Firestore schema
        const postsRef = collection(db, "posts");
        const firstQuery = query(
          postsRef,
          where("uid", "==", targetUserId), // Fixed: Use 'uid' instead of 'authorId'
          orderBy("createdAt", "desc"), // Fixed: Use 'createdAt' instead of 'timestamp'
          limit(postLimit)
        );

        const querySnapshot = await getDocs(firstQuery);

        if (querySnapshot.empty) {
          setPosts([]);
          setHasMore(false);
          setLoading(false);
          return;
        }

        // Fixed: No need for filtering since we're using where clause
        const userPosts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPosts(userPosts);
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(userPosts.length >= postLimit);
      } catch (err) {
        console.error("Error fetching posts:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [userId, postLimit]);

  const fetchMorePosts = async () => {
    if (!lastVisible || !hasMore || loading) return;

    setLoading(true);

    try {
      const targetUserId = businessId || userId;
      
      // Fixed: Use correct field names - 'uid' and 'createdAt' as per Firestore schema
      const postsRef = collection(db, "posts");
      const nextQuery = query(
        postsRef,
        where("uid", "==", targetUserId), // Fixed: Use 'uid' instead of 'authorId'
        orderBy("createdAt", "desc"), // Fixed: Use 'createdAt' instead of 'timestamp'
        startAfter(lastVisible),
        limit(postLimit)
      );

      const querySnapshot = await getDocs(nextQuery);

      if (querySnapshot.empty) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      // Fixed: No need for filtering since we're using where clause
      const userPosts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fixed: Prevent duplicate posts
      setPosts((prevPosts) => {
        const existingIds = new Set(prevPosts.map(post => post.id));
        const uniqueNewPosts = userPosts.filter(post => !existingIds.has(post.id));
        return [...prevPosts, ...uniqueNewPosts];
      });
      
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(userPosts.length >= postLimit);
    } catch (err) {
      console.error("Error fetching more posts:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { posts, loading, fetchMorePosts, hasMore, error };
};
