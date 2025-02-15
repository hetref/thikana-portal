import { getFollowing, getFollowers } from "@/utils/followeringAction";
import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import toast from "react-hot-toast";

const FollowingDialog = ({ followingCount }) => {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!userId) return;
      try {
        console.log("FETCHING FOLLOWING");
        const followingData = await getFollowing(userId);
        if (!Array.isArray(followingData)) {
          console.error("Expected an array but got:", followingData);
          setFollowing([]);
        } else {
          setFollowing(followingData);
        }
        console.log("Following Data:", followingData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [userId, open]);

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
      setFollowing((prevFollowing) =>
        prevFollowing.filter((business) => business.id !== businessId)
      );

      // Only fetch new recommendations if we're running low
      if (following.length <= LIMIT) {
        setOffset(0);
        fetchRecommendedBusinesses(0);
      }
    } catch (error) {
      console.error("Error following business:", error);
    }
  };

  const memoizedFollowing = useMemo(() => following, [following]);

  if (loading) return <div>...</div>;
  if (error) {
    console.log("ERROR WHILE FOLLOWING LIST", error);
    return <div>Error: {error.message}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <div>
          <div className="font-semibold">{followingCount}</div>
          <div className="text-sm text-muted-foreground">Following</div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your Following</DialogTitle>
          <DialogDescription className="pt-4">
            {Array.isArray(memoizedFollowing) &&
              memoizedFollowing.length === 0 && (
                <div className="text-center text-muted-foreground">
                  You are not following any businesses yet.
                </div>
              )}
            <div className="flex flex-col gap-4">
              {Array.isArray(memoizedFollowing) &&
                memoizedFollowing.length > 0 &&
                memoizedFollowing.map((business) => (
                  <div
                    className="flex items-center justify-between gap-4 border px-6 py-3 rounded-full w-full"
                    key={business?.uid}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/${business?.username}?user=${business?.uid}`}
                          className="grid gap-0.5 text-sm"
                        >
                          <span className="font-medium">
                            {business?.businessName}
                          </span>
                          <span className="text-muted-foreground">
                            @{business?.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {business?.business_type}
                          </span>
                        </Link>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-green-500 text-primary-foreground hover:bg-green-400 hover:text-white"
                        onClick={() => handleFollow(business?.uid)}
                      >
                        <Plus />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

const FollowerDialog = ({ followerCount }) => {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchFollowers = async () => {
      if (!userId) return;
      try {
        console.log("FETCHING FOLLOWERS");
        const followersData = await getFollowers(userId);
        setFollowers(followersData);
        console.log("Followers Data:", followersData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowers();
  }, [userId, open]);

  const handleFollowToggle = async (followerId, isFollowing) => {
    if (!auth.currentUser) return;

    try {
      if (isFollowing) {
        // Unfollow logic
        await deleteDoc(
          doc(db, "users", followerId, "followers", auth.currentUser.uid)
        );
        await deleteDoc(
          doc(db, "users", auth.currentUser.uid, "following", followerId)
        );
        toast.success("Unfollowed Successfully");
      } else {
        // Follow logic
        await setDoc(
          doc(db, "users", followerId, "followers", auth.currentUser.uid),
          {
            uid: auth.currentUser.uid,
            timestamp: new Date(),
          }
        );
        await setDoc(
          doc(db, "users", auth.currentUser.uid, "following", followerId),
          {
            uid: followerId,
            timestamp: new Date(),
          }
        );
        toast.success("Followed Successfully");
      }

      // Update the local state
      setFollowers((prevFollowers) =>
        prevFollowers.map((follower) =>
          follower.uid === followerId
            ? { ...follower, isFollowing: !isFollowing }
            : follower
        )
      );
    } catch (error) {
      console.error("Error toggling follow status:", error);
    }
  };

  if (loading) return <div>...</div>;
  if (error) {
    console.log("ERROR WHILE FETCHING FOLLOWERS", error);
    return <div>Error: {error.message}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <div>
          <div className="font-semibold">{followerCount}</div>
          <div className="text-sm text-muted-foreground">Followers</div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your Followers</DialogTitle>
          <DialogDescription className="pt-4">
            {Array.isArray(followers) && followers.length === 0 && (
              <div className="text-center text-muted-foreground">
                You have no followers yet.
              </div>
            )}
            <div className="flex flex-col gap-4">
              {Array.isArray(followers) &&
                followers.length > 0 &&
                followers.map((follower) => (
                  <div
                    className="flex items-center justify-between gap-4 border px-6 py-3 rounded-full w-full"
                    key={follower?.uid}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/${follower?.username}?user=${follower?.uid}`}
                          className="grid gap-0.5 text-sm"
                        >
                          <span className="font-medium">
                            {follower?.businessName}
                          </span>
                          <span className="text-muted-foreground">
                            @{follower?.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {follower?.business_type}
                          </span>
                        </Link>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${
                          follower.isFollowing
                            ? "bg-red-500 text-primary-foreground hover:bg-red-400 hover:text-white"
                            : "bg-green-500 text-primary-foreground hover:bg-green-400 hover:text-white"
                        }`}
                        onClick={() =>
                          handleFollowToggle(
                            follower?.uid,
                            follower.isFollowing
                          )
                        }
                      >
                        {follower.isFollowing ? <Minus /> : <Plus />}
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default FollowerDialog;
