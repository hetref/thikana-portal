import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const POSTS_LIMIT = 10; // Number of posts to load per request

export const useGetUserPosts = (userId) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastVisible, setLastVisible] = useState(null); // For pagination
  const [hasMore, setHasMore] = useState(true); // To track if more posts exist

  // Fetch initial posts
  const fetchInitialPosts = useCallback(() => {
    if (!userId) return;
    console.log("Fetching initial posts...");

    setLoading(true);
    const q = query(
      collection(db, "posts"),
      where("uid", "==", userId),
      limit(POSTS_LIMIT)
    );

    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const newPosts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosts(newPosts);
        console.log("posts" + newPosts); // Updated to log newPosts
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === POSTS_LIMIT); // Check if more posts exist
      } else {
        setHasMore(false); // No more posts
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching posts:", err);
      setError(err);
      setLoading(false);
    });

    // Cleanup function to unsubscribe from the listener
    return () => unsubscribe();
  }, [userId]);

  // Fetch more posts for pagination
  const fetchMorePosts = useCallback(async () => {
    if (!userId || !lastVisible || !hasMore) return;
    console.log("Fetching more posts...");

    setLoading(true);
    try {
      const q = query(
        collection(db, "posts"),
        where("uid", "==", userId),
        startAfter(lastVisible),
        limit(POSTS_LIMIT)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const newPosts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosts((prevPosts) => [...prevPosts, ...newPosts]);
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === POSTS_LIMIT); // Check if more posts exist
      } else {
        setHasMore(false); // No more posts
      }
    } catch (err) {
      console.error("Error fetching more posts:", err);
      setError(err);
    }
    setLoading(false);
  }, [userId, lastVisible, hasMore]);

  // Automatically fetch initial posts when userId changes
  useEffect(() => {
    console.log("userId changed:", userId);
    fetchInitialPosts();
  }, [fetchInitialPosts]);

  return { posts, loading, fetchMorePosts, hasMore, error };
};
