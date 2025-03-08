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
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import PostCardSkeleton from "@/components/PostCardSkeleton";

const FeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [authors, setAuthors] = useState({});
  const [hasMore, setHasMore] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const currentUserId = auth.currentUser?.uid;

  // Check for email verification
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

  // Request user location if not already available
  const requestLocationPermission = () => {
    if (navigator.geolocation) {
      setLocationPermission("requesting");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          setLocationPermission("granted");

          // Store user location in Firestore for future use
          if (currentUserId) {
            const userRef = doc(db, "users", currentUserId);
            updateDoc(userRef, {
              location: { latitude, longitude },
              locationUpdatedAt: new Date(),
            }).catch((err) => console.error("Error saving location:", err));
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationPermission("denied");
          toast.error("Location access denied. Some features may be limited.");
        }
      );
    } else {
      setLocationPermission("unavailable");
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  // Load saved location from user profile
  const loadSavedLocation = async () => {
    if (currentUserId) {
      try {
        const userDoc = await getDoc(doc(db, "users", currentUserId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (
            userData.location &&
            userData.location.latitude &&
            userData.location.longitude
          ) {
            setUserLocation(userData.location);
            return true;
          }
        }
        return false;
      } catch (error) {
        console.error("Error loading saved location:", error);
        return false;
      }
    }
    return false;
  };
  const shouldUpdateLocation = (oldLocation, newLocation) => {
    // If no previous location, definitely update
    if (!oldLocation) return true;

    // Calculate distance between old and new locations (using Haversine formula)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const distance = calculateDistance(
      oldLocation.latitude,
      oldLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    // Only update if moved more than 1km
    return distance > 1;
  };

  // Modify the location handling in useEffect
  useEffect(() => {
    if (currentUserId) {
      // First try to load saved location
      loadSavedLocation().then((hasSavedLocation) => {
        if (!hasSavedLocation && locationPermission === null) {
          // If no saved location, request it
          requestLocationPermission();
        } else if (hasSavedLocation) {
          // If we have a saved location, periodically check for updates in background
          const watchId = navigator.geolocation.watchPosition(
            (position) => {
              const newLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };

              // Check if location changed significantly
              if (shouldUpdateLocation(userLocation, newLocation)) {
                setUserLocation(newLocation);

                // Store updated location in Firestore
                if (currentUserId) {
                  const userRef = doc(db, "users", currentUserId);
                  updateDoc(userRef, {
                    location: newLocation,
                    locationUpdatedAt: new Date(),
                  }).catch((err) =>
                    console.error("Error saving location:", err)
                  );
                }
              }
            },
            (error) => console.error("Error watching position:", error),
            {
              enableHighAccuracy: true,
              maximumAge: 10 * 60 * 1000, // 10 minutes
              timeout: 10000, // 10 seconds
            }
          );

          // Clean up watch when component unmounts
          return () => navigator.geolocation.clearWatch(watchId);
        }

        // Fetch recommendations (will use location if available)
        fetchCombinedRecommendations(1);
      });
    } else {
      console.log("No user ID available");
      setLoading(false);
    }
  }, [currentUserId]);
  // Fetch combined recommendations (location + preferences)
  const fetchCombinedRecommendations = async (pageNum) => {
    if (!currentUserId) {
      setError("No user ID found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      setLoading(pageNum === 1); // Only show loading for first page
      setError(null);

      // Add cache-busting parameter to avoid browser caching
      // Use timestamp to ensure fresh data but still allow browser to cache between sessions
      const cacheBuster = Math.floor(Date.now() / (15 * 60 * 1000)); // Changes every 15 min

      const response = await fetch(
        ` https://thikana-recommendation-model.onrender.com/feed/${currentUserId}?limit=10&_t=${cacheBuster}`,
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
      console.log("Received combined recommendations:", data);
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

          // Add indicator for location-based recommendations
          const isLocationBased = post.recommendation_type === "location";
          const distanceText = post.distance_km
            ? `${post.distance_km} km away`
            : null;

          return {
            ...post,
            postId: post.id,
            likes: postData.likes || 0,
            isLiked: likedPosts.has(post.id),
            authorName: postAuthorData.name,
            authorUsername: postAuthorData.username,
            authorProfileImage: postAuthorData.profilePic,
            isLocationBased,
            distanceText,
          };
        })
      );
      const validPosts = postsWithLikes.filter((post) => post !== null);

      console.log("Processed posts:", validPosts);

      setPosts((prev) =>
        pageNum === 1 ? validPosts : [...prev, ...validPosts]
      );
      setHasMore(data.recommendations.length === 10);
    } catch (error) {
      console.error("Error fetching combined recommendations:", error);
      // Fall back to regular recommendations if combined ones fail
      fetchRecommendations(pageNum);
    } finally {
      setLoading(false);
    }
  };

  // Original recommendation function (fallback)
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

  // const handlePostLike = async (post) => {
  //   if (!currentUserId || !post?.postId) return;

  //   try {
  //     const likeRef = doc(db, "users", currentUserId, "likes", post.postId);
  //     const postRef = doc(db, "posts", post.postId);
  //     const userRef = doc(db, "users", currentUserId);

  //     const postDoc = await getDoc(postRef);

  //     if (!postDoc.exists()) {
  //       console.error("Post not found");
  //       return;
  //     }

  //     const postData = postDoc.data();
  //     const businessType = postData.businessType;

  //     if (post.isLiked) {
  //       // Unlike the post
  //       await deleteDoc(likeRef);
  //       await updateDoc(postRef, { likes: increment(-1) });
  //     } else {
  //       // Like the post
  //       await setDoc(likeRef, {
  //         timestamp: new Date(),
  //         businessType: businessType, // Store business type in like document
  //       });
  //       await updateDoc(postRef, { likes: increment(1) });

  //       // Update user's business preferences
  //       if (businessType) {
  //         await updateDoc(userRef, {
  //           businessPreferences: arrayUnion(businessType),
  //         });
  //       }
  //     }

  //     // Update posts state
  //     setPosts((prevPosts) =>
  //       prevPosts.map((p) =>
  //         p.postId === post.postId
  //           ? {
  //               ...p,
  //               isLiked: !p.isLiked,
  //               likes: p.likes + (p.isLiked ? -1 : 1),
  //             }
  //           : p
  //       )
  //     );

  //     // Refresh recommendations after like/unlike
  //     await fetchCombinedRecommendations(1);

  //     await updateRecentInteractions(post.postId, "Like");
  //   } catch (error) {
  //     console.error("Error handling like:", error);
  //   }
  // };

  const handlePostLike = async (post) => {
    if (!currentUserId || !post?.postId) return;

    try {
      // Find the current post in state to get its accurate isLiked status
      const currentPosts = [...posts];
      const postIndex = currentPosts.findIndex((p) => p.postId === post.postId);

      if (postIndex === -1) {
        console.error("Post not found in current state");
        return;
      }

      const currentPost = currentPosts[postIndex];
      const currentlyLiked = currentPost.isLiked;

      // Optimistic UI update
      currentPosts[postIndex] = {
        ...currentPost,
        isLiked: !currentlyLiked,
        likes: currentPost.likes + (currentlyLiked ? -1 : 1),
      };

      // Update state immediately for responsive UI
      setPosts(currentPosts);

      // References for Firebase operations
      const likeRef = doc(db, "users", currentUserId, "likes", post.postId);
      const postRef = doc(db, "posts", post.postId);
      const userRef = doc(db, "users", currentUserId);

      // Get post data for business type
      const postDoc = await getDoc(postRef);
      if (!postDoc.exists()) {
        console.error("Post not found in Firestore");
        // Revert optimistic update if post doesn't exist
        setPosts(posts);
        return;
      }

      const postData = postDoc.data();
      const businessType = postData.businessType;

      // Perform the actual database operations
      if (currentlyLiked) {
        // Unlike the post
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likes: increment(-1) });
      } else {
        // Like the post
        await setDoc(likeRef, {
          timestamp: new Date(),
          businessType: businessType,
        });
        await updateDoc(postRef, { likes: increment(1) });

        // Update user's business preferences
        if (businessType) {
          await updateDoc(userRef, {
            businessPreferences: arrayUnion(businessType),
          });
        }
      }
      await fetchCombinedRecommendations(1);

      // Update recent interactions
      await updateRecentInteractions(post.postId, "Like");

      // No need to refresh recommendations after every like/unlike
      // This may be causing part of the lagginess
      // Consider commenting this out or implementing a debounced refresh
      // await fetchCombinedRecommendations(1);
    } catch (error) {
      console.error("Error handling like:", error);
      // If an error occurs, revert to the original state
      const originalPosts = [...posts];
      setPosts(originalPosts);
    }
  };
  useEffect(() => {
    if (currentUserId) {
      // First try to load saved location
      loadSavedLocation().then((hasSavedLocation) => {
        if (!hasSavedLocation && locationPermission === null) {
          // If no saved location, request it
          requestLocationPermission();
        }

        // Fetch recommendations (will use location if available)
        fetchCombinedRecommendations(1);
      });
    } else {
      console.log("No user ID available");
      setLoading(false);
    }
  }, [currentUserId]);

  // Re-fetch when user location changes
  useEffect(() => {
    if (userLocation && currentUserId) {
      console.log("Location updated, refreshing recommendations");
      fetchCombinedRecommendations(1);
    }
  }, [userLocation]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchCombinedRecommendations(nextPage);
    }
  };

  // UI for requesting location permission
  const renderLocationPrompt = () => {
    if (locationPermission === null || locationPermission === "requesting") {
      return null; // Already handled or in progress
    } else if (locationPermission === "denied") {
      return (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Enable location access to see posts from nearby businesses.
          </p>
          <Button
            onClick={requestLocationPermission}
            className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm py-1"
          >
            Enable Location
          </Button>
        </div>
      );
    }
    return null;
  };

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center w-full">
        <div className="max-w-7xl w-full">
          <div className="container grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6 py-8">
            <aside className="hidden md:block">
              <Sidebar />
            </aside>
            <main className="space-y-6">
              {/* Render multiple skeleton cards */}
              {Array(5)
                .fill(0)
                .map((_, index) => (
                  <PostCardSkeleton key={index} />
                ))}
            </main>
            <aside className="hidden lg:block">
              <WhoToFollow />
            </aside>
          </div>
        </div>
        <aside>
          <div className="fixed bottom-4 right-4">
            <Chatbot />
          </div>
        </aside>
      </div>
    );
  }

  if (!loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center w-full">
        <div className="max-w-7xl w-full">
          <div className="container grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6 py-8">
            <aside className="hidden md:block">
              <Sidebar />
            </aside>
            <main className="flex justify-center items-center min-h-[50vh]">
              <p className="text-gray-500">No posts found.</p>
            </main>
            <aside className="hidden lg:block">
              <WhoToFollow />
            </aside>
          </div>
        </div>
        <aside>
          <div className="fixed bottom-4 right-4">
            <Chatbot />
          </div>
        </aside>
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
            {renderLocationPrompt()}

            {userLocation && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center">
                <div className="text-blue-500 mr-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <p className="text-sm text-blue-600">
                  Showing posts from businesses near you
                </p>
              </div>
            )}

            {posts.map((post) => (
              <PostCard
                key={post.postId}
                post={post}
                onLike={() => handlePostLike(post)}
                onView={() => handlePostView(post.postId)}
                showDistance={post.isLocationBased}
                distanceText={post.distanceText}
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
