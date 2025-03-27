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
  EditIcon,
  SquareChartGantt,
  Globe,
  Minus,
  Plus,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
import { useSearchParams } from "next/navigation";
import { useGetUserPosts } from "@/hooks/useGetPosts";
import useGetUser from "@/hooks/useGetUser";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import ProfilePosts from "@/components/ProfilePosts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import Link from "next/link";
import ShowProductsTabContent from "@/components/profile/ShowProductsTabContent";
import Image from "next/image";
import { userEmailStatus } from "@/utils/userStatus";
import toast from "react-hot-toast";
import { sendEmailVerification } from "firebase/auth";
import MoreInformationDialog from "@/components/profile/MoreInformationDialog";
import FollowingDialog from "@/components/profile/FollowingDialog";
import FollowerDialog from "@/components/profile/FollowerDialog";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [likedPosts, setLikedPosts] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showLocationIFrame, setShowLocationIFrame] = useState(false);
  const searchParams = useSearchParams();
  const nuserId = searchParams.get("user");
  const userData = useGetUser(nuserId);
  const { posts, loading, fetchMorePosts, hasMore, error } =
    useGetUserPosts(nuserId);
  const [isFollowing, setIsFollowing] = useState(false);

  console.log("NUSERID", nuserId);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      if (authUser) {
        if (nuserId === authUser.uid) router.push("/profile");
        setUser(authUser);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!nuserId) return;
    if (nuserId === auth.currentUser?.uid) router.push("/profile");
    const followersRef = collection(db, "users", nuserId, "followers");
    const followingRef = collection(db, "users", nuserId, "following");

    const unsubscribeFollowers = onSnapshot(followersRef, (snapshot) => {
      setFollowersCount(snapshot.size);
      console.log("Followers count:", snapshot.size);
    });

    const unsubscribeFollowing = onSnapshot(followingRef, (snapshot) => {
      setFollowingCount(snapshot.size);
      console.log("Following count:", snapshot.size);
    });

    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
    };
  }, [nuserId]);

  useEffect(() => {
    if (!user || !nuserId) return;

    const followingRef = collection(db, "users", user.uid, "following");
    const unsubscribe = onSnapshot(followingRef, (snapshot) => {
      const isUserFollowing = snapshot.docs.some((doc) => doc.id === nuserId);
      setIsFollowing(isUserFollowing);
    });

    return () => unsubscribe();
  }, [user, nuserId]);

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

  const handleFollowToggle = async () => {
    if (!user || !nuserId) return;

    const userRef = doc(db, "users", user.uid, "following", nuserId);
    const nuserRef = doc(db, "users", nuserId, "followers", user.uid);

    try {
      if (isFollowing) {
        await Promise.all([deleteDoc(userRef), deleteDoc(nuserRef)]);
        setIsFollowing(false);
      } else {
        await Promise.all([
          setDoc(userRef, {
            uid: nuserId,
            timestamp: new Date(),
          }),
          setDoc(nuserRef, {
            uid: user.uid,
            timestamp: new Date(),
          }),
        ]);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error updating following status:", error);
    }
  };

  const verifyEmailHandler = () => {
    if (user) {
      sendEmailVerification(user)
        .then(() => {
          toast.success("Email Verification Link Sent Sucessfully!");
        })
        .catch((error) => {
          console.error("Error sending email verification:", error);
        });
    }
  };

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
          <div className="sticky">
            <Sidebar />
          </div>
        </aside>
        <main className="max-w-[580px] mx-auto w-full px-2">
          <div className="grid grid-cols-1 gap-6">
            <div className="w-full">
              <Card className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-12">
                      <Dialog>
                        <DialogTrigger>
                          <Image
                            src={userData?.coverPic || "/coverimg.png"}
                            width={2000}
                            height={2000}
                            alt="Cover Image"
                            className="w-full h-full object-cover"
                          />
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Cover Image</DialogTitle>
                            <DialogDescription className="pt-4">
                              <Image
                                src={userData?.coverPic || "/coverimg.png"}
                                width={2000}
                                height={2000}
                                alt="Cover Image"
                                className="w-full h-full object-cover"
                              />
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger>
                          <Avatar className="w-24 h-24 border absolute left-[50%] -translate-x-1/2 -translate-y-1/2">
                            <AvatarImage
                              src={userData?.profilePic || "/avatar.png"}
                            />
                          </Avatar>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Profile Image</DialogTitle>
                            <DialogDescription className="pt-4">
                              <Image
                                src={userData?.profilePic || "/avatar.png"}
                                width={2000}
                                height={2000}
                                alt="Profile Image"
                                className="w-full h-full object-cover"
                              />
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <h1 className="mt-4 text-2xl font-bold">
                      {userData?.businessName || "Business Name"}
                    </h1>
                    <h3 className="text-base font-semibold">
                      Owner - {userData?.name || "Name"}
                    </h3>
                    <p className="mt-2 text-sm">
                      {userData?.bio || "Amazing Bio..."}
                    </p>
                    <div className="w-full mt-6">
                      <div className="flex justify-between mb-4">
                        <FollowingDialog
                          followingCount={followingCount}
                          userId={nuserId && nuserId}
                        />
                        <Separator orientation="vertical" />
                        <FollowerDialog
                          followerCount={followersCount}
                          userId={nuserId && nuserId}
                        />
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
                    <div className="flex items-center w-full gap-2">
                      {nuserId === user?.uid && (
                        <Link
                          className="w-full flex items-center justify-center gap-2 bg-black/90 px-4 py-2 rounded-md text-white hover:bg-black transition-all ease-in-out duration-200"
                          href="/profile/settings"
                        >
                          <EditIcon className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Link>
                      )}
                      {nuserId !== user?.uid && (
                        <Button
                          onClick={handleFollowToggle}
                          className="w-full flex items-center justify-center gap-2 bg-black/90 px-4 py-2 rounded-md text-white hover:bg-black transition-all ease-in-out duration-200"
                        >
                          {isFollowing ? (
                            <Minus className="w-4 h-4" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          {isFollowing ? "Unfollow" : "Follow"}
                        </Button>
                      )}
                      <Button variant="ghost" asChild>
                        <Link href={userData?.website || "#"} target="_blank">
                          <Globe className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setShowLocationIFrame(!showLocationIFrame)
                        }
                      >
                        <MapPinIcon className="w-4 h-4" />
                      </Button>
                      {userData && (
                        <MoreInformationDialog userData={userData} />
                      )}
                    </div>
                    {showLocationIFrame && (
                      <div className="w-full mt-4">
                        <iframe
                          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7544.081477968485!2d73.08964204800337!3d19.017926421940366!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7e9d390c16fad%3A0x45a26096b6c171fd!2sKamothe%2C%20Panvel%2C%20Navi%20Mumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1739571469059!5m2!1sen!2sin"
                          style={{ border: "0" }}
                          allowFullScreen=""
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          className="w-full h-[200px] rounded-lg"
                        ></iframe>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            {userEmailStatus() === false && (
              <div className="w-full text-center text-lg">
                <p>Please verify your email to access the platform features.</p>
                <Button
                  onClick={verifyEmailHandler}
                  className="bg-emerald-800 mt-3"
                >
                  Verify Email
                </Button>
              </div>
            )}
            {userEmailStatus() === true && (
              <Tabs defaultValue="posts" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto whitespace-nowrap sm:text-sm">
                  <TabsTrigger
                    value="posts"
                    className="flex items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-semibold text-sm sm:text-sm"
                  >
                    <FileTextIcon className="w-5 h-5" />
                    Posts
                  </TabsTrigger>
                  <TabsTrigger
                    value="photos"
                    className="flex items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-semibold text-sm sm:text-sm"
                  >
                    <Images className="w-5 h-5" />
                    Photos
                  </TabsTrigger>
                  <TabsTrigger
                    value="products"
                    className="flex items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-semibold text-sm sm:text-sm"
                  >
                    <SquareChartGantt className="w-5 h-5" />
                    Products
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
                              <Image
                                width={1000}
                                height={1000}
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
                            <Image
                              width={1000}
                              height={1000}
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
                      <p className="text-muted-foreground">
                        No Photos Added Yet
                      </p>
                      <Button
                        className="mt-2"
                        onClick={() => {
                          /* Add photo logic */
                        }}
                      >
                        Add Photo
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="products" className="p-6">
                  {userData && user && (
                    <ShowProductsTabContent
                      userId={nuserId}
                      userData={userData}
                    />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
        <aside className="hidden lg:block">
          <WhoToFollow />
        </aside>
      </div>
    </div>
  );
}
