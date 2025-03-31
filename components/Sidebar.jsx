"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  TicketIcon
} from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import useGetUser from "@/hooks/useGetUser";
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { sendEmailVerification } from "firebase/auth";
import { useIsBusinessUser } from "@/lib/business-user";
import toast from "react-hot-toast";
import { userEmailStatus } from "@/utils/userStatus";
import { getUnreadNotificationCount } from "@/lib/notifications";
import FollowingDialog from "@/components/profile/FollowingDialog";
import FollowerDialog from "@/components/profile/FollowerDialog";
import BusinessQueryDialog from "@/components/profile/BusinessQueryDialog";

// Guest sidebar component when user is not logged in
function DefaultSidebar() {
  return (
    <div className="sticky top-20">
      <Card className="overflow-hidden border-none shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10">🏠</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">Welcome to Thikana</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Join our community to connect with local businesses
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full mt-2">
              <Link href="/login" className="col-span-1">
                <Button className="w-full" variant="outline">
                  Login
                </Button>
              </Link>
              <Link href="/register" className="col-span-1">
                <Button className="w-full">Sign Up</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Sidebar() {
  const userId = auth.currentUser?.uid || null;
  const user = useGetUser(userId);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const { isBusinessUser, loading } = useIsBusinessUser(userId);
  const [showQueryDialog, setShowQueryDialog] = useState(false);

  // Get follower and following counts
  useEffect(() => {
    if (!userId) return;

    const followersRef = collection(db, "users", userId, "followers");
    const followingRef = collection(db, "users", userId, "following");

    const unsubscribeFollowers = onSnapshot(followersRef, (snapshot) => {
      setFollowersCount(snapshot.size);
    });

    const unsubscribeFollowing = onSnapshot(followingRef, (snapshot) => {
      setFollowingCount(snapshot.size);
    });

    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
    };
  }, [userId]);

  // Get notification count
  useEffect(() => {
    let unsubscribe = () => {};

    if (userId) {
      unsubscribe = getUnreadNotificationCount((count) => {
        setNotificationCount(count);
      }, userId);
    }

    return () => unsubscribe();
  }, [userId]);

  const verifyEmailHandler = async () => {
    if (!auth.currentUser) return;

    try {
      await sendEmailVerification(auth.currentUser);
      toast.success("Verification email sent! Please check your inbox.", {
        duration: 5000,
      });
    } catch (error) {
      toast.error(
        `Error: ${error.message || "Failed to send verification email"}`
      );
    }
  };

  // Format location for display
  const formatLocation = (location) => {
    if (!location) return null;

    if (
      typeof location === "object" &&
      location.latitude &&
      location.longitude
    ) {
      return {
        displayText: `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`,
        url: `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
      };
    }

    return {
      displayText: location,
      url: `https://maps.google.com/search?q=${encodeURIComponent(location)}`,
    };
  };

  // Format website URL
  const formatWebsite = (website) => {
    if (!website) return null;

    return {
      displayText: website.replace(/^https?:\/\/(www\.)?/, ""),
      url: website.startsWith("http") ? website : `https://${website}`,
    };
  };

  if (!userId) {
    return <DefaultSidebar />;
  }

  if (loading || !user) {
    return (
      <div className="sticky top-20">
        <Card className="overflow-hidden shadow-md border-none">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 animate-pulse" />
              <div className="w-28 h-4 bg-muted animate-pulse rounded" />
              <div className="w-20 h-3 bg-muted animate-pulse rounded" />
              <div className="w-full h-20 bg-muted/50 animate-pulse rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const location = formatLocation(user.location);
  const website = formatWebsite(user.website);
  const isVerified = userEmailStatus();

  return (
    <div className="sticky top-20">
      <Card className="overflow-hidden shadow-md border-none">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            <Link href="/profile" className="group">
              <div className="relative flex items-center justify-center">
                <Avatar className="w-20 h-20 border-2 border-primary/20 transition-transform group-hover:scale-105">
                  <AvatarImage
                    src={user.profilePic || ""}
                    alt={user.fullname || "User"}
                  />
                  <AvatarFallback>
                    {user.name?.[0] || user.username?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="mt-3 space-y-1">
                <h3 className="font-semibold text-lg transition-colors group-hover:text-primary">
                  {user.name || "User"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  @{user.username}
                </p>
              </div>
            </Link>

            {!isVerified && (
              <div className="mt-3 w-full">
                <Button
                  onClick={verifyEmailHandler}
                  className="w-full text-xs bg-amber-600 hover:bg-amber-700"
                  size="sm"
                >
                  Verify Email
                </Button>
              </div>
            )}

            <div className="w-full mt-4">
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-6 py-2">
                <FollowingDialog
                  followingCount={followingCount}
                  userId={userId}
                  className="flex flex-col items-center hover:text-primary transition-colors cursor-pointer"
                />

                {isBusinessUser && (
                  <FollowerDialog
                    followerCount={followersCount}
                    userId={userId}
                    className="flex flex-col items-center hover:text-primary transition-colors cursor-pointer"
                  />
                )}
              </div>
              <Separator className="my-3" />
            </div>

            {notificationCount > 0 && (
              <Link
                href="/notifications"
                className="flex items-center justify-between w-full p-2 mb-4 bg-primary/5 rounded-md hover:bg-primary/10 transition-colors"
              >
                <span className="text-sm font-medium">Notifications</span>
                <Badge variant="destructive" className="ml-2">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </Badge>
              </Link>
            )}

            {isBusinessUser && (
              <div className="w-full space-y-3 text-sm">
                {location && (
                  <div className="flex items-start text-muted-foreground gap-2 group hover:text-foreground transition-colors">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <a
                      href={location.url}
                      className="text-left hover:underline flex-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {location.displayText}
                      <ExternalLink className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </div>
                )}

                {website && (
                  <div className="flex items-start text-muted-foreground gap-2 group hover:text-foreground transition-colors">
                    <LinkIcon className="w-4 h-4 mt-0.5 shrink-0" />
                    <a
                      href={website.url}
                      className="text-left hover:underline flex-1 truncate"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {website.displayText}
                      <ExternalLink className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </div>
                )}

                {user.plan && user.subscriptionStatus === "active" && (
                  <div className="mt-4">
                    <Badge
                      variant="outline"
                      className="w-full py-1 border-primary/20"
                    >
                      {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}{" "}
                      Plan
                    </Badge>
                  </div>
                )}
              </div>
            )}

            <div className="w-full mt-4">
              <Link href="/profile/settings">
                <Button variant="outline" size="sm" className="w-full">
                  Edit Profile
                </Button>
              </Link>
            </div>
            <div className="w-full mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setShowQueryDialog(true)}
              >
                <TicketIcon className="h-4 w-4 mr-2" />
                Business query
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>
      
      {/* Business Query Dialog */}
      <BusinessQueryDialog 
        open={showQueryDialog} 
        onOpenChange={setShowQueryDialog} 
      />
    </div>
  );
}
