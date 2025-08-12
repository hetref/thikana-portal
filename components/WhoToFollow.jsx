"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Map from "./Map";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import Link from "next/link";
import { userEmailStatus } from "@/utils/userStatus";
import { sendEmailVerification } from "firebase/auth";
import { toast } from "react-hot-toast";
import { RefreshCw, MapPin, Activity, Users, Mail } from "lucide-react";
import Loader from "@/components/Loader";

export default function WhoToFollow() {
  const [businesses, setBusinesses] = useState([]);
  const [following, setFollowing] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [recommendationType, setRecommendationType] = useState("location");
  const LIMIT = 4;

  const fetchRecommendedBusinesses = async (currentOffset = 0) => {
    if (!auth.currentUser || loading) return;

    try {
      setLoading(true);

      // Get current location for location-based recommendations
      let locationParams = "";
      if (recommendationType === "location") {
        try {
          if (navigator.geolocation) {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 5 * 60 * 1000, // 5 minutes
              });
            });

            if (position) {
              locationParams = `&latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`;
            }
          }
        } catch (err) {
          console.log(
            "Could not get current location, using saved location instead"
          );
        }
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/business-recommendations/${auth.currentUser.uid}?limit=${LIMIT}&offset=${currentOffset}&recommendation_type=${recommendationType}${locationParams}`,
        {
          method: "GET",
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

      // Create a Set of existing business IDs
      const existingIds = new Set(businesses.map((b) => b.id));

      // Filter out any duplicates from new recommendations
      const newRecommendations = data.recommendations.filter(
        (business) => !existingIds.has(business.id)
      );

      if (currentOffset === 0) {
        setBusinesses(data.recommendations);
      } else {
        setBusinesses((prevBusinesses) => [
          ...prevBusinesses,
          ...newRecommendations,
        ]);
      }

      setHasMore(data.has_more);
      setOffset(currentOffset + LIMIT);
    } catch (error) {
      console.error("Error fetching recommended businesses:", error);
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    // Reset state when recommendation type changes
    setOffset(0);
    setBusinesses([]);
    setHasMore(true);

    // Listen for following changes
    const unsubscribeFollowing = onSnapshot(
      collection(db, "users", auth.currentUser.uid, "following"),
      (snapshot) => {
        const followingSet = new Set();
        snapshot.forEach((doc) => followingSet.add(doc.id));
        setFollowing(followingSet);

        // Remove followed businesses from recommendations
        setBusinesses((prevBusinesses) =>
          prevBusinesses.filter((business) => !followingSet.has(business.id))
        );
      }
    );

    // Fetch initial recommendations
    fetchRecommendedBusinesses(0);

    return () => {
      unsubscribeFollowing();
    };
  }, [auth.currentUser, recommendationType]);

  const handleFollow = async (businessId) => {
    if (!auth.currentUser || businessId === auth.currentUser.uid) return;

    try {
      await Promise.all([
        setDoc(
          doc(db, "users", businessId, "followers", auth.currentUser.uid),
          {
            uid: auth.currentUser.uid,
            timestamp: new Date(),
          }
        ),
        setDoc(
          doc(db, "users", auth.currentUser.uid, "following", businessId),
          {
            uid: businessId,
            timestamp: new Date(),
          }
        ),
      ]);

      // Remove the followed business from the list immediately
      setBusinesses((prevBusinesses) =>
        prevBusinesses.filter((business) => business.id !== businessId)
      );

      // Show success toast message
      const businessName =
        businesses.find((b) => b.id === businessId)?.businessName || "Business";
      toast.success(`You are now following ${businessName}`);

      // Only fetch new recommendations if we're running low
      if (businesses.length <= LIMIT) {
        setOffset(0);
        fetchRecommendedBusinesses(0);
      }
    } catch (error) {
      console.error("Error following business:", error);
      toast.error("Failed to follow business");
    }
  };

  const handleUnfollow = async (businessId) => {
    if (!auth.currentUser) return;

    try {
      await Promise.all([
        deleteDoc(
          doc(db, "users", businessId, "followers", auth.currentUser.uid)
        ),
        deleteDoc(
          doc(db, "users", auth.currentUser.uid, "following", businessId)
        ),
      ]);

      toast.success(`Business unfollowed successfully`);
    } catch (error) {
      console.error("Error unfollowing business:", error);
      toast.error("Failed to unfollow business");
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchRecommendedBusinesses(offset);
    }
  };

  const handleRecommendationTypeChange = (value) => {
    setRecommendationType(value);
    setOffset(0);
    setBusinesses([]);
    setHasMore(true);
  };

  const getRecommendationTypeLabel = (type) => {
    switch (type) {
      case "location":
        return "Location Based";
      case "activity":
        return "Activity Based";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case "premium":
        return "bg-gradient-to-r from-amber-500 to-yellow-500 text-white";
      case "standard":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getDistanceBadgeColor = (distance) => {
    if (distance <= 2) return "bg-gradient-to-r from-green-500 to-emerald-500 text-white";
    if (distance <= 5) return "bg-gradient-to-r from-yellow-500 to-amber-500 text-white";
    return "bg-gradient-to-r from-orange-500 to-red-500 text-white";
  };

  const BusinessCard = ({ business }) => (
    <div className="group relative bg-white border border-gray-100 rounded-2xl p-4 transition-all duration-200 hover:shadow-md hover:border-gray-200">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Link href={`/${business.id}`} className="flex-shrink-0">
          <Avatar className="h-12 w-12 ring-2 ring-gray-100 transition-all duration-200 group-hover:ring-blue-200">
            <AvatarImage src={business.profileImage} alt={business.businessName} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold text-sm">
              {business.businessName?.charAt(0) || "B"}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Link href={`/${business.id}`} className="block">
            <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200 truncate text-sm">
              {business.businessName}
            </h3>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              @{business.username}
            </p>
          </Link>

          {/* Single most relevant badge */}
          <div className="mt-2">
            {business.distance_km ? (
              <Badge variant="secondary" className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-0 font-medium">
                <MapPin className="w-3 h-3 mr-1" />
                {business.distance_km}km away
              </Badge>
            ) : business.business_plan === "premium" ? (
              <Badge variant="secondary" className="text-xs px-2 py-1 bg-amber-50 text-amber-700 border-0 font-medium">
                Premium
              </Badge>
            ) : business.recommendation_type === "activity" && business.has_activity ? (
              <Badge variant="secondary" className="text-xs px-2 py-1 bg-green-50 text-green-700 border-0 font-medium">
                <Activity className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Follow Button */}
        <Button
          size="sm"
          variant={following.has(business.id) ? "outline" : "default"}
          className={`text-xs h-8 px-3 font-medium transition-all duration-200 transform flex-shrink-0 ${following.has(business.id)
            ? "border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
            : "bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 hover:from-orange-600 hover:via-red-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] border-0"
            }`}
          onClick={() =>
            following.has(business.id)
              ? handleUnfollow(business.id)
              : handleFollow(business.id)
          }
        >
          {following.has(business.id) ? "Following" : "Follow"}
        </Button>
      </div>
    </div>
  );

  const EmptyState = ({ type, onRefresh }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
      <div className="p-4 bg-gray-100 rounded-full">
        {type === "no-recommendations" ? (
          <RefreshCw className="h-8 w-8 text-gray-400" />
        ) : type === "loading" ? (
          <Loader />
        ) : (
          <Users className="h-8 w-8 text-gray-400" />
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-medium text-gray-900">
          {type === "loading" ? "Loading recommendations..." : "No recommendations found"}
        </h3>

        {type !== "loading" && (
          <p className="text-sm text-gray-600 max-w-sm">
            {recommendationType === "location"
              ? "No nearby businesses found. Try enabling location access or switch to Activity Based recommendations."
              : "No businesses with recent activity found. Try switching to Location Based recommendations."
            }
          </p>
        )}
      </div>

      {type === "no-recommendations" && onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="mt-4 bg-white hover:bg-gray-50 border-gray-300"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );

  const EmailVerificationPrompt = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
      <div className="p-4 bg-amber-100 rounded-full">
        <Mail className="h-8 w-8 text-amber-600" />
      </div>

      <div className="space-y-2">
        <h3 className="font-medium text-gray-900">Email Verification Required</h3>
        <p className="text-sm text-gray-600 max-w-sm">
          Please verify your email address to see personalized business recommendations.
        </p>
      </div>

      <Button
        size="sm"
        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm"
        onClick={() => {
          sendEmailVerification(auth.currentUser)
            .then(() => toast.success("Verification email sent"))
            .catch(() => toast.error("Failed to send verification email"));
        }}
      >
        <Mail className="w-4 h-4 mr-2" />
        Send Verification Email
      </Button>
    </div>
  );

  return (
    <div className="sticky top-20">
      <Card className="overflow-hidden shadow-lg bg-white border-0 rounded-2xl">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="font-bold text-xl text-gray-900">
                Who to Follow
              </CardTitle>
            </div>

            <Select
              value={recommendationType}
              onValueChange={handleRecommendationTypeChange}
            >
              <SelectTrigger className="w-[160px] h-9 bg-white border-gray-200 shadow-sm hover:border-gray-300 focus:border-blue-500 transition-colors">
                <div className="flex items-center gap-2">
                  {recommendationType === "location" ? (
                    <MapPin className="w-3 h-3 text-gray-500" />
                  ) : (
                    <Activity className="w-3 h-3 text-gray-500" />
                  )}
                  <SelectValue placeholder="Filter by" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 shadow-lg rounded-lg">
                <SelectItem value="location" className="focus:bg-blue-50 focus:text-blue-900">
                  Location Based
                </SelectItem>
                <SelectItem value="activity" className="focus:bg-blue-50 focus:text-blue-900">
                  Activity Based
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-6">
          {userEmailStatus() === false ? (
            <EmailVerificationPrompt />
          ) : loading && businesses.length === 0 ? (
            <EmptyState type="loading" />
          ) : businesses.length === 0 ? (
            <EmptyState
              type="no-recommendations"
              onRefresh={() => fetchRecommendedBusinesses(0)}
            />
          ) : (
            <div className="space-y-4">
              {/* Business Cards */}
              <div className="space-y-3">
                {businesses.map((business) => (
                  <BusinessCard
                    key={`${business.id}-${offset}`}
                    business={business}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="w-full mt-6 h-10 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border-gray-200 text-gray-700 font-medium transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <Loader />
                      <span className="ml-2">Loading more...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Load More Recommendations
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}