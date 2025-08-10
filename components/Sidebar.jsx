"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { auth, db } from "@/lib/firebase";
import useGetUser from "@/hooks/useGetUser";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import BusinessQueryDialog from "@/components/profile/BusinessQueryDialog";
import { MapPin, Link as LinkIcon, ExternalLink } from "lucide-react";
import FollowingDialog from "@/components/profile/FollowingDialog";
import FollowerDialog from "@/components/profile/FollowerDialog";

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

export default function Sidebar({ bannerSrc = "" }) {
  const userId = auth.currentUser?.uid || null;
  const user = useGetUser(userId);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const { /* isBusinessUser, */ loading } = { loading: false };
  const [showQueryDialog, setShowQueryDialog] = useState(false);

  const gradients = useMemo(
    () => [
      "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-600",
      "bg-gradient-to-r from-purple-500 via-pink-500 to-red-500",
      "bg-gradient-to-r from-sky-400 via-cyan-500 to-teal-500",
      "bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500",
      "bg-gradient-to-r from-emerald-400 via-green-500 to-lime-500",
      "bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-500",
    ],
    []
  );
  const gradientClass = useMemo(
    () => gradients[Math.floor(Math.random() * gradients.length)],
    [gradients]
  );

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

  // trimmed unused notification/verification helpers

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

  // using compact profile card instead of the previous detailed card

  return (
    <div className="sticky top-20">
      {/* Replaced old profile card with the new dark profile UI */}

      <div className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-white text-gray-900 shadow-lg">
        <div className="relative h-40">
          {bannerSrc ? (
            <Image
              src={bannerSrc}
              alt="Profile banner"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className={`h-full w-full ${gradientClass}`} />
          )}
        </div>

        <div className="relative -mt-16 flex justify-between items-end px-6">
          <FollowerDialog
            followerCount={followersCount}
            userId={userId}
            className="text-center"
          />
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <Image
              src={user.profilePic || "/avatar.png"}
              alt={user.fullname || user.name || "User"}
              width={128}
              height={128}
              className="object-cover w-full h-full"
              priority
            />
          </div>
          <FollowingDialog
            followingCount={followingCount}
            userId={userId}
            className="text-center"
          />
        </div>

        <div className="p-6 pt-4 flex flex-col items-center">
          <div className="text-center">
            <h2 className="text-xl font-bold">{user.name || user.fullname || "User"}</h2>
            <p className="text-gray-500 text-sm">@{user.username}</p>
          </div>

          <div className="w-full mt-4 space-y-2">
            {formatLocation(user.location) && (
              <div className="flex items-start gap-2 text-gray-600 group hover:text-gray-900 transition-colors">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <a
                  href={formatLocation(user.location).url}
                  className="text-left hover:underline flex-1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {formatLocation(user.location).displayText}
                  <ExternalLink className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            )}

            {formatWebsite(user.website) && (
              <div className="flex items-start gap-2 text-gray-600 group hover:text-gray-900 transition-colors">
                <LinkIcon className="w-4 h-4 mt-0.5 shrink-0" />
                <a
                  href={formatWebsite(user.website).url}
                  className="text-left hover:underline flex-1 truncate"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {formatWebsite(user.website).displayText}
                  <ExternalLink className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full mt-6">
            <Link href="/profile/settings" className="w-full">
              <Button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 rounded-lg shadow-md">
                Edit Profile
              </Button>
            </Link>
            <Button
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 rounded-lg shadow-md"
              onClick={() => setShowQueryDialog(true)}
            >
              Business Query
            </Button>
          </div>
        </div>
      </div>
      
      {/* Business Query Dialog */}
      <BusinessQueryDialog 
        open={showQueryDialog} 
        onOpenChange={setShowQueryDialog} 
      />
    </div>
  );
}
