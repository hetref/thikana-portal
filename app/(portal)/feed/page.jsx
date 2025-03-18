"use client";
import React, { useEffect, useState, useRef } from "react";
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
  writeBatch,
} from "firebase/firestore";
import Chatbot from "@/components/Chatbot";
import PostCard from "@/components/PostCard";
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
  const [hasMore, setHasMore] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const refreshTimeout = useRef(null);
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

  // Calculate distance between two points
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

  // Check if location needs updating
  const shouldUpdateLocation = (oldLocation, newLocation) => {
    if (!oldLocation) return true;
    const distance = calculateDistance(
      oldLocation.latitude,
      oldLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );
    return distance > 1; // Update if moved more than 1km
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
            setUserLocation({
              ...userData.location,
              lastUpdated: userData.locationUpdatedAt?.toMillis() || 0,
            });
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

  // Request user location
  const requestLocationPermission = () => {
    if (navigator.geolocation) {
      setLocationPermission("requesting");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = {
            latitude,
            longitude,
            lastUpdated: Date.now(),
          };

          if (shouldUpdateLocation(userLocation, newLocation)) {
            setUserLocation(newLocation);

            if (currentUserId) {
              const userRef = doc(db, "users", currentUserId);
              updateDoc(userRef, {
                location: { latitude, longitude },
                locationUpdatedAt: new Date(),
              }).catch((err) => console.error("Error saving location:", err));
            }
          }
          setLocationPermission("granted");
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationPermission("denied");
          toast.error("Location access denied. Some features may be limited.");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5 * 60 * 1000, // 5 minutes
        }
      );
    } else {
      setLocationPermission("unavailable");
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  // Fetch recommendations from API
  const fetchRecommendations = async (pageNum) => {
    if (!currentUserId) {
      setError("No user ID found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      setLoading(pageNum === 1);
      setError(null);

      const cacheBuster = Math.floor(Date.now() / (15 * 60 * 1000));
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/feed/${currentUserId}?limit=10&_t=${cacheBuster}`,
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
      if (!data.recommendations || !Array.isArray(data.recommendations)) {
        throw new Error("Invalid recommendations format received");
      }

      // Batch fetch likes and post data
      const postIds = data.recommendations.map((post) => post.id);
      const [likesSnapshot, postsSnapshot] = await Promise.all([
        getDocs(collection(db, "users", currentUserId, "likes")),
        getDocs(
          query(collection(db, "posts"), where("__name__", "in", postIds))
        ),
      ]);

      const likedPosts = new Set(likesSnapshot.docs.map((doc) => doc.id));
      const postsMap = new Map(
        postsSnapshot.docs.map((doc) => [doc.id, doc.data()])
      );
      const authorsMap = new Map();

      const processedPosts = await Promise.all(
        data.recommendations.map(async (post) => {
          if (!post.id) return null;

          const postData = postsMap.get(post.id);
          if (!postData) return null;

          let authorData = authorsMap.get(postData.uid);
          if (!authorData) {
            const authorDoc = await getDoc(doc(db, "users", postData.uid));
            authorData = authorDoc.data();
            authorsMap.set(postData.uid, authorData);
          }

          const isLocationBased = post.recommendation_type === "location";
          const distanceText = post.distance_km
            ? `${post.distance_km} km away${
                post.business_plan
                  ? ` (${
                      post.business_plan.charAt(0).toUpperCase() +
                      post.business_plan.slice(1)
                    } Plan)`
                  : ""
              }`
            : null;

          return {
            ...post,
            postId: post.id,
            likes: postData.likes || 0,
            isLiked: likedPosts.has(post.id),
            authorName: authorData.name,
            authorUsername: authorData.username,
            authorProfileImage: authorData.profilePic,
            isLocationBased,
            distanceText,
          };
        })
      );

      const validPosts = processedPosts.filter((post) => post !== null);
      setPosts((prev) =>
        pageNum === 1 ? validPosts : [...prev, ...validPosts]
      );
      setHasMore(data.recommendations.length === 10);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  // Handle post likes
  const handlePostLike = async (post) => {
    if (!currentUserId || !post?.postId) return;

    try {
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

      const batch = writeBatch(db);
      const likeRef = doc(db, "users", currentUserId, "likes", post.postId);
      const postRef = doc(db, "posts", post.postId);
      const userRef = doc(db, "users", currentUserId);

      if (post.isLiked) {
        batch.delete(likeRef);
        batch.update(postRef, { likes: increment(-1) });
      } else {
        batch.set(likeRef, {
          timestamp: new Date(),
          businessType: post.businessType,
        });
        batch.update(postRef, { likes: increment(1) });
        batch.update(userRef, {
          businessPreferences: arrayUnion(post.businessType),
        });
      }

      await batch.commit();
      await updateRecentInteractions(post.postId, "Like");

      if (refreshTimeout.current) {
        clearTimeout(refreshTimeout.current);
      }
      refreshTimeout.current = setTimeout(() => {
        fetchRecommendations(1);
      }, 2000);
    } catch (error) {
      console.error("Error handling like:", error);
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.postId === post.postId
            ? {
                ...p,
                isLiked: p.isLiked,
                likes: p.likes,
              }
            : p
        )
      );
    }
  };

  // Update recent interactions
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
    } catch (error) {
      console.error(`Error updating interactions: ${error}`);
    }
  };

  // Handle post views
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

  // Load more posts
  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchRecommendations(nextPage);
    }
  };

  // Initial load and location setup
  useEffect(() => {
    if (currentUserId) {
      loadSavedLocation().then((hasSavedLocation) => {
        if (!hasSavedLocation && locationPermission === null) {
          requestLocationPermission();
        } else if (hasSavedLocation) {
          const locationUpdateInterval = 15 * 60 * 1000;
          const lastUpdate = userLocation?.lastUpdated || 0;
          if (Date.now() - lastUpdate > locationUpdateInterval) {
            requestLocationPermission();
          }
        }
        fetchRecommendations(1);
      });
    } else {
      console.log("No user ID available");
      setLoading(false);
    }
  }, [currentUserId]);

  // Refresh recommendations when location changes
  useEffect(() => {
    if (userLocation && currentUserId) {
      fetchRecommendations(1);
    }
  }, [userLocation]);

  // Render location prompt
  const renderLocationPrompt = () => {
    if (locationPermission === "denied") {
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
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
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
                <div className="flex flex-col">
                  <p className="text-sm text-blue-600">
                    Showing posts from businesses near you
                  </p>
                  <div className="mt-2 text-xs text-blue-500">
                    <p>• Free plan businesses within 2km</p>
                    <p>• Standard plan businesses within 4km</p>
                    <p>• Premium plan businesses within 8km</p>
                  </div>
                </div>
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
