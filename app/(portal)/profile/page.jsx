"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon,
  EditIcon,
  FileTextIcon,
  HeartIcon,
  LinkIcon,
  MapPinIcon,
  Loader2Icon,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
import { useGetUserPosts } from "@/hooks/useGetPosts";
import useGetUser from "@/hooks/useGetUser";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import ProfilePosts from "@/components/ProfilePosts";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [likedPosts, setLikedPosts] = useState([]);
  const userId = user?.uid;
  const userData = useGetUser(userId);
  const { posts, loading, fetchMorePosts, hasMore, error } =
    useGetUserPosts(userId);
  console.log("USERDATA", posts);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    location: "",
    website: "",
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (userData) {
      setEditForm({
        name: userData?.username || "",
        bio: userData?.bio || "",
        location: userData?.location || "",
        website: userData?.website || "",
      });
    }
  }, [userData]);

  const handleEditSubmit = async () => {
    // TODO: Implement profile update logic
    setShowEditDialog(true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
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
    if (loading && !posts.length) {
      return (
        <div className="flex justify-center py-8">
          <Loader2Icon className="w-6 h-6 animate-spin" />
        </div>
      );
    }
    if (!loading && !posts.length) {
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
              disabled={loading}
            >
              {loading ? (
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
        console.log("tempLikedPosts", tempLikedPosts);
        setLikedPosts(tempLikedPosts);
      },
      (error) => {
        console.error("Error fetching liked posts:", error);
      }
    );

    return () => unsubscribe(); // Cleanup subscription on unmount
  };

  useEffect(() => {
    getLikedPosts();
  }, [user]);

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
                    <Avatar className="w-24 h-24">
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
                          <div className="font-semibold">0</div>
                          <div className="text-sm text-muted-foreground">
                            Following
                          </div>
                        </div>
                        <Separator orientation="vertical" />
                        <div>
                          <div className="font-semibold">0</div>
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
                      </div>
                    </div>
                    {userId === user?.uid && (
                      <Button
                        className="w-full mt-4"
                        onClick={() => setShowEditDialog(true)}
                      >
                        <EditIcon className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    )}
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
                  value="likes"
                  className="flex items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 font-semibold"
                >
                  <HeartIcon className="w-5 h-5" />
                  Likes
                </TabsTrigger>
              </TabsList>
              <TabsContent value="posts" className="p-6">
                {renderPosts()}
              </TabsContent>
              <TabsContent value="likes" className="p-6">
                <div className="space-y-4">
                  {likedPosts.map((post, index) => (
                    <Card key={index} className="p-4">
                      <ProfilePosts post={post} userData={userData} />
                    </Card>
                  ))}
                </div>
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
