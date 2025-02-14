"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import Map from "./Map";
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

export default function WhoToFollow() {
  const [businesses, setBusinesses] = useState([]);
  const [following, setFollowing] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 4;

  const fetchRecommendedBusinesses = async (currentOffset = 0) => {
    if (!auth.currentUser || loading) return;

    try {
      setLoading(true);
      const response = await fetch(
        `https://thikana-recommendation-model.onrender.com/business-recommendations/${auth.currentUser.uid}?limit=${LIMIT}&offset=${currentOffset}`,
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
  }, [auth.currentUser]);

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
    } catch (error) {
      console.error("Error unfollowing business:", error);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchRecommendedBusinesses(offset);
    }
  };

  return (
    <div className="space-y-4 sticky top-[80px] max-h-[80vh] overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Who to Follow</CardTitle>
          <hr />
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col items-center gap-2">
            {businesses.map((business) => (
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
                      <span className="font-medium">{business.name}</span>
                      <span className="text-muted-foreground">
                        @{business.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {business.business_type}
                      </span>
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
            ))}
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Loading..." : "Load More"}
            </Button>
          )}
          <hr />
        </CardContent>
      </Card>
      <Map />
    </div>
  );
}
