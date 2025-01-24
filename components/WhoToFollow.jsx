"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import Map from "./Map";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function WhoToFollow() {
  const [users, setUsers] = useState([]);
  const [following, setFollowing] = useState(new Set());

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribeUsers = onSnapshot(
      query(
        collection(db, "users"),
        where("uid", "not-in", [auth.currentUser.uid])
      ),
      (snapshot) => {
        const usersList = [];
        snapshot.forEach((doc) =>
          usersList.push({ id: doc.id, ...doc.data() })
        );
        setUsers(usersList);
      }
    );

    const unsubscribeFollowing = onSnapshot(
      collection(db, "users", auth.currentUser.uid, "following"),
      (snapshot) => {
        const followingSet = new Set();
        snapshot.forEach((doc) => followingSet.add(doc.data().uid));
        setFollowing(followingSet);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeFollowing();
    };
  }, [auth.currentUser]);

  const handleFollow = async (userId) => {
    if (!auth.currentUser) return;
    setFollowing((prev) => new Set(prev).add(userId));
    try {
      await Promise.all([
        setDoc(doc(db, "users", userId, "followers", auth.currentUser.uid), {
          uid: auth.currentUser.uid,
          timestamp: new Date(),
        }),
        setDoc(doc(db, "users", auth.currentUser.uid, "following", userId), {
          uid: userId,
          timestamp: new Date(),
        }),
      ]);
      console.log(`Successfully followed user with ID: ${userId}`);
    } catch (error) {
      console.error("Error following user: ", error);
    }
  };

  const handleUnfollow = async (userId) => {
    if (!auth.currentUser) return;
    setFollowing((prev) => {
      const updatedFollowing = new Set(prev);
      updatedFollowing.delete(userId);
      return updatedFollowing;
    });
    try {
      await Promise.all([
        deleteDoc(doc(db, "users", userId, "followers", auth.currentUser.uid)),
        deleteDoc(doc(db, "users", auth.currentUser.uid, "following", userId)),
      ]);
      console.log(`Successfully unfollowed user with ID: ${userId}`);
    } catch (error) {
      console.error("Error unfollowing user: ", error);
    }
  };

  return (
    <div className="space-y-4 sticky top-[80px] mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Who to Follow</CardTitle>
          <hr />
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col items-center gap-2">
            {users.map((user) => (
              <div
                className="flex items-center justify-between gap-4 border p-3 rounded-md w-full"
                key={user.id}
              >
                {/* <Avatar className="h-10 w-10">
                  <AvatarImage src={user.profilePic || "/avatar.png"} />
                </Avatar> */}
                <div className="flex flex-col justify-center w-full gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${user.username}?user=${user.id}`}
                      className="grid gap-0.5 text-sm"
                    >
                      <span className="font-medium">{user.name}</span>
                      <span className="text-muted-foreground">
                        @{user.username}
                      </span>
                    </Link>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`${
                      following.has(user.id)
                        ? "bg-red-500 text-primary-foreground hover:bg-red-400 hover:text-white"
                        : ""
                    }`}
                    onClick={() =>
                      following.has(user.id)
                        ? handleUnfollow(user.id)
                        : handleFollow(user.id)
                    }
                  >
                    {following.has(user.id) ? "Unfollow" : "Follow"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <hr />
        </CardContent>
      </Card>
      <Map />
    </div>
  );
}
