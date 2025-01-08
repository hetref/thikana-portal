"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MapPinIcon, LinkIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import useGetUser from "@/hooks/useGetUser";

function DefaultSidebar() {
  const { user } = useAuth();
  const userData = user ? useGetUser(auth.currentUser.uid) : null;

  return (
    <div className="sticky top-20">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-xl font-semibold">
            Welcome Back!
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userData ? (
            <>
              <Avatar className="h-10 w-10">
                <AvatarImage src={userData.avatarUrl || "/default-avatar.png"} />
              </Avatar>
              <p className="text-center text-muted-foreground mb-4">
                {userData.username}
              </p>
            </>
          ) : (
            <p className="text-center text-muted-foreground mb-4">
              Login to access your profile and connect with others.
            </p>
          )}
          <Link href="/login">
            <Button className="w-full" variant="outline">
              Login
            </Button>
          </Link>
          <Link href="/signUp">
            <Button className="w-full mt-2" variant="default">
              Sign Up
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default DefaultSidebar;
