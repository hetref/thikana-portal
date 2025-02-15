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
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import { Minus } from "lucide-react";

const FollowingDialog = ({ followingCount }) => {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!userId) return;
      try {
        console.log("FETCHING FOLLOWING");
        const followingData = await getFollowing(userId);
        if (!Array.isArray(followingData)) {
          console.error("Expected an array but got:", followingData);
          setFollowing([]);
        } else {
          setFollowing(followingData);
        }
        console.log("Following Data:", followingData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [userId, open]);

  const handleUnfollow = async (businessId) => {
    if (!auth.currentUser) return;
    try {
      await Promise.all([
        deleteDoc(
          doc(db, "users", businessId, "followers", auth.currentUser.uid)
        ),
        deleteDoc(
          doc(db, "users", auth.currentUser.uid, "following", businessId)
        ),
      ]);
      setFollowing((prevFollowing) =>
        prevFollowing.filter((business) => business.uid !== businessId)
      );
    } catch (error) {
      console.error("Error unfollowing business:", error);
    }
  };

  const memoizedFollowing = useMemo(() => following, [following]);

  if (loading) return <div>...</div>;
  if (error) {
    console.log("ERROR WHILE FOLLOWING LIST", error);
    return <div>Error: {error.message}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <div>
          <div className="font-semibold">{followingCount}</div>
          <div className="text-sm text-muted-foreground">Following</div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your Following</DialogTitle>
          <DialogDescription className="pt-4">
            {Array.isArray(memoizedFollowing) &&
              memoizedFollowing.length === 0 && (
                <div className="text-center text-muted-foreground">
                  You are not following any businesses yet.
                </div>
              )}
            <div className="flex flex-col gap-4">
              {Array.isArray(memoizedFollowing) &&
                memoizedFollowing.length > 0 &&
                memoizedFollowing.map((business) => (
                  <div
                    className="flex items-center justify-between gap-4 border px-6 py-3 rounded-full w-full"
                    key={business?.uid}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/${business?.username}?user=${business?.uid}`}
                          className="grid gap-0.5 text-sm"
                        >
                          <span className="font-medium">
                            {business?.businessName}
                          </span>
                          <span className="text-muted-foreground">
                            @{business?.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {business?.business_type}
                          </span>
                        </Link>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-red-500 text-primary-foreground hover:bg-red-400 hover:text-white"
                        onClick={() => handleUnfollow(business?.uid)}
                      >
                        <Minus />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default FollowingDialog;
