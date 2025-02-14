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
import { userEmailStatus } from "@/utils/userStatus";
import { sendEmailVerification } from "firebase/auth";
import { Button } from "@/components/ui/button";

const FeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [authors, setAuthors] = useState({});
  const [hasMore, setHasMore] = useState(true);
  const currentUserId = auth.currentUser?.uid;

  if (userEmailStatus() === false) {
    const verifyEmailHandler = async () => {
      await sendEmailVerification(auth.currentUser)
        .then(() => {
          toast.success("Verification email sent!");
        })
        .catch((error) => {
          toast.error("Error sending verification email: " + error.code);
        });
    };
    return (
      <div className="flex flex-col gap-4 justify-center items-center min-h-[500px]">
        <p>Please verify your email to continue</p>
        <Button onClick={verifyEmailHandler} className="bg-emerald-800 mt-1">
          Verify Email
        </Button>
      </div>
    );
  }

  const fetchRecommendations = async (pageNum) => {
    if (!currentUserId) {
      setError("No user ID found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("Fetching recommendations for user:", currentUserId);

      const response = await fetch(
        `https://thikana-recommendation-model.onrender.com/recommendations/${currentUserId}?limit=10`,
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
      const validPosts = postsWithLikes.filter((post) => post !== null);

      console.log("Processed posts:", validPosts);

      setPosts((prev) =>
        pageNum === 1 ? postsWithLikes : [...prev, ...postsWithLikes]
      );
      setHasMore(data.recommendations.length === 10);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateRecentInteractions = async (postId, interactionType) => {
    if (!currentUserId) return;

    try {
      const userRef = doc(db, "users", currentUserId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.error("User document not found");
        return;
      }

      const userData = userDoc.data();
      const arrayName = `last${interactionType}edPosts`;
      let currentInteractions = userData?.recentInteractions?.[arrayName] || [];
      currentInteractions = [postId, ...currentInteractions.slice(0, 4)];

      await updateDoc(userRef, {
        [`recentInteractions.${arrayName}`]: currentInteractions,
      });

      if (interactionType === "Like") {
        const postDoc = await getDoc(doc(db, "posts", postId));
        if (postDoc.exists()) {
          const businessType = postDoc.data()?.businessType;
          if (businessType) {
            console.log("Updating business preferences:", businessType);
            await updateDoc(userRef, {
              businessPreferences: arrayUnion(businessType),
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error updating interactions: ${error}`);
    }
  };

  const handlePostView = async (postId) => {
    if (!currentUserId || !postId) return;

    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        "interactions.viewCount": increment(1),
      });
      await updateRecentInteractions(postId, "View");
    } catch (error) {
      console.error(`Error handling post view: ${error}`);
    }
  };

  const handlePostLike = async (post) => {
    if (!currentUserId || !post?.postId) return;

    try {
      const likeRef = doc(db, "users", currentUserId, "likes", post.postId);
      const postRef = doc(db, "posts", post.postId);
      const userRef = doc(db, "users", currentUserId);

      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        console.error("Post not found");
        return;
      }

      const postData = postDoc.data();
      const businessType = postData.businessType;

      if (post.isLiked) {
        // Unlike the post
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likes: increment(-1) });
      } else {
        // Like the post
        await setDoc(likeRef, {
          timestamp: new Date(),
          businessType: businessType, // Store business type in like document
        });
        await updateDoc(postRef, { likes: increment(1) });

        // Update user's business preferences
        if (businessType) {
          await updateDoc(userRef, {
            businessPreferences: arrayUnion(businessType),
          });
        }
      }

      // Update posts state
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.postId === post.postId
            ? {
                ...p,
                isLiked: !p.isLiked,
                likes: p.likes + (p.isLiked ? -1 : 1),
              }
            : p
        )
      );

      // Fetch new recommendations after like/unlike
      await fetchRecommendations(1);

      await updateRecentInteractions(post.postId, "Like");
    } catch (error) {
      console.error("Error handling like:", error);
    }
  };
  useEffect(() => {
    if (currentUserId) {
      fetchRecommendations(1);
    } else {
      console.log("No user ID available");
      setLoading(false);
      // setError("Please log in to view posts");
    }
  }, [currentUserId]);

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
