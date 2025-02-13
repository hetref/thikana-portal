"use client";
import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
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
  deleteDoc,
  increment,
  setDoc,
} from "firebase/firestore";
import Chatbot from "@/components/Chatbot";
import PostCard from "@/components/PostCard";
import Image from "next/image";

const FeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [authors, setAuthors] = useState({});
  const [hasMore, setHasMore] = useState(true);
  const currentUserId = auth.currentUser?.uid;

  const fetchRecommendations = async (pageNum) => {
    if (!currentUserId) {
      setError("No user ID found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `https://thikana-recommendation-model.onrender.com/recommendations/${currentUserId}?limit=10`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Received recommendations:", data);

      if (!data.recommendations || !Array.isArray(data.recommendations)) {
        throw new Error("Invalid recommendations format received");
      }

      // Fetch like status for each post
      const likedPosts = new Set();
      const likesSnapshot = await getDocs(
        collection(db, "users", currentUserId, "likes")
      );
      likesSnapshot.forEach((doc) => likedPosts.add(doc.id));

      // Fetch current likes count for each post
      const postsWithLikes = await Promise.all(
        data.recommendations.map(async (post) => {
          if (!post.id) {
            console.warn("Post missing ID:", post);
            return null;
          }

          const postRef = doc(db, "posts", post.id);
          const postDoc = await getDoc(postRef);

          if (!postDoc.exists()) {
            console.warn(`Post ${post.id} not found in Firestore`);
            return null;
          }

          const postData = postDoc.data();
          const postAuthor = await getDoc(doc(db, "users", postData.uid));
          const postAuthorData = postAuthor.data();
          console.log("postAuthorData", postAuthorData);
          return {
            ...post,
            postId: post.id,
            likes: postData.likes || 0,
            isLiked: likedPosts.has(post.id),
            authorName: postAuthorData.name,
            authorUsername: postAuthorData.username,
            authorProfileImage: postAuthorData.profilePic,
          };
        })
      );

      // Filter out null posts
      const validPosts = postsWithLikes.filter((post) => post !== null);

      console.log("Processed posts:", validPosts);

      setPosts((prev) =>
        pageNum === 1 ? validPosts : [...prev, ...validPosts]
      );
      setHasMore(validPosts.length === 10);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      setError(`Failed to load posts: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (currentUserId) {
      fetchRecommendations(1);
    } else {
      console.log("No user ID available");
      setLoading(true); //
    }
  }, [currentUserId]);

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchRecommendations(nextPage);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading posts...</p>
      </div>
    );
  }

  if (!loading && posts.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>No posts found.</p>
      </div>
    );
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
