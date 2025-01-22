"use client";
import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
// import PostCard from "@/components/PostCard";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import Chatbot from "@/components/Chatbot";
import PostCard from "@/components/PostCard";

// In your FeedPage component, add this function:

// Replace your existing useEffect with:

const FeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [author, setAuthor] = useState(null);
  const currentUserId = auth.currentUser?.uid;
  const [hasMore, setHasMore] = useState(true);
  // Function to update user's recent interactions
  const fetchRecommendations = async (pageNum) => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/recommendations/${currentUserId}?page=${pageNum}&limit=10`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform recommendations into the format expected by your PostCard component
      const recommendedPosts = await Promise.all(
        data.recommendations.map(async (post) => {
          // Fetch author details
          const authorRef = doc(db, "users", post.uid);
          const authorDoc = await getDoc(authorRef);
          const authorData = authorDoc.data();

          // Check if post is liked
          const likeDocRef = doc(db, "users", currentUserId, "likes", post.id);
          const likeDoc = await getDoc(likeDocRef);

          return {
            postId: post.id,
            ...post,
            author: authorData,
            isLiked: likeDoc.exists(),
          };
        })
      );

      setPosts((prev) =>
        pageNum === 1 ? recommendedPosts : [...prev, ...recommendedPosts]
      );
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchRecommendations(1);
    }
  }, [currentUserId]);

  const updateRecentInteractions = async (postId, interactionType) => {
    if (!currentUserId) return;

    const userRef = doc(db, "users", currentUserId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    // Get current interactions array
    const arrayName = `last${interactionType}edPosts`;
    let currentInteractions = userData?.recentInteractions?.[arrayName] || [];

    // Add new interaction and keep only last 5
    currentInteractions = [postId, ...currentInteractions.slice(0, 4)];

    // Update the user document
    await updateDoc(userRef, {
      [`recentInteractions.${arrayName}`]: currentInteractions,
    });

    // If it's a like interaction, update business preferences
    if (interactionType === "Like") {
      const postDoc = await getDoc(doc(db, "posts", postId));
      const businessType = postDoc.data()?.businessType;
      if (businessType) {
        await updateDoc(userRef, {
          businessPreferences: arrayUnion(businessType),
        });
      }
    }
  };

  // Function to handle post view
  const handlePostView = async (postId) => {
    if (!currentUserId) return;

    // Update post view count
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      "interactions.viewCount": increment(1),
    });

    // Update user's recent views
    await updateRecentInteractions(postId, "View");
  };

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        // Fetch posts from Firestore
        const postsRef = collection(db, "posts");
        const postsQuery = query(postsRef, where("uid", "!=", currentUserId));
        const querySnapshot = await getDocs(postsQuery);

        const postsData = await Promise.all(
          querySnapshot.docs.map(async (docu) => {
            const postData = docu.data();
            const postId = docu.id;

            // Fetch author details
            const authorRef = doc(db, "users", postData.uid);
            const authorDoc = await getDoc(authorRef);
            const authorData = authorDoc.data();

            // Check if post is liked
            const likeDocRef = doc(db, "users", currentUserId, "likes", postId);
            const likeDoc = await getDoc(likeDocRef);

            // Track view for each post
            await handlePostView(postId);

            // Return formatted post data
            return {
              postId,
              ...postData,
              author: authorData,
              isLiked: likeDoc.exists(),
            };
          })
        );

        // Update state with fetched posts
        setPosts((prev) => (page === 1 ? postsData : [...prev, ...postsData]));
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId) {
      fetchPosts();
    }
  }, [currentUserId, page]);

  const handlePostLike = async (post) => {
    if (!currentUserId) return;

    const likeRef = doc(db, "users", currentUserId, "likes", post.postId);
    const postRef = doc(db, "posts", post.postId);

    if (post.isLiked) {
      // Unlike
      await updateDoc(postRef, { likes: increment(-1) });
      await updateDoc(doc(db, "users", currentUserId), {
        [`recentInteractions.lastLikedPosts`]: arrayRemove(post.postId),
      });
    } else {
      // Like
      await updateDoc(postRef, { likes: increment(1) });
      await updateRecentInteractions(post.postId, "Like");
    }

    // Update posts state
    setPosts((prevPosts) =>
      prevPosts.map((p) =>
        p.postId === post.postId ? { ...p, isLiked: !p.isLiked } : p
      )
    );
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchRecommendations(nextPage);
    }
  };

  if (loading && posts.length === 0) {
    return <p>Loading posts...</p>;
  }

  if (posts.length === 0) {
    return <p>No posts found.</p>;
  }

  return (
    <div className="flex items-center justify-center w-full">
      <div className="max-w-7xl w-full">
        <div className="container grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6 py-8">
          <aside className="hidden md:block">
            <Sidebar />
          </aside>
          <main className="space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.postId}
                post={post}
                author={post.author}
                onLike={() => handlePostLike(post)}
                onView={() => handlePostView(post.postId)}
              />
            ))}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-2 mt-4 text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            )}
          </main>
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <WhoToFollow />
            </div>
          </aside>
          <aside>
            <div className="fixed bottom-4 right-4">
              <Chatbot />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
