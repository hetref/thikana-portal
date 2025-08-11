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
import Image from "next/image";

// Array of beautiful gradient combinations
const gradients = [
  "from-yellow-400 via-orange-500 to-red-600",
  "from-blue-400 via-purple-500 to-pink-600",
  "from-green-400 via-teal-500 to-blue-600",
  "from-pink-400 via-rose-500 to-purple-600",
  "from-indigo-400 via-purple-500 to-pink-600",
  "from-emerald-400 via-teal-500 to-cyan-600",
  "from-violet-400 via-purple-500 to-fuchsia-600",
  "from-amber-400 via-orange-500 to-red-600",
  "from-cyan-400 via-blue-500 to-indigo-600",
  "from-rose-400 via-pink-500 to-purple-600",
  "from-lime-400 via-green-500 to-emerald-600",
  "from-sky-400 via-blue-500 to-indigo-600"
];

// Function to get random gradient
const getRandomGradient = () => {
  return gradients[Math.floor(Math.random() * gradients.length)];
};

// Guest sidebar component when user is not logged in
function DefaultSidebar() {
  const [gradient] = useState(() => getRandomGradient());
  
  return (
    <div className="sticky top-20">
      <div className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-white text-gray-900 shadow-lg border border-gray-200">
        {/* Background pattern */}
        <div className="relative h-40">
          <div className={`w-full h-full bg-gradient-to-br ${gradient}`}></div>
        </div>

        {/* Profile image and stats container */}
        <div className="relative -mt-16 flex justify-between items-end px-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-gray-600 text-sm">Followers</div>
          </div>
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
            <span className="text-4xl">🏠</span>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-gray-600 text-sm">Following</div>
          </div>
        </div>

        {/* Rest of the content */}
        <div className="p-6 pt-4 flex flex-col items-center">
          {/* Name and handle */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">Welcome to Thikana</h2>
            <p className="text-gray-600 text-sm">Join our community</p>
          </div>

          {/* Bio */}
          <p className="text-center text-gray-700 mt-4 px-4">
            Connect with local businesses and discover amazing services in your area
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3 w-full mt-6">
            <Link href="/login" className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg shadow-md">
                  Login
                </Button>
              </Link>
            <Link href="/register" className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg shadow-md">
                Sign Up
              </Button>
              </Link>
            </div>
          </div>
      </div>
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
  const [gradient] = useState(() => getRandomGradient());
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [showFollowingDialog, setShowFollowingDialog] = useState(false);

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
        <div className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-white text-gray-900 shadow-lg border border-gray-200">
          <div className="relative h-40">
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 animate-pulse"></div>
          </div>
          <div className="relative -mt-16 flex justify-between items-end px-6">
            <div className="text-center">
              <div className="w-16 h-8 bg-gray-300 animate-pulse rounded"></div>
              <div className="w-20 h-4 bg-gray-300 animate-pulse rounded mt-2"></div>
            </div>
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-300 animate-pulse"></div>
            <div className="text-center">
              <div className="w-16 h-8 bg-gray-300 animate-pulse rounded"></div>
              <div className="w-20 h-4 bg-gray-300 animate-pulse rounded mt-2"></div>
            </div>
          </div>
          <div className="p-6 pt-4 flex flex-col items-center">
            <div className="w-32 h-6 bg-gray-300 animate-pulse rounded mb-2"></div>
            <div className="w-24 h-4 bg-gray-300 animate-pulse rounded mb-4"></div>
            <div className="w-full h-16 bg-gray-300 animate-pulse rounded"></div>
          </div>
            </div>
      </div>
    );
  }

  const location = formatLocation(user.location);
  const website = formatWebsite(user.website);
  const isVerified = userEmailStatus();

  return (
    <div className="sticky top-20">
      <div className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-white text-gray-900 shadow-lg border border-gray-200">
        {/* Background pattern */}
        <div className="relative h-40">
          <div className={`w-full h-full bg-gradient-to-br ${gradient}`}></div>
        </div>

        {/* Profile image and stats container */}
        <div className="relative -mt-16 flex justify-between items-end px-6">
          <div className="text-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowFollowersDialog(true)}>
            <div className="text-2xl font-bold text-gray-900">{followersCount}</div>
            <div className="text-gray-600 text-sm">Followers</div>
          </div>
            <Link href="/profile" className="group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg transition-transform group-hover:scale-105">
              <Avatar className="w-full h-full">
                  <AvatarImage
                    src={user.profilePic || ""}
                    alt={user.fullname || "User"}
                  />
                <AvatarFallback className="w-full h-full text-4xl bg-gray-100">
                    {user.name?.[0] || user.username?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
          </Link>
          <div className="text-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowFollowingDialog(true)}>
            <div className="text-2xl font-bold text-gray-900">{followingCount}</div>
            <div className="text-gray-600 text-sm">Following</div>
          </div>
        </div>

        {/* Rest of the content */}
        <div className="p-6 pt-4 flex flex-col items-center">
          {/* Name and handle */}
          <Link href="/profile" className="group">
            <div className="text-center">
              <h2 className="text-xl font-bold transition-colors group-hover:text-blue-600">
                  {user.name || "User"}
              </h2>
              <p className="text-gray-600 text-sm">@{user.username}</p>
              </div>
            </Link>

          {/* Email verification button */}
            {!isVerified && (
            <div className="mt-4 w-full">
                <Button
                  onClick={verifyEmailHandler}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg shadow-md text-sm"
                  size="sm"
                >
                  Verify Email
                </Button>
              </div>
            )}

          {/* Notifications */}
            {notificationCount > 0 && (
              <Link
                href="/notifications"
              className="flex items-center justify-between w-full p-3 mt-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
              >
              <span className="text-sm font-medium text-blue-900">Notifications</span>
                <Badge variant="destructive" className="ml-2">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </Badge>
              </Link>
            )}

          {/* Business info */}
            {isBusinessUser && (
            <div className="w-full mt-4 space-y-3 text-sm">
                {location && (
                <div className="flex items-start text-gray-700 gap-2 group hover:text-gray-900 transition-colors">
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
                <div className="flex items-start text-gray-700 gap-2 group hover:text-gray-900 transition-colors">
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
                    className="w-full py-2 border-blue-200 text-blue-700 bg-blue-50"
                    >
                      {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}{" "}
                      Plan
                    </Badge>
                  </div>
                )}
              </div>
            )}

          {/* Buttons */}
          <div className="flex flex-col gap-3 w-full mt-6">
              <Link href="/profile/settings">
              <Button className="w-full bg-[#ECF3F9] hover:bg-white text-black py-3 rounded-lg shadow-md">
                  Edit Profile
                </Button>
              </Link>
              <Button 
              className="w-full bg-[#ECF3F9] hover:bg-white text-black  py-3 rounded-lg shadow-md"
                onClick={() => setShowQueryDialog(true)}
              >
                <TicketIcon className="h-4 w-4 mr-2" />
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

      {/* Followers Dialog */}
      <FollowerDialog 
        open={showFollowersDialog} 
        onOpenChange={setShowFollowersDialog}
        userId={userId}
      />

      {/* Following Dialog */}
      <FollowingDialog 
        open={showFollowingDialog} 
        onOpenChange={setShowFollowingDialog}
        userId={userId}
      />
    </div>
  );
}
