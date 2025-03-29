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
import { Loader2, RefreshCw } from "lucide-react";

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
        // Try to get user's current location if not using saved location
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

      toast.success("Followed successfully");

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

      // Show unfollow toast message
      toast.success(`Business unfollowed successfully`);
    } catch (error) {
      console.error("Error unfollowing business:", error);
      toast.error("Failed to unfollow business");
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

  // Get the recommendation type label
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

  const getRecommendationBadge = (business) => {
    if (business.recommendation_type === "location") {
      return business.distance_km ? `${business.distance_km}km away` : "Nearby";
    }
    return "Based on activity";
  };

  return (
    <div className="sticky top-20">
      <Card className="overflow-hidden shadow-md border-none">
        <CardHeader className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-semibold text-lg">
              Who to Follow
            </CardTitle>
            <Select
              value={recommendationType}
              onValueChange={handleRecommendationTypeChange}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="location">Location Based</SelectItem>
                <SelectItem value="activity">Activity Based</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator className="my-3" />
        </CardHeader>

        <CardContent className="p-6 pt-0">
          {userEmailStatus() === false ? (
            <div className="flex flex-col gap-4 items-center py-6 px-2 text-center">
              <p className="text-sm text-muted-foreground">
                Please verify your email to see recommendations.
              </p>
              <Button
                size="sm"
                className="text-xs bg-amber-600 hover:bg-amber-700"
                onClick={() => {
                  sendEmailVerification(auth.currentUser)
                    .then(() => toast.success("Verification email sent"))
                    .catch(() =>
                      toast.error("Failed to send verification email")
                    );
                }}
              >
                Verify Email
              </Button>
            </div>
          ) : loading && businesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">
                Loading recommendations...
              </p>
            </div>
          ) : businesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2 text-center">
              <RefreshCw className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No recommendations found
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchRecommendedBusinesses(0)}
                className="text-xs"
              >
                Refresh
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-2">
                {businesses.length === 0 && !loading ? (
                  <div className="text-center p-4">
                    {recommendationType === "location" ? (
                      <p className="text-muted-foreground text-sm">
                        No nearby businesses found. Try enabling location access
                        or switch to Activity Based recommendations.
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No businesses with recent activity found. Try switching
                        to Location Based recommendations.
                      </p>
                    )}
                  </div>
                ) : (
                  businesses.map((business) => (
                    <div
                      className="flex items-center justify-between gap-4 border p-3 rounded-md w-full"
                      key={`${business.id}-${offset}`}
                    >
                      <div className="flex flex-col justify-center w-full gap-2">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/${business.username}?user=${business.id}`}
                            className="grid gap-0.5 text-sm"
                          >
                            <span className="font-medium">
                              {business.businessName}
                            </span>
                            <span className="text-muted-foreground">
                              @{business.username}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {business.businessType}
                              {business.distance_km && (
                                <span
                                  className={`${
                                    business.distance_km > 4
                                      ? "text-amber-600"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  {` • ${business.distance_km}km away`}
                                </span>
                              )}
                              {business.business_plan && (
                                <span
                                  className={`${
                                    business.business_plan === "premium"
                                      ? "text-amber-600"
                                      : business.business_plan === "standard"
                                        ? "text-blue-600"
                                        : ""
                                  }`}
                                >
                                  {` • ${
                                    business.business_plan
                                      .charAt(0)
                                      .toUpperCase() +
                                    business.business_plan.slice(1)
                                  } plan`}
                                </span>
                              )}
                            </span>
                            {business.recommendation_type && (
                              <span className="text-xs text-muted-foreground capitalize">
                                {getRecommendationTypeLabel(
                                  business.recommendation_type
                                )}
                                {recommendationType === "location"
                                  ? " • Within range"
                                  : business.has_activity
                                    ? " • Active business"
                                    : ""}
                              </span>
                            )}
                          </Link>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`${
                            following.has(business.id)
                              ? "bg-red-500 text-primary-foreground hover:bg-red-400 hover:text-white"
                              : ""
                          }`}
                          onClick={() =>
                            following.has(business.id)
                              ? handleUnfollow(business.id)
                              : handleFollow(business.id)
                          }
                        >
                          {following.has(business.id) ? "Unfollow" : "Follow"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="w-full mt-4 text-xs h-8"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
