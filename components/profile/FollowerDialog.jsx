import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { doc, deleteDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import {
  Search,
  UserX,
  UserMinus,
  Building2,
  User,
  Users,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { sendNotificationToUser } from "@/lib/notifications";
import Loader from "@/components/Loader";
import { getFollowers } from "@/utils/followeringAction";
import React, { useEffect, useState, useMemo } from "react";

const FollowerDialog = ({ followerCount, userId, className, viewOnly = false, open, onOpenChange, children }) => {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingId, setLoadingId] = useState(null);
  const [businessCount, setBusinessCount] = useState(0);
  const currentUser = auth.currentUser;

  const isOwner = currentUser && currentUser.uid === userId;
  const canView = viewOnly || isOwner; // Allow viewing if viewOnly is true or if user is owner
  
  // Check if this is a controlled dialog (used externally)
  const isControlled = open !== undefined && onOpenChange !== undefined;

  useEffect(() => {
    const fetchFollowers = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const followerData = await getFollowers(userId);
        if (followerData && Array.isArray(followerData)) {
          setFollowers(followerData);
          // Count businesses among followers
          const businesses = followerData.filter(
            (user) => !!user.business_type
          );
          setBusinessCount(businesses.length);
        } else {
          console.error("Expected an array but got:", followerData);
          setFollowers([]);
          setBusinessCount(0);
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

  const handleRemoveFollower = async (followerId) => {
    if (!currentUser || loadingId) return;

    try {
      setLoadingId(followerId);

      await deleteDoc(doc(db, "users", userId, "followers", followerId));
      await deleteDoc(doc(db, "users", followerId, "following", userId));

      const currentUserData = (
        await getDoc(doc(db, "users", currentUser.uid))
      ).data();
      const businessName =
        currentUserData?.businessName ||
        currentUserData?.displayName ||
        "A business";

      await sendNotificationToUser(followerId, {
        title: "Follower Removed",
        message: `${businessName} removed you from their followers`,
        type: "follower",
        sender: "System",
        whatsapp: false,
        email: false,
      });

      // Update local state and business count if needed
      const removedUser = followers.find((user) => user.uid === followerId);
      setFollowers(followers.filter((user) => user.uid !== followerId));

      if (removedUser && removedUser.business_type) {
        setBusinessCount((prevCount) => prevCount - 1);
      }

      toast.success("Follower removed successfully");
    } catch (error) {
      console.error("Error removing follower:", error);
      toast.error("Failed to remove follower");
    } finally {
      setLoadingId(null);
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
              <div className="font-semibold text-lg text-gray-900">{followerCount}</div>
              <div className="text-sm text-gray-500">Followers</div>
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
                <Users className="h-5 w-5 text-blue-600" />
                Followers
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {isOwner ? "People and businesses who follow you" : "People and businesses who follow this profile"}
              </DialogDescription>
              {!loading && !error && (
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                    <Building2 className="h-3 w-3 mr-1" />
                    {businessCount} Businesses
                  </Badge>
                  <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 font-medium">
                    <User className="h-3 w-3 mr-1" />
                    {followerCount - businessCount} Users
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
                placeholder="Search followers..."
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
                <p className="text-sm text-gray-500">Loading followers...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-2">
                  <UserX className="h-12 w-12 mx-auto opacity-50" />
                </div>
                <p className="text-red-600 font-medium">Could not load followers</p>
                <p className="text-sm text-gray-500 mt-1">Please try again later</p>
              </div>
            ) : filteredFollowers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-300 mb-3">
                  <Users className="h-12 w-12 mx-auto" />
                </div>
                {searchQuery.trim() ? (
                  <div>
                    <p className="text-gray-600 font-medium">No results found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your search</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 font-medium">{isOwner ? "No followers yet" : "No followers"}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {isOwner ? "Share your profile to gain followers" : "This profile has no followers yet"}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFollowers.map((user) => {
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
                              alt={user?.displayName || "User"}
                            />
                            <AvatarFallback className="bg-green-100 text-green-600 font-semibold">
                              {user?.displayName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 truncate">
                              {user?.displayName || "User"}
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
                      {/* Only show remove button for owners */}
                      {isOwner && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-3 h-9 px-3 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                          onClick={() => handleRemoveFollower(user?.uid)}
                          disabled={loadingId === user?.uid}
                        >
                          {loadingId === user?.uid ? (
                            <div className="flex items-center gap-2">
                              <Loader />
                              <span className="hidden sm:inline">Removing...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <UserMinus className="h-4 w-4" />
                              <span className="hidden sm:inline">Remove</span>
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

export default FollowerDialog;
