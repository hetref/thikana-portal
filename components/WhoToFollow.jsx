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

export default function WhoToFollow() {
  const [users, setUsers] = useState([]);
  const [following, setFollowing] = useState(new Set());
  const [isLoading, setIsLoading] = useState({});

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = [];
      querySnapshot.forEach((doc) => {
        if (doc.id !== auth.currentUser?.uid) {
          // Don't show current user
          usersList.push({ id: doc.id, ...doc.data() });
        }
      });
      setUsers(usersList);
    };
    fetchUsers();
  }, []);

  // Listen to current user's following collection
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const unsubscribe = onSnapshot(
      collection(db, "users", currentUser.uid, "following"),
      (snapshot) => {
        const followingSet = new Set();
        snapshot.forEach((doc) => {
          followingSet.add(doc.data().uid);
        });
        setFollowing(followingSet);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleFollow = async (userId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setIsLoading((prev) => ({ ...prev, [userId]: true }));

    try {
      // Add to the target user's followers collection
      await setDoc(doc(db, "users", userId, "followers", currentUser.uid), {
        uid: currentUser.uid,
        timestamp: new Date(),
      });

      // Add to the current user's following collection
      await setDoc(doc(db, "users", currentUser.uid, "following", userId), {
        uid: userId,
        timestamp: new Date(),
      });

      console.log(`Successfully followed user with ID: ${userId}`);
    } catch (error) {
      console.error("Error following user: ", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleUnfollow = async (userId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setIsLoading((prev) => ({ ...prev, [userId]: true }));

    try {
      // Remove from the target user's followers collection
      await deleteDoc(doc(db, "users", userId, "followers", currentUser.uid));

      // Remove from the current user's following collection
      await deleteDoc(doc(db, "users", currentUser.uid, "following", userId));

      console.log(`Successfully unfollowed user with ID: ${userId}`);
    } catch (error) {
      console.error("Error unfollowing user: ", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Who to Follow</CardTitle>
          <hr />
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col items-center gap-2">
            {users.map((user) => (
              <div
                className="flex items-center justify-between gap-2 border p-3 rounded-full w-full"
                key={user.id}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profilePic || "/avatar.png"} />
                  </Avatar>
                  <div className="grid gap-0.5 text-sm">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-muted-foreground">
                      @{user.username}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={following.has(user.id) ? "destructive" : "outline"}
                  onClick={() =>
                    following.has(user.id)
                      ? handleUnfollow(user.id)
                      : handleFollow(user.id)
                  }
                  disabled={isLoading[user.id]}
                >
                  {following.has(user.id) ? "Unfollow" : "Follow"}
                </Button>
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
