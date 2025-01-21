"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon,
  FileTextIcon,
  HeartIcon,
  LinkIcon,
  MapPinIcon,
  Loader2Icon,
  Images,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
import { useSearchParams } from "next/navigation";
import { useGetUserPosts } from "@/hooks/useGetPosts";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import ProfilePosts from "@/components/ProfilePosts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Profile() {
  const user = auth.currentUser;
  const router = useRouter();
  const [likedPosts, setLikedPosts] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state
  const searchParams = useSearchParams();
  const userId = searchParams.get("user") || user?.uid;

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else if (user.uid === userId) {
      router.push("/profile");
    }
  }, [user, userId, router]);

  useEffect(() => {
    if (!userId) return;
    const userDocRef = doc(db, "users", userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (userDocSnap) => {
        if (userDocSnap.exists()) {
          setUserData(userDocSnap.data());
          setLoading(false); // Set loading to false once data is fetched
        } else {
          console.log("No such user!");
          setLoading(false); // Set loading to false even if no user is found
        }
      },
      (error) => {
        console.error("Error fetching user data:", error);
        setLoading(false); // Set loading to false in case of an error
      }
    );
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [userId]);

  const {
    posts,
    loading: postsLoading,
    fetchMorePosts,
    hasMore,
    error,
  } = useGetUserPosts(userId);

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

  const handleLoadMore = () => {
    if (hasMore && !postsLoading) {
      fetchMorePosts();
    }
  };

  const formattedDate = new Date(
    user?.metadata?.creationTime
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const renderPosts = () => {
    if (postsLoading && !posts.length) {
      return (
        <div className="flex justify-center py-8">
          <Loader2Icon className="w-6 h-6 animate-spin" />
        </div>
      );
    }
    if (!postsLoading && !posts.length) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No posts yet
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="p-4">
            <ProfilePosts post={post} userData={userData} />
          </Card>
        ))}
        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={postsLoading}
            >
              {postsLoading ? (
                <>
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const getLikedPosts = () => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "postlikes"),
      async (querySnapshot) => {
        const postIds = querySnapshot.docs.map((doc) => doc.id);
        const postDocs = await Promise.all(
          postIds.map((id) => getDoc(doc(db, "posts", id)))
        );
        const tempLikedPosts = postDocs
          .filter((doc) => doc.exists())
          .map((doc) => ({ ...doc.data(), id: doc.id }));
        setLikedPosts(tempLikedPosts);
      },
      (error) => {
        console.error("Error fetching liked posts:", error);
      }
    );
    return () => unsubscribe();
  };

  useEffect(() => {
    getLikedPosts();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <Loader2Icon className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full">
      <div className="max-w-7xl w-full grid grid-cols-1 gap-0 py-8 lg:grid-cols-[300px_minmax(0,1fr)_300px] lg:gap-0.5">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <Sidebar />
          </div>
        </aside>
        <main className="max-w-[580px] mx-auto w-full px-2">
          <div className="grid grid-cols-1 gap-6">
            <div className="w-full">
              <Card className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="w-24 h-24 border">
                      <AvatarImage
                        src={userData?.profilePic || "/avatar.png"}
                      />
                    </Avatar>
                    <h1 className="mt-4 text-2xl font-bold">
                      {userData?.name}
                    </h1>
                    <p className="text-muted-foreground">
                      @{userData?.username}
                    </p>
                    <p className="mt-2 text-sm">
                      {userData?.bio || "No bio yet"}
                    </p>
                    <div className="w-full mt-6">
                      <div className="flex justify-between mb-4">
                        <div>
                          <div className="font-semibold">{followingCount}</div>
                          <div className="text-sm text-muted-foreground">
                            Following
                          </div>
                        </div>
                        <Separator orientation="vertical" />
                        <div>
                          <div className="font-semibold">{followersCount}</div>
                          <div className="text-sm text-muted-foreground">
                            Followers
                          </div>
                        </div>
                        <Separator orientation="vertical" />
                        <div>
                          <div className="font-semibold">{posts.length}</div>
                          <div className="text-sm text-muted-foreground">
                            Posts
                          </div>
                        </div>
                        <Separator orientation="vertical" />
                        <div>
                          <div className="font-semibold">
                            {userData?.photos?.length || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Photos
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-full mt-6 space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <MapPinIcon className="w-4 h-4 mr-2" />
                        {userData?.location || "No location"}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <LinkIcon className="w-4 h-4 mr-2" />
                        {userData?.website ? (
                          <a
                            href={
                              userData.website.startsWith("http")
                                ? userData.website
                                : `https://${userData.website}`
                            }
                            className="hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {userData.website}
                          </a>
                        ) : (
                          "No website"
                        )}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Joined {formattedDate}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                <TabsTrigger
                  value="posts"
                  className="flex items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 font-semibold"
                >
                  <FileTextIcon className="w-5 h-5" />
                  Posts
                </TabsTrigger>
                <TabsTrigger
                  value="photos"
                  className="flex items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 font-semibold"
                >
                  <Images className="w-5 h-5" />
                  Photos
                </TabsTrigger>
              </TabsList>
              <TabsContent value="posts" className="p-6">
                {renderPosts()}
              </TabsContent>
              <TabsContent value="photos" className="p-6">
                {userData?.photos && userData.photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {userData.photos.map((photo, index) => (
                      <Dialog key={index}>
                        <DialogTrigger asChild>
                          <div>
                            <img
                              src={photo.photoUrl}
                              alt={photo.title}
                              className="w-full h-auto rounded-lg rounded-b-none"
                            />
                            <div className="bg-black bg-opacity-90 border-t-2 border-white text-white p-2 rounded-b-lg">
                              <p>{photo.title}</p>
                              <p>
                                {new Date(photo.addedOn).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="w-full max-w-3xl p-4 flex flex-col gap-2 justify-center items-center">
                          <DialogTitle>{photo.title}</DialogTitle>
                          <DialogDescription>
                            {new Date(photo.addedOn).toLocaleDateString()}
                          </DialogDescription>
                          <img
                            src={photo.photoUrl}
                            alt="Full View"
                            className="max-w-full rounded-lg max-h-[80svh] max-w-[80vw]]"
                          />
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-muted-foreground">No Photos Added Yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <aside className="hidden lg:block">
          <WhoToFollow />
        </aside>
      </div>
    </div>
  );
}
