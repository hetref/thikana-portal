"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EditIcon,
  FileTextIcon,
  HeartIcon,
  MapPinIcon,
  Loader2Icon,
  Images,
  SquareChartGantt,
  Globe,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
import { useGetUserPosts } from "@/hooks/useGetPosts";
import useGetUser from "@/hooks/useGetUser";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import ProfilePosts from "@/components/ProfilePosts";
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
  const userId = user?.uid;
  const userData = useGetUser(userId);
  const { posts, loading, fetchMorePosts, hasMore, error } =
    useGetUserPosts(userId);
  const [showLocationIFrame, setShowLocationIFrame] = useState(false);
  console.log("USERDATA", userData);

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

  const verifyEmailHandler = () => {
    if (user) {
      sendEmailVerification(user)
        .then(() => {
          toast.success("Email Verification Link Sent Sucessfully!");
          console.log("Email verification sent");
        })
        .catch((error) => {
          console.error("Error sending email verification:", error);
        });
    }
  };

  return (
    <div className="flex items-center justify-center w-full mt-16">
      <div className="max-w-7xl w-full flex justify-center gap-6">
        <main className="mx-auto w-full md:w-4/6 px-2 mt-[15px]">
          <div className="grid grid-cols-1 gap-6">
            <div className="w-full">
              <Card className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-12">
                      {/* <Avatar className="w-full h-full border">
                        <AvatarImage
                          src={userData?.coverPic || "/avatar.png"}
                        />
                      </Avatar> */}

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
                    
                    <div className="flex mt-4 gap-4 justify-center">
                      <Button asChild variant="outline" className="flex gap-2 items-center">
                        <Link href="/builder">
                          <EditIcon className="h-4 w-4" />
                          Edit Website
                        </Link>
                      </Button>
                      
                      <Button asChild variant="default" className="bg-blue-600 hover:bg-blue-700 flex gap-2 items-center">
                        <Link href="/website-builder">
                          <Globe className="h-4 w-4" />
                          Create Website
                        </Link>
                      </Button>
                    </div>
                    
                    <div className="w-full mt-6">
                      <div className="flex justify-between mb-4">
                        <FollowingDialog
                          followingCount={followingCount}
                          userId={userId && userId}
                        />
                        <Separator orientation="vertical" />
                        <FollowerDialog
                          followerCount={followersCount}
                          userId={userId && userId}
                        />
                        <Separator orientation="vertical" />
                        {/* <div>
                          <div className="font-semibold">{followersCount}</div>
                          <div className="text-sm text-muted-foreground">
                            Followers
                          </div>
                        </div>
                        <Separator orientation="vertical" /> */}
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
                    {/* {userId === user?.uid && ( */}
                    {/* <> */}
                    <div className="flex items-center w-full gap-2">
                      {userId === user?.uid && (
                        <Link
                          className="w-full flex items-center justify-center gap-2 bg-black/90 px-4 py-2 rounded-md text-white hover:bg-black transition-all ease-in-out duration-200"
                          href="/profile/settings"
                        >
                          <EditIcon className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Link>
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
                        {/* <Link href={userData?.website || "#"} target="_blank"> */}
                        <MapPinIcon className="w-4 h-4" />
                        {/* </Link> */}
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
                    {/* </> */}
                    {/* )} */}
                    {/* {userId === user?.uid && (
                      <>
                        <Link
                          className="w-full mt-4 flex items-center justify-center gap-2 bg-black/90 px-4 py-2 rounded-md text-white hover:bg-black transition-all ease-in-out duration-200"
                          href="/profile/settings"
                        >
                          <EditIcon className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Link>
                        {userData && (
                          <ProfileEditModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            currentUser={userData}
                          />
                        )}
                      </>
                    )} */}
                    {/* <div className="w-full mt-6 space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <MapPinIcon className="w-4 h-4 mr-2" />
                        {userData?.location ? (
                          <a
                            href={userData?.location || "#"}
                            className="hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {userData.location}
                          </a>
                        ) : (
                          "No location"
                        )}
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
                    </div> */}
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
                    value="likes"
                    className="flex items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-semibold text-sm sm:text-sm"
                  >
                    <HeartIcon className="w-5 h-5" />
                    Likes
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
                <TabsContent value="likes" className="p-6">
                  <div className="space-y-4">
                    {likedPosts.length === 0 && (
                      <div className="text-center">
                        <p className="text-muted-foreground">
                          No liked posts yet
                        </p>
                      </div>
                    )}
                    {likedPosts.map((post, index) => (
                      <Card key={index} className="p-4">
                        <ProfilePosts post={post} userData={userData} />
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="photos" className="p-6">
                  {userData?.photos && userData.photos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {userData.photos.map((photo, index) => (
                        <Dialog key={index}>
                          {/* Trigger for the Dialog */}
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
                          {/* Dialog Content */}
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
                  {/* <div className="space-y-4">
                  {likedPosts.map((post, index) => (
                    <Card key={index} className="p-4">
                      <ProfilePosts post={post} userData={userData} />
                    </Card>
                  ))}
                </div> */}
                  {/* TODO: Add the cart functionality */}
                  {userData && user && (
                    <ShowProductsTabContent
                      userId={userId}
                      userData={userData}
                    />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
        <aside className="hidden lg:block w-2/6">
          <WhoToFollow />
        </aside>
      </div>
    </div>
  );
}
