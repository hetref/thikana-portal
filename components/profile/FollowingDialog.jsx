import { getFollowing } from "@/utils/followeringAction";
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
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import {
  Loader2,
  Minus,
  Search,
  UserMinus,
  UserX,
  Building2,
  User,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { sendNotificationToUser } from "@/lib/notifications";

const FollowingDialog = ({ followingCount, userId, className }) => {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingId, setLoadingId] = useState(null); // Track which button is loading
  const currentUser = auth.currentUser;
  const [businessCount, setBusinessCount] = useState(0);

  // Determine if the current user is the owner of this profile
  const isOwner = currentUser && currentUser.uid === userId;

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const followingData = await getFollowing(userId);
        if (!Array.isArray(followingData)) {
          console.error("Expected an array but got:", followingData);
          setFollowing([]);
          setBusinessCount(0);
        } else {
          setFollowing(followingData);
          // Count businesses (entities with business_type)
          const businesses = followingData.filter(
            (user) => !!user.business_type
          );
          setBusinessCount(businesses.length);
        }
      } catch (err) {
        setError(err);
        toast.error("Could not load following list");
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchFollowing();
    }
  }, [userId, open]);

  // Handle unfollowing
  const handleUnfollow = async (followingId) => {
    if (!currentUser || loadingId) return;

    try {
      // Set loading state for this specific button
      setLoadingId(followingId);

      // Unfollow logic
      await deleteDoc(
        doc(db, "users", followingId, "followers", currentUser.uid)
      );
      await deleteDoc(
        doc(db, "users", currentUser.uid, "following", followingId)
      );

      // Send notification to the business being unfollowed
      const currentUserData = await getDoc(doc(db, "users", currentUser.uid));
      const userData = currentUserData.exists() ? currentUserData.data() : null;
      const businessName =
        userData?.businessName || userData?.displayName || "Someone";

      await sendNotificationToUser(followingId, {
        title: "Lost a Follower",
        message: `${businessName} has unfollowed you`,
        type: "follower",
        sender: "System",
        whatsapp: false,
        email: false,
      });

      // Update local state
      const removedUser = following.find((user) => user.uid === followingId);
      setFollowing(following.filter((user) => user.uid !== followingId));

      // Update business count if needed
      if (removedUser && removedUser.business_type) {
        setBusinessCount((prevCount) => prevCount - 1);
      }

      toast.success("Unfollowed successfully");
    } catch (error) {
      console.error("Error unfollowing:", error);
      toast.error("Failed to unfollow");
    } finally {
      // Clear loading state
      setLoadingId(null);
    }
  };

  const filteredFollowing = useMemo(() => {
    if (!searchQuery.trim()) return following;

    return following.filter(
      (user) =>
        user?.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user?.business_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [following, searchQuery]);

  // Check if a user is a business
  const isBusinessAccount = (user) => {
    return !!user?.business_type;
  };

  return (
    <Dialog open={open} onOpenChange={isOwner ? setOpen : undefined}>
      <DialogTrigger className={className} disabled={!isOwner}>
        <div
          className={`flex flex-col items-center ${isOwner ? "hover:text-primary transition-colors" : ""}`}
          style={{ cursor: isOwner ? "pointer" : "default" }}
        >
          <div className="font-semibold text-lg">{followingCount}</div>
          <div className="text-sm text-muted-foreground">Following</div>
        </div>
      </DialogTrigger>
      {isOwner && (
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold">Following</DialogTitle>
            <DialogDescription className="text-sm flex flex-col gap-1">
              <div>People and businesses you follow</div>
              {!loading && !error && (
                <div className="text-xs flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className="font-normal py-0.5 px-2"
                  >
                    <Building2 className="h-3 w-3 mr-1" />
                    {businessCount} Businesses
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="font-normal py-0.5 px-2"
                  >
                    <User className="h-3 w-3 mr-1" />
                    {followingCount - businessCount} Users
                  </Badge>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search following..."
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
                  Loading following...
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-6 text-rose-500">
                <p>Could not load following list</p>
              </div>
            ) : filteredFollowing.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserX className="h-10 w-10 mx-auto mb-3 opacity-30" />
                {searchQuery.trim() ? (
                  <p>No results match your search</p>
                ) : (
                  <p>You are not following anyone yet</p>
                )}
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {filteredFollowing.map((user) => {
                  const isBusiness = isBusinessAccount(user);

                  return (
                    <div
                      key={user?.uid}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background hover:bg-accent/5 transition-colors"
                    >
                      {isBusiness ? (
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
                              <div className="flex items-center gap-1">
                                {isBusiness ? (
                                  <Badge
                                    variant="outline"
                                    className="text-xs font-normal py-0 h-5 flex items-center"
                                  >
                                    <Building2 className="h-3 w-3 mr-1" />
                                    Business
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-xs font-normal py-0 h-5 flex items-center"
                                  >
                                    <User className="h-3 w-3 mr-1" />
                                    User
                                  </Badge>
                                )}
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
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10 border border-border/50">
                            <AvatarImage
                              src={user?.profilePic || "/avatar.png"}
                              alt={user?.businessName}
                            />
                            <AvatarFallback>
                              {user?.businessName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <div className="font-medium truncate">
                              {user?.businessName ||
                                user?.displayName ||
                                "User"}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>@{user?.username || "username"}</span>
                              <Badge
                                variant="outline"
                                className="text-xs font-normal py-0 h-5 flex items-center"
                              >
                                <User className="h-3 w-3 mr-1" />
                                User
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-3 ml-2 border-gray-200 text-gray-700 hover:bg-gray-100"
                        onClick={() => handleUnfollow(user?.uid)}
                        disabled={loadingId === user?.uid}
                      >
                        {loadingId === user?.uid ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            <span>Unfollowing...</span>
                          </>
                        ) : (
                          <>
                            <UserMinus className="h-4 w-4 mr-1.5" />
                            <span>Unfollow</span>
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
};

export default FollowingDialog;
