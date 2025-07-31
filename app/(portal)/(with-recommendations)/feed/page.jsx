"use client";
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Sidebar from "@/components/Sidebar";
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
import NearbyBusinessMap from "@/components/NearbyBusinessMap";
import WhoToFollowSkeleton from "@/components/WhoToFollowSkeleton";

// Import new utilities
import { useLocationManager, LOCATION_STATES } from "@/lib/useLocationManager";
import {
  fetchRecommendations as fetchRecommendationsAPI,
  invalidateUserCache,
  invalidateLocationCache,
} from "@/lib/apiCache";

// Constants for better performance and UX
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const REFRESH_DEBOUNCE_DELAY = 5000; // 5 seconds

const FeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Refs for cleanup and debouncing
  const refreshTimeout = useRef(null);
  const autoRefreshInterval = useRef(null);
  const abortController = useRef(null);

  const currentUserId = auth.currentUser?.uid;

  // Use the new location manager hook
  const {
    userLocation,
    locationPermission,
    isLocationReady,
    isRequesting,
    isGranted,
    isDenied,
    isUnavailable,
    requestLocationPermission,
  } = useLocationManager(currentUserId);

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

  // Enhanced fetch with the new caching system
  const fetchRecommendations = useCallback(
    async (pageNum = 1, forceRefresh = false) => {
      if (!currentUserId) {
        setError("No user ID found. Please log in.");
        setLoading(false);
        return;
      }

      try {
        setLoading(pageNum === 1);
        setError(null);

        // Cancel previous request
        if (abortController.current) {
          abortController.current.abort();
        }
        abortController.current = new AbortController();

        // Prepare API options
        const apiOptions = {
          limit: 10,
          forceRefresh,
          signal: abortController.current.signal,
        };

        // Add location if available
        if (userLocation?.latitude && userLocation?.longitude) {
          apiOptions.latitude = userLocation.latitude;
          apiOptions.longitude = userLocation.longitude;
        }

        // Use the new cached API function
        const data = await fetchRecommendationsAPI(currentUserId, apiOptions);

        if (!data.recommendations || !Array.isArray(data.recommendations)) {
          throw new Error("Invalid recommendations format received");
        }

        // Batch fetch likes data only once per session
        const likesSnapshot = await getDocs(
          collection(db, "users", currentUserId, "likes")
        );
        const likedPosts = new Set(likesSnapshot.docs.map((doc) => doc.id));

        // Process recommendations
        const processedPosts = data.recommendations
          .map((post) => {
            if (!post.id) return null;

            const authorData = post.author || {};
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
              likes: post.likes || 0,
              isLiked: likedPosts.has(post.id),
              authorName: authorData.businessName || post.businessName || "",
              authorUsername: authorData.username || post.username || "",
              authorProfileImage:
                authorData.profilePic || post.profilePic || "",
              isLocationBased,
              distanceText,
            };
          })
          .filter((post) => post !== null);

        if (pageNum === 1) {
          setPosts(processedPosts);
        } else {
          setPosts((prev) => [...prev, ...processedPosts]);
        }

        setHasMore(data.recommendations.length === 10);
      } catch (error) {
        if (error.name === "AbortError") {
          return; // Request was cancelled, don't show error
        }

        console.error("Error fetching recommendations:", error);
        setError("Failed to load recommendations. Please try again.");

        // Only show toast for critical errors
        if (!posts.length) {
          toast.error("Failed to load recommendations");
        }
      } finally {
        setLoading(false);
      }
    },
    [currentUserId, userLocation, posts.length]
  );

  // Optimized post like handler
  const handlePostLike = useCallback(
    async (post) => {
      if (!currentUserId || !post?.postId) return;

      try {
        // Optimistic update
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

        // Batch Firestore operations
        const batch = writeBatch(db);
        const likeRef = doc(db, "users", currentUserId, "likes", post.postId);
        const postRef = doc(db, "posts", post.postId);

        if (!post.isLiked) {
          batch.set(likeRef, {
            timestamp: new Date(),
            businessType: post.businessType,
          });
          batch.update(postRef, { likes: increment(1) });

          if (post.businessType) {
            const userRef = doc(db, "users", currentUserId);
            batch.update(userRef, {
              businessPreferences: arrayUnion(post.businessType),
            });
          }
        } else {
          batch.delete(likeRef);
          batch.update(postRef, { likes: increment(-1) });
        }

        await batch.commit();

        // Update recent interactions for new likes only
        if (!post.isLiked) {
          await updateRecentInteractions(post.postId, "Like");
        }

        // Invalidate user cache since preferences may have changed
        invalidateUserCache(currentUserId);

        // Debounced refresh
        if (refreshTimeout.current) {
          clearTimeout(refreshTimeout.current);
        }
        refreshTimeout.current = setTimeout(() => {
          fetchRecommendations(1, true);
        }, REFRESH_DEBOUNCE_DELAY);
      } catch (error) {
        console.error("Error handling like:", error);

        // Revert optimistic update on error
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.postId === post.postId
              ? {
                  ...p,
                  isLiked: post.isLiked,
                  likes: post.likes,
                }
              : p
          )
        );
        toast.error("Failed to update like status");
      }
    },
    [currentUserId, fetchRecommendations]
  );

  // Update recent interactions
  const updateRecentInteractions = useCallback(
    async (postId, interactionType) => {
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
        let currentInteractions =
          userData?.recentInteractions?.[arrayName] || [];
        currentInteractions = [postId, ...currentInteractions.slice(0, 4)];

        await updateDoc(userRef, {
          [`recentInteractions.${arrayName}`]: currentInteractions,
        });
      } catch (error) {
        console.error(`Error updating interactions: ${error}`);
      }
    },
    [currentUserId]
  );

  // Handle post views
  const handlePostView = useCallback(
    async (postId) => {
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
    },
    [currentUserId, updateRecentInteractions]
  );

  // Load more posts
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchRecommendations(nextPage);
    }
  }, [loading, hasMore, page, fetchRecommendations]);

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    fetchRecommendations(1, true);
  }, [fetchRecommendations]);

  // Auto-refresh with longer intervals
  useEffect(() => {
    if (autoRefreshEnabled && currentUserId) {
      const refreshFeed = () => {
        console.log("Auto-refreshing feed...");
        fetchRecommendations(1, true);
      };

      autoRefreshInterval.current = setInterval(
        refreshFeed,
        AUTO_REFRESH_INTERVAL
      );

      return () => {
        if (autoRefreshInterval.current) {
          clearInterval(autoRefreshInterval.current);
        }
      };
    }
  }, [autoRefreshEnabled, currentUserId, fetchRecommendations]);

  // Initial load
  useEffect(() => {
    if (currentUserId) {
      fetchRecommendations(1);
    } else {
      console.log("No user ID available");
      setLoading(false);
    }

    // Cleanup function
    return () => {
      if (refreshTimeout.current) {
        clearTimeout(refreshTimeout.current);
      }
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [currentUserId, fetchRecommendations]);

  // Refresh when location changes significantly
  useEffect(() => {
    if (userLocation && currentUserId && isLocationReady) {
      // Invalidate location-based cache
      invalidateLocationCache();

      // Only refresh if we have existing posts (not initial load)
      if (posts.length > 0) {
        fetchRecommendations(1, true);
      }
    }
  }, [
    userLocation,
    currentUserId,
    isLocationReady,
    posts.length,
    fetchRecommendations,
  ]);

  // Improved location prompt rendering - only shows when actually needed
  const renderLocationPrompt = () => {
    // Only show prompt if permission is explicitly denied and not during requesting
    if (isDenied && !isRequesting) {
      return (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-800 font-medium">
                Location Access Needed
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Enable location to see posts from nearby businesses and get
                better recommendations.
              </p>
            </div>
            <Button
              onClick={requestLocationPermission}
              disabled={isRequesting}
              className="ml-4 bg-yellow-600 hover:bg-yellow-700 text-white text-sm py-2 px-4 disabled:opacity-50"
            >
              {isRequesting ? "Requesting..." : "Enable Location"}
            </Button>
          </div>
        </div>
      );
    }

    // Show unavailable message only once
    if (isUnavailable) {
      return (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700">
            Location services are not available on your device. You'll see
            general recommendations.
          </p>
        </div>
      );
    }

    return null;
  };

  // Show loading skeleton
  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center w-full">
        <div className="max-w-[1400px] w-full">
          <div className="container grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 py-8">
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

  // Show empty state
  if (!loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center w-full">
        <div className="max-w-[1400px] w-full">
          <div className="container grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 py-8">
            <aside className="hidden md:block">
              <Sidebar />
            </aside>
            <main className="flex flex-col justify-center items-center min-h-[50vh] space-y-4">
              {error ? (
                <>
                  <p className="text-red-500 text-center">{error}</p>
                  <Button
                    onClick={handleManualRefresh}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Try Again
                  </Button>
                </>
              ) : (
                <p className="text-gray-500">No posts found.</p>
              )}
            </main>
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
      <div className="max-w-[1400px] w-full">
        <div className="container grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 py-8">
          <aside className="hidden md:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <div className="mb-6">
                <Sidebar />
              </div>
              <div className="h-[500px]">
                <NearbyBusinessMap />
              </div>
            </div>
          </aside>
          <main className="space-y-6">
            {/* Location prompt - only shows when explicitly needed */}
            {renderLocationPrompt()}

            {/* Location status indicator - only when location is active and ready */}
            {isGranted && isLocationReady && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="text-blue-500 mt-0.5">
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
                  <div className="flex-1">
                    <p className="text-sm text-blue-600 font-medium">
                      Showing posts from businesses near you
                    </p>
                    <div className="mt-2 text-xs text-blue-500 space-y-1">
                      <p>• Free plan businesses within 2km</p>
                      <p>• Standard plan businesses within 4km</p>
                      <p>• Premium plan businesses within 8km</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleManualRefresh}
                    disabled={loading}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 border-0 h-8 px-3"
                  >
                    {loading ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
              </div>
            )}

            {/* Posts */}
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

            {/* Load more button */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-3 mt-6 text-blue-600 hover:text-blue-800 disabled:opacity-50 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {loading ? "Loading..." : "Load More Posts"}
              </button>
            )}

            {/* Development info */}
            {process.env.NODE_ENV === "development" && (
              <div className="text-xs text-gray-500 text-center space-y-1">
                <p>Location Status: {locationPermission}</p>
                <p>
                  Auto-refresh: {autoRefreshEnabled ? "Enabled" : "Disabled"}{" "}
                  (every {AUTO_REFRESH_INTERVAL / 60000} minutes)
                </p>
              </div>
            )}
          </main>
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
