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
  Minus,
  Search,
  UserMinus,
  UserX,
  Building2,
  User,
  Users,
  Heart,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { sendNotificationToUser } from "@/lib/notifications";
import Loader from "@/components/Loader";

const FollowingDialog = ({ followingCount, userId, className, viewOnly = false, open, onOpenChange, children }) => {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingId, setLoadingId] = useState(null); // Track which button is loading
  const currentUser = auth.currentUser;
  const [businessCount, setBusinessCount] = useState(0);

  // Determine if the current user is the owner of this profile
  const isOwner = currentUser && currentUser.uid === userId;
  const canView = viewOnly || isOwner; // Allow viewing if viewOnly is true or if user is owner
  
  // Check if this is a controlled dialog (used externally)
  const isControlled = open !== undefined && onOpenChange !== undefined;

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
    <Dialog open={open} onOpenChange={canView ? onOpenChange : undefined}>
      {/* Only render DialogTrigger if not controlled */}
      {!isControlled && (
        children ? (
          <DialogTrigger asChild disabled={!canView}>
            {React.isValidElement(children)
              ? React.cloneElement(children, {
                  className: [children.props.className, className]
                    .filter(Boolean)
                    .join(" "),
                })
              : children}
          </DialogTrigger>
        ) : (
        <DialogTrigger className={className} disabled={!canView}>
          <div
            className={`flex flex-col items-center transition-colors duration-200 ${
              canView ? "hover:text-blue-600 cursor-pointer" : "cursor-default"
            }`}
          >
            <div className="font-semibold text-lg text-gray-900">{followingCount}</div>
            <div className="text-sm text-gray-500">Following</div>
          </div>
        </DialogTrigger>
        )
      )}
      {canView && (
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-gray-100">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-600" />
                Following
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {isOwner ? "People and businesses you follow" : "People and businesses this profile follows"}
              </DialogDescription>
              {!loading && !error && (
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                    <Building2 className="h-3 w-3 mr-1" />
                    {businessCount} Businesses
                  </Badge>
                  <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 font-medium">
                    <User className="h-3 w-3 mr-1" />
                    {followingCount - businessCount} Users
                  </Badge>
                </div>
              )}
            </DialogHeader>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search following..."
                className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader />
                <p className="text-sm text-gray-500">Loading following...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-2">
                  <UserX className="h-12 w-12 mx-auto opacity-50" />
                </div>
                <p className="text-red-600 font-medium">Could not load following</p>
                <p className="text-sm text-gray-500 mt-1">Please try again later</p>
              </div>
            ) : filteredFollowing.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-300 mb-3">
                  <Heart className="h-12 w-12 mx-auto" />
                </div>
                {searchQuery.trim() ? (
                  <div>
                    <p className="text-gray-600 font-medium">No results found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your search</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 font-medium">{isOwner ? "Not following anyone yet" : "Not following anyone"}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {isOwner ? "Discover businesses and people to follow" : "This profile is not following anyone yet"}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFollowing.map((user) => {
                  const isBusiness = isBusinessAccount(user);

                  return (
                    <div
                      key={user?.uid}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all duration-200"
                    >
                      {isBusiness ? (
                        <Link
                          href={`/${user?.uid}`}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                            <AvatarImage
                              src={user?.profilePic || "/avatar.png"}
                              alt={user?.businessName}
                            />
                            <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                              {user?.businessName?.charAt(0) || "B"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 truncate">
                              {user?.businessName || "Business"}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              @{user?.username || "username"}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                <Building2 className="h-3 w-3 mr-1" />
                                Business
                              </Badge>
                              {user?.business_type && (
                                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                                  {user.business_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                            <AvatarImage
                              src={user?.profilePic || "/avatar.png"}
                              alt={user?.businessName}
                            />
                            <AvatarFallback className="bg-green-100 text-green-600 font-semibold">
                              {user?.businessName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 truncate">
                              {user?.businessName ||
                                user?.displayName ||
                                "User"}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              @{user?.username || "username"}
                            </div>
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                <User className="h-3 w-3 mr-1" />
                                User
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Only show unfollow button for owners */}
                      {isOwner && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-3 h-9 px-3 border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-colors"
                          onClick={() => handleUnfollow(user?.uid)}
                          disabled={loadingId === user?.uid}
                        >
                          {loadingId === user?.uid ? (
                            <div className="flex items-center gap-2">
                              <Loader />
                              <span className="hidden sm:inline">Unfollowing...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <UserMinus className="h-4 w-4" />
                              <span className="hidden sm:inline">Unfollow</span>
                            </div>
                          )}
                        </Button>
                      )}
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
