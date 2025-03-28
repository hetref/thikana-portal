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
import {
  Loader2,
  Plus,
  Search,
  UserPlus,
  UserX,
  UserCheck,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const FollowerDialog = ({ followerCount, userId, className }) => {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchFollowers = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const followersData = await getFollowers(userId);
        setFollowers(followersData);
      } catch (err) {
        setError(err);
        toast.error("Could not load followers list");
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchFollowers();
    }
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
        toast.success("Unfollowed successfully");
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
        toast.success("Followed successfully");
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
      toast.error("Failed to update follow status");
    }
  };

  const filteredFollowers = useMemo(() => {
    if (!searchQuery.trim()) return followers;

    return followers.filter(
      (follower) =>
        follower?.businessName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        follower?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        follower?.business_type
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
  }, [followers, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={className}>
        <div className="flex flex-col items-center hover:text-primary transition-colors">
          <div className="font-semibold text-lg">{followerCount}</div>
          <div className="text-sm text-muted-foreground">Followers</div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold">Followers</DialogTitle>
          <DialogDescription className="text-sm">
            People and businesses following you
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search followers..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="mt-2 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              <p className="text-sm text-muted-foreground">
                Loading followers...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-6 text-rose-500">
              <p>Could not load followers list</p>
            </div>
          ) : Array.isArray(filteredFollowers) &&
            filteredFollowers.length === 0 ? (
            searchQuery ? (
              <div className="text-center py-8 space-y-2">
                <UserX className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  No matches found for "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <UserX className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  You don't have any followers yet
                </p>
                <p className="text-xs text-muted-foreground">
                  When people follow you, they'll show up here
                </p>
              </div>
            )
          ) : (
            <div className="space-y-3 mt-3">
              {filteredFollowers.map((follower) => (
                <div
                  key={follower?.uid}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background hover:bg-accent/5 transition-colors"
                >
                  <Link
                    href={
                      currentUser && follower?.uid === currentUser.uid
                        ? "/profile"
                        : `/${follower?.username}?user=${follower?.uid}`
                    }
                    className="flex items-center gap-3 flex-1"
                  >
                    <Avatar className="h-10 w-10 border border-border/50">
                      <AvatarImage
                        src={follower?.profilePic || "/avatar.png"}
                        alt={follower?.businessName}
                      />
                      <AvatarFallback>
                        {follower?.businessName?.charAt(0) || "B"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <div className="font-medium truncate">
                        {follower?.businessName || "Business"}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>@{follower?.username || "username"}</span>
                        {follower?.business_type && (
                          <Badge
                            variant="outline"
                            className="text-xs font-normal py-0 h-5"
                          >
                            {follower.business_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                  {auth.currentUser &&
                    auth.currentUser.uid !== follower?.uid && (
                      <Button
                        size="sm"
                        variant={follower.isFollowing ? "outline" : "default"}
                        className={`h-9 px-2.5 ml-2 ${
                          follower.isFollowing
                            ? "border-gray-200 text-gray-700 hover:bg-gray-100"
                            : "bg-primary text-primary-foreground"
                        }`}
                        onClick={() =>
                          handleFollowToggle(
                            follower?.uid,
                            follower.isFollowing
                          )
                        }
                      >
                        {follower.isFollowing ? (
                          <>
                            <UserCheck className="h-4 w-4 mr-1.5" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1.5" />
                            <span>Follow</span>
                          </>
                        )}
                      </Button>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowerDialog;
