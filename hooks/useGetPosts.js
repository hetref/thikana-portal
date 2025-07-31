import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const POSTS_LIMIT = 10; // Number of posts to load per request

export const useGetUserPosts = (userId) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastVisible, setLastVisible] = useState(null); // For pagination
  const [hasMore, setHasMore] = useState(true); // To track if more posts exist

  // Fixed: Fetch initial posts with correct field names from Firestore
  const fetchInitialPosts = useCallback(() => {
    if (!userId) {
      setPosts([]);
      setLoading(false);
      setError(null);
      setHasMore(false);
      return;
    }
    
    console.log("Fetching initial posts for userId:", userId);
    setLoading(true);
    setError(null);

    // Fixed: Use correct field names - 'uid' and 'createdAt' as per Firestore schema
    const q = query(
      collection(db, "posts"),
      where("uid", "==", userId), // Fixed: Use 'uid' as per Firestore document
      orderBy("createdAt", "desc"), // Fixed: Use 'createdAt' as per Firestore document
      limit(POSTS_LIMIT)
    );

    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        try {
          if (!querySnapshot.empty) {
            const newPosts = querySnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setPosts(newPosts);
            console.log("Posts loaded:", newPosts.length);
            setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
            setHasMore(querySnapshot.docs.length === POSTS_LIMIT);
          } else {
            setPosts([]);
            setLastVisible(null);
            setHasMore(false);
          }
          setError(null);
        } catch (err) {
          console.error("Error processing posts snapshot:", err);
          setError(err);
          setPosts([]);
          setHasMore(false);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error fetching posts:", err);
        setError(err);
        setPosts([]);
        setHasMore(false);
        setLoading(false);
      }
    );

    // Cleanup function to unsubscribe from the listener
    return () => unsubscribe();
  }, [userId]);

  // Fixed: Fetch more posts for pagination with correct field names
  const fetchMorePosts = useCallback(async () => {
    if (!userId || !lastVisible || !hasMore || loading) {
      console.log("Fetch more posts skipped:", { userId, lastVisible, hasMore, loading });
      return;
    }
    
    console.log("Fetching more posts...");
    setLoading(true);
    setError(null);

    try {
      // Fixed: Use correct field names - 'uid' and 'createdAt' as per Firestore schema
      const q = query(
        collection(db, "posts"),
        where("uid", "==", userId), // Fixed: Use 'uid' as per Firestore document
        orderBy("createdAt", "desc"), // Fixed: Use 'createdAt' as per Firestore document
        startAfter(lastVisible),
        limit(POSTS_LIMIT)
      );
      
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const newPosts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        // Fixed: Prevent duplicate posts
        setPosts((prevPosts) => {
          const existingIds = new Set(prevPosts.map(post => post.id));
          const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.id));
          return [...prevPosts, ...uniqueNewPosts];
        });
        
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === POSTS_LIMIT);
        console.log("More posts loaded:", newPosts.length);
      } else {
        setHasMore(false);
        console.log("No more posts available");
      }
    } catch (err) {
      console.error("Error fetching more posts:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId, lastVisible, hasMore, loading]);

  // Fixed: Reset state when userId changes and fetch initial posts
  useEffect(() => {
    console.log("userId changed:", userId);
    
    // Reset state
    setPosts([]);
    setLastVisible(null);
    setHasMore(true);
    setError(null);
    
    // Fetch initial posts
    const cleanup = fetchInitialPosts();
    
    return cleanup;
  }, [fetchInitialPosts, userId]);

  return { 
    posts, 
    loading, 
    fetchMorePosts, 
    hasMore, 
    error,
    // Fixed: Add additional utility functions
    refetch: fetchInitialPosts,
    isEmpty: !loading && posts.length === 0 && !error
  };
};
