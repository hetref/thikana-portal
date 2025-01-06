"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
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
  MessageCircle,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
import { useSearchParams } from "next/navigation";
import { useGetUserPosts } from "@/hooks/useGetPosts";
import useGetUser from "@/hooks/useGetUser";
import { auth } from "@/lib/firebase";

export default function Profile() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") || user?.uid;
  console.log("userId" + userId);
  const userData = useGetUser(userId);
  console.log("userData" + userData);

  const { posts, loading, fetchMorePosts, hasMore, error } =
    useGetUserPosts(userId);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    location: "",
    website: "",
  });
  console.log(posts);
  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      setEditForm({
        name: userData?.username || "",
        bio: userData?.bio || "",
        location: userData?.location || "",
        website: userData?.website || "",
      });
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const handleEditSubmit = async () => {
    // TODO: Implement profile update logic
    setShowEditDialog(false);
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
            <div className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={userData?.profilePic || "/avatar.png"} />
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {userData?.fullname || "User"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(post.createdAt?.toDate()).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-2">{post.description || "No description"}</p>
                {post.image && (
                  <img
                    src={post.image}
                    alt="Post image"
                    className="mt-2 rounded-lg max-h-96 object-cover"
                  />
                )}
                <div className="flex justify-between items-center mt-4">
                  <div className="flex gap-2">
                    <HeartIcon className="w-6 h-6" />
                    <span className="text-sm text-muted-foreground">
                      {post.likes}
                    </span>
                    <span className="text-sm text-muted-foreground">Likes</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">
                      <MessageCircle className="w-6 h-6" />
                      {post.comments.length}
                      <span className="text-sm text-muted-foreground">
                        Comments
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              {/* //likes */}
            </div>
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

  return (
    <div className="flex items-center justify-center w-full">
      <div className="max-w-7xl w-full grid grid-cols-1 gap-0 py-8 lg:grid-cols-[300px_minmax(0,1fr)_300px] lg:gap-0.5">
        {/* Left Sidebar  */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <Sidebar />
          </div>
        </aside>

        {/* Main Content */}
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
                      {user.displayName || "User"}
                    </h1>
                    <p className="text-muted-foreground">{user.email}</p>
                    <p className="mt-2 text-sm">{user.bio || "No bio yet"}</p>

                    {/* Profile Stats */}
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

                    {/* Edit Profile Button */}
                    {userId === user.uid && (
                      <Button
                        className="w-full mt-4"
                        onClick={() => setShowEditDialog(true)}
                      >
                        <EditIcon className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    )}

                    {/* Location & Website */}
                    <div className="w-full mt-6 space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <MapPinIcon className="w-4 h-4 mr-2" />
                        {user.location || "No location"}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <LinkIcon className="w-4 h-4 mr-2" />
                        {user.website ? (
                          <a
                            href={
                              user.website.startsWith("http")
                                ? user.website
                                : `https://${user.website}`
                            }
                            className="hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {user.website}
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
                  <FileTextIcon className="w-4 h-4" />
                  Posts
                </TabsTrigger>
                <TabsTrigger
                  value="likes"
                  className="flex items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 font-semibold"
                >
                  <HeartIcon className="w-4 h-4" />
                  Likes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="mt-6">
                {error ? (
                  <div className="text-center py-8 text-destructive">
                    Error loading posts. Please try again later.
                  </div>
                ) : (
                  renderPosts()
                )}
              </TabsContent>

              <TabsContent value="likes" className="mt-6">
                <div className="text-center py-8 text-muted-foreground">
                  No liked posts to show
                </div>
              </TabsContent>
            </Tabs>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      name="name"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea
                      name="bio"
                      value={editForm.bio}
                      onChange={(e) =>
                        setEditForm({ ...editForm, bio: e.target.value })
                      }
                      className="min-h-[100px]"
                      placeholder="Tell us about yourself"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      name="location"
                      value={editForm.location}
                      onChange={(e) =>
                        setEditForm({ ...editForm, location: e.target.value })
                      }
                      placeholder="Where are you based?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      name="website"
                      value={editForm.website}
                      onChange={(e) =>
                        setEditForm({ ...editForm, website: e.target.value })
                      }
                      placeholder="Your personal website"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleEditSubmit}>Save Changes</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <WhoToFollow />
          </div>
        </aside>
      </div>
    </div>
  );
}
