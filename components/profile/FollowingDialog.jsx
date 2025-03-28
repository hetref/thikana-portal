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
import { Loader2, Minus, Search, UserMinus, UserX } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

const FollowingDialog = ({ followingCount, userId, className }) => {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const followingData = await getFollowing(userId);
        if (!Array.isArray(followingData)) {
          console.error("Expected an array but got:", followingData);
          setFollowing([]);
        } else {
          setFollowing(followingData);
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
      toast.success("Unfollowed successfully");
    } catch (error) {
      console.error("Error unfollowing business:", error);
      toast.error("Failed to unfollow");
    }
  };

  const filteredFollowing = useMemo(() => {
    if (!searchQuery.trim()) return following;

    return following.filter(
      (business) =>
        business?.businessName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        business?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business?.business_type
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
  }, [following, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={className}>
        <div className="flex flex-col items-center hover:text-primary transition-colors">
          <div className="font-semibold text-lg">{followingCount}</div>
          <div className="text-sm text-muted-foreground">Following</div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold">Following</DialogTitle>
          <DialogDescription className="text-sm">
            People and businesses you follow
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search following..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="mt-2 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              <p className="text-sm text-muted-foreground">
                Loading following...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-6 text-rose-500">
              <p>Could not load following list</p>
            </div>
          ) : Array.isArray(filteredFollowing) &&
            filteredFollowing.length === 0 ? (
            searchQuery ? (
              <div className="text-center py-8 space-y-2">
                <UserX className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  No matches found for "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <UserX className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  You're not following anyone yet
                </p>
                <p className="text-xs text-muted-foreground">
                  When you follow businesses or people, they'll show up here
                </p>
              </div>
            )
          ) : (
            <div className="space-y-3 mt-3">
              {filteredFollowing.map((business) => (
                <div
                  key={business?.uid}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background hover:bg-accent/5 transition-colors"
                >
                  <Link
                    href={
                      currentUser && business?.uid === currentUser.uid
                        ? "/profile"
                        : `/${business?.username}?user=${business?.uid}`
                    }
                    className="flex items-center gap-3 flex-1"
                  >
                    <Avatar className="h-10 w-10 border border-border/50">
                      <AvatarImage
                        src={business?.profilePic || "/avatar.png"}
                        alt={business?.businessName}
                      />
                      <AvatarFallback>
                        {business?.businessName?.charAt(0) || "B"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <div className="font-medium truncate">
                        {business?.businessName || "Business"}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>@{business?.username || "username"}</span>
                        {business?.business_type && (
                          <Badge
                            variant="outline"
                            className="text-xs font-normal py-0 h-5"
                          >
                            {business.business_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-9 px-2.5 ml-2"
                    onClick={() => handleUnfollow(business?.uid)}
                  >
                    <UserMinus className="h-4 w-4 mr-1.5" />
                    <span>Unfollow</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowingDialog;
