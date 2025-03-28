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
import { MapPin, UserPlus, UserMinus, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/business-recommendations/${auth.currentUser.uid}?limit=${LIMIT}&offset=${currentOffset}&recommendation_type=${recommendationType}`,
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
    if (!auth.currentUser) return;

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
      toast.success("Unfollowed successfully");
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
    fetchRecommendedBusinesses(0);
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
              <div className="flex flex-col space-y-4">
                {businesses.map((business) => (
                  <div
                    key={`${business.id}-${offset}`}
                    className="group hover:bg-muted/40 transition-colors rounded-lg p-3"
                  >
                    <div className="flex items-start gap-3">
                      <Link
                        href={`/${business.username}?user=${business.id}`}
                        className="shrink-0"
                      >
                        <Avatar className="h-10 w-10 border border-primary/10 transition-transform group-hover:scale-105">
                          <AvatarImage
                            src={business.profilePic || ""}
                            alt={business.businessName}
                          />
                          <AvatarFallback className="bg-primary/5">
                            {business.businessName?.charAt(0) ||
                              business.username?.charAt(0) ||
                              "B"}
                          </AvatarFallback>
                        </Avatar>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/${business.username}?user=${business.id}`}
                          className="block group-hover:text-primary transition-colors"
                        >
                          <h3 className="font-medium text-sm truncate">
                            {business.businessName}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            @{business.username}
                          </p>
                        </Link>

                        <div className="flex flex-wrap gap-1 mt-1">
                          {business.businessType && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1 py-0 bg-background border-primary/20 text-primary-foreground font-normal"
                            >
                              {business.businessType}
                            </Badge>
                          )}

                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1 py-0 bg-background border-muted text-muted-foreground font-normal"
                          >
                            {getRecommendationBadge(business)}
                          </Badge>

                          {business.business_plan && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1 py-0 bg-background border-muted text-muted-foreground font-normal capitalize"
                            >
                              {business.business_plan}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant={
                          following.has(business.id) ? "destructive" : "default"
                        }
                        className={`text-xs h-8 ${
                          following.has(business.id)
                            ? "bg-rose-500 hover:bg-rose-600"
                            : "bg-primary hover:bg-primary/90"
                        }`}
                        onClick={() =>
                          following.has(business.id)
                            ? handleUnfollow(business.id)
                            : handleFollow(business.id)
                        }
                      >
                        {following.has(business.id) ? (
                          <>
                            <UserMinus className="h-3.5 w-3.5 mr-1" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            Follow
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
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
