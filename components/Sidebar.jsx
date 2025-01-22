"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MapPinIcon, LinkIcon, LoaderCircle, TicketCheck } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import useGetUser from "@/hooks/useGetUser";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { sendEmailVerification } from "firebase/auth";
// import toast from "react-hot-toast";

function DefaultSidebar() {
  return (
    <div className="sticky top-20">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-xl font-semibold">
            Welcome Back!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground mb-4">
            Login to access your profile and connect with others.
          </p>
          <Link href="/login">
            <Button className="w-full" variant="outline">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button className="w-full mt-2" variant="default">
              Sign Up
            </Button>
          </Link>
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

  useEffect(() => {
    if (!userId) return;

    const followersRef = collection(db, "users", userId, "followers");
    const followingRef = collection(db, "users", userId, "following");

    // Set up real-time listener for followers count
    const unsubscribeFollowers = onSnapshot(followersRef, (snapshot) => {
      setFollowersCount(snapshot.size); // Update followers count in real-time
    });

    // Set up real-time listener for following count
    const unsubscribeFollowing = onSnapshot(followingRef, (snapshot) => {
      setFollowingCount(snapshot.size); // Update following count in real-time
    });

    return () => {
      unsubscribeFollowers(); // Cleanup on unmount
      unsubscribeFollowing(); // Cleanup on unmount
    };
  }, [userId]);

  const verifyEmailHandler = async () => {
    await sendEmailVerification(auth.currentUser)
      .then(() => {
        toast.success("Verification email sent!");
      })
      .catch((error) => {
        toast.error("Error sending verification email: " + error.code);
      });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center">
        <h2>Loading ...</h2>
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="sticky top-20">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <Link
              href="/profile"
              className="flex flex-col items-center justify-center"
            >
              <Avatar className="w-20 h-20 border">
                <AvatarImage
                  src={user.profilePic || ""}
                  alt={user.fullname || "User"}
                />
              </Avatar>
              <div className="mt-4 space-y-1">
                <h3 className="font-semibold">{user.name || "Guest_user"}</h3>
                <p className="text-sm text-muted-foreground">
                  @{user.username}
                </p>
              </div>
            </Link>
            {!auth?.currentUser.emailVerified && (
              <>
                <p className="mt-3 text-sm text-muted-foreground">
                  <p>Email not verified</p>
                  <Button onClick={verifyEmailHandler} variant="ghost">
                    Verify Email
                  </Button>
                </p>
              </>
            )}
            <div className="w-full">
              <Separator className="my-4" />
              <div className="flex justify-center gap-6">
                <div>
                  <p className="font-medium">{followingCount || "0"}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
                <Separator orientation="vertical" />
                <div>
                  <p className="font-medium">{followersCount || "0"}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
              </div>
              <Separator className="my-4" />
            </div>
            <div className="w-full space-y-2 text-sm">
              <div className="flex items-center text-muted-foreground">
                <MapPinIcon className="w-4 h-4 mr-2" />
                {user.location || "No location"}
              </div>
              <div className="flex items-center text-muted-foreground">
                <LinkIcon className="w-4 h-4 mr-2 shrink-0" />
                {user.website || "No website"}
              </div>
              <Link
                href="/pricing"
                className="flex items-center text-muted-foreground font-semibold"
              >
                <TicketCheck className="w-4 h-4 mr-2 shrink-0" />
                {(user.plan &&
                  user.subscriptionStatus === "active" &&
                  user.plan.charAt(0).toUpperCase() + user.plan.slice(1)) ||
                  "Free"}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
