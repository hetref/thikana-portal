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
  UserMinus,
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

  // Determine if the current user is the owner of this profile
  const isOwner = currentUser && currentUser.uid === userId;

  useEffect(() => {
    const fetchFollowers = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const followerData = await getFollowers(userId);
        if (followerData && Array.isArray(followerData)) {
          setFollowers(followerData);
        } else {
          console.error("Expected an array but got:", followerData);
          setFollowers([]);
        }
      } catch (err) {
        console.error("Error fetching followers:", err);
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

  // Handle removing a follower
  const handleRemoveFollower = async (followerId) => {
    if (!currentUser) return;

    try {
      // Remove follower logic
      await deleteDoc(doc(db, "users", userId, "followers", followerId));
      await deleteDoc(doc(db, "users", followerId, "following", userId));

      // Update local state
      setFollowers(followers.filter((user) => user.uid !== followerId));
      toast.success("Follower removed successfully");
    } catch (error) {
      console.error("Error removing follower:", error);
      toast.error("Failed to remove follower");
    }
  };

  const filteredFollowers = useMemo(() => {
    if (!searchQuery.trim()) return followers;

    return followers.filter(
      (user) =>
        user?.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user?.business_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [followers, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={isOwner ? setOpen : undefined}>
      <DialogTrigger className={className} disabled={!isOwner}>
        <div
          className={`flex flex-col items-center ${isOwner ? "hover:text-primary transition-colors" : ""}`}
          style={{ cursor: isOwner ? "pointer" : "default" }}
        >
          <div className="font-semibold text-lg">{followerCount}</div>
          <div className="text-sm text-muted-foreground">Followers</div>
        </div>
      </DialogTrigger>
      {isOwner && (
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold">Followers</DialogTitle>
            <DialogDescription className="text-sm">
              People and businesses who follow you
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
            ) : filteredFollowers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserX className="h-10 w-10 mx-auto mb-3 opacity-30" />
                {searchQuery.trim() ? (
                  <p>No results match your search</p>
                ) : (
                  <p>You don't have any followers yet</p>
                )}
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {filteredFollowers.map((user) => (
                  <div
                    key={user?.uid}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background hover:bg-accent/5 transition-colors"
                  >
                    <Link
                      href={`/${user?.username}?user=${user?.uid}`}
                      className="flex items-center gap-3 flex-1"
                    >
                      <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage
                          src={user?.profilePic || "/avatar.png"}
                          alt={user?.businessName}
                        />
                        <AvatarFallback>
                          {user?.businessName?.charAt(0) || "B"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <div className="font-medium truncate">
                          {user?.businessName || "Business"}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>@{user?.username || "username"}</span>
                          {user?.business_type && (
                            <Badge
                              variant="outline"
                              className="text-xs font-normal py-0 h-5"
                            >
                              {user.business_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 px-3 ml-2 border-gray-200 text-gray-700 hover:bg-gray-100"
                      onClick={() => handleRemoveFollower(user?.uid)}
                    >
                      <UserMinus className="h-4 w-4 mr-1.5" />
                      <span>Remove</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
};

export default FollowerDialog;
