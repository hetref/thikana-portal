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
  Heart,
  MessageCircle,
  Share2,
  Calendar,
  User,
  Bookmark,
  Info,
  Mail,
  Phone,
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
  onSnapshot,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
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
import PhotosGrid from "@/components/PhotosGrid";
import AddPhotoModal from "@/components/AddPhotoModal";
import ShareBusinessDialog from "@/components/profile/ShareBusinessDialog";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [likedPosts, setLikedPosts] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const userId = user?.uid;
  const [userData, setUserData] = useState(null);
  const { posts, loading, fetchMorePosts, hasMore, error } =
    useGetUserPosts(userId);
  const [showLocationIFrame, setShowLocationIFrame] = useState(false);
  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
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

  // Fetch user data with photos
  useEffect(() => {
    if (!userId) return;

    // Set up listener for real-time updates
    const userRef = doc(db, "users", userId);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUserData({
          uid: userId,
          ...userData,
        });
      } else {
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // Fetch user photos from subcollection
  useEffect(() => {
    if (!userId) return;

    setLoadingPhotos(true);
    const photosRef = collection(db, "users", userId, "photos");
    const photosQuery = query(photosRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(
      photosQuery,
      (snapshot) => {
        const photos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUserPhotos(photos);
        setLoadingPhotos(false);
      },
      (error) => {
        console.error("Error fetching photos:", error);
        setLoadingPhotos(false);
      }
    );

    return () => unsubscribe();
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
        <div className="text-center py-12">
          <FileTextIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No posts yet. Share your first update!
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <Card
            key={post.id}
            className="cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
          >
            <CardContent className="pt-6">
              <ProfilePosts post={post} userData={userData} />
            </CardContent>
          </Card>
        ))}
        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loading}
              className="rounded-full px-6"
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <main className="flex-1 space-y-6">
            {/* Profile Card */}
            <Card className="overflow-hidden bg-white border-0 shadow-sm">
              {/* Cover Image */}
              <div className="relative h-48 sm:h-64 md:h-72 bg-gradient-to-r from-blue-50 to-indigo-50">
                <Dialog>
                  <DialogTrigger className="w-full h-full">
                    <Image
                      src={userData?.coverPic || "/coverimg.png"}
                      fill
                      alt="Cover Image"
                      className="object-cover transition-opacity hover:opacity-95"
                      priority
                    />
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Cover Image</DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 rounded-md overflow-hidden">
                      <Image
                        src={userData?.coverPic || "/coverimg.png"}
                        width={1200}
                        height={600}
                        alt="Cover Image"
                        className="w-full object-cover rounded-md"
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Profile picture positioned over cover image */}
                <Dialog>
                  <DialogTrigger className="absolute bottom-0 left-8 transform translate-y-1/2">
                    <Avatar className="w-24 h-24 border-4 border-white shadow-md hover:shadow-lg transition-all cursor-pointer">
                      <AvatarImage
                        src={userData?.profilePic || "/avatar.png"}
                        alt={userData?.name}
                      />
                    </Avatar>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Profile Picture</DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 rounded-md overflow-hidden">
                      <Image
                        src={userData?.profilePic || "/avatar.png"}
                        width={400}
                        height={400}
                        alt="Profile Image"
                        className="w-full object-cover rounded-md"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Profile info */}
              <div className="pt-16 px-4 sm:px-6 pb-6">
                <div className="flex flex-col md:items-start md:justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {userData?.businessName || "Business Name"}
                    </h1>
                    <div className="flex items-center text-gray-600 gap-1">
                      <User className="w-4 h-4" />
                      <span>{userData?.name || "Owner Name"}</span>
                    </div>
                    <div className="flex items-center text-gray-600 gap-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Joined {formattedDate}</span>
                    </div>
                    {userData?.role === "business" && userData?.phone && (
                      <div className="flex items-center text-gray-600 gap-1">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{userData.phone}</span>
                      </div>
                    )}
                    {userData?.role === "business" && userData?.email && (
                      <div className="flex items-center text-gray-600 gap-1">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{userData.email}</span>
                      </div>
                    )}
                    <p className="text-gray-700 mt-2">
                      {userData?.bio || "Amazing Bio..."}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex w-full gap-2 mt-3 md:mt-0">
                    {userId === user?.uid && (
                      <Button
                        asChild
                        variant="default"
                        className="bg-black hover:bg-black/90 px-4 w-full"
                      >
                        <Link href="/profile/settings">
                          <EditIcon className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Link>
                      </Button>
                    )}

                    {userData?.role === "business" && (
                      <>
                        <Button
                          variant="outline"
                          className=""
                          onClick={() =>
                            setShowLocationIFrame(!showLocationIFrame)
                          }
                        >
                          <MapPinIcon className="w-4 h-4 mr-1" />
                          Location
                        </Button>

                        <ShareBusinessDialog userData={userData} />

                        {userData && (
                          <MoreInformationDialog userData={userData} />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-6 grid grid-cols-4 gap-4 divide-x divide-gray-200 rounded-lg border p-4 bg-gray-50">
                  <FollowingDialog
                    followingCount={followingCount}
                    userId={userId && userId}
                    className="flex flex-col items-center"
                  />
                  <FollowerDialog
                    followerCount={followersCount}
                    userId={userId && userId}
                    className="flex flex-col items-center pl-4"
                  />
                  <div className="flex flex-col items-center pl-4">
                    <div className="font-semibold text-gray-900">
                      {posts.length}
                    </div>
                    <div className="text-sm text-gray-600">Posts</div>
                  </div>
                  <div className="flex flex-col items-center pl-4">
                    <div className="font-semibold text-gray-900">
                      {userPhotos.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Photos</div>
                  </div>
                </div>

                {/* Location map */}
                {showLocationIFrame && userData?.role === "business" && (
                  <div className="mt-6 rounded-lg border overflow-hidden bg-white shadow-sm">
                    <div className="p-4 border-b">
                      <h3 className="font-medium flex items-center gap-2 text-gray-900">
                        <MapPinIcon className="w-4 h-4" />
                        Business Location
                      </h3>
                      {userData?.locations?.address ? (
                        <div className="mt-1 text-sm text-gray-600">
                          {userData.locations.address}
                        </div>
                      ) : null}
                    </div>
                    <iframe
                      src={
                        userData?.locations?.mapUrl ||
                        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7544.081477968485!2d73.08964204800337!3d19.017926421940366!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7e9d390c16fad%3A0x45a26096b6c171fd!2sKamothe%2C%20Panvel%2C%20Navi%20Mumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1739571469059!5m2!1sen!2sin"
                      }
                      style={{ border: "0" }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="w-full h-[300px]"
                    ></iframe>
                  </div>
                )}
              </div>
            </Card>

            {/* Email verification warning */}
            {userEmailStatus() === false && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <p className="text-amber-800 mb-3">
                    Please verify your email to access all platform features.
                  </p>
                  <Button
                    onClick={verifyEmailHandler}
                    className="bg-amber-600 hover:bg-amber-700 rounded-full px-6"
                  >
                    Verify Email
                  </Button>
                </div>
              </div>
            )}

            {/* Content tabs for business users */}
            {userEmailStatus() === true && userData?.role === "business" && (
              <Card className="border-0 shadow-sm overflow-hidden bg-white">
                <Tabs defaultValue="posts" className="w-full">
                  <div className="border-b">
                    <TabsList className="justify-start h-auto p-0 bg-transparent overflow-x-auto whitespace-nowrap">
                      <TabsTrigger
                        value="posts"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 font-medium text-sm"
                      >
                        <FileTextIcon className="w-4 h-4 mr-2" />
                        Posts
                      </TabsTrigger>
                      <TabsTrigger
                        value="likes"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 font-medium text-sm"
                      >
                        <HeartIcon className="w-4 h-4 mr-2" />
                        Likes
                      </TabsTrigger>
                      <TabsTrigger
                        value="photos"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 font-medium text-sm"
                      >
                        <Images className="w-4 h-4 mr-2" />
                        Photos
                      </TabsTrigger>
                      <TabsTrigger
                        value="products"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 font-medium text-sm"
                      >
                        <SquareChartGantt className="w-4 h-4 mr-2" />
                        Products
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="posts" className="p-6 focus:outline-none">
                    {renderPosts()}
                  </TabsContent>

                  <TabsContent value="likes" className="p-6 focus:outline-none">
                    <div className="space-y-4">
                      {likedPosts.length === 0 ? (
                        <div className="text-center py-10">
                          <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-muted-foreground">
                            No liked posts yet
                          </p>
                        </div>
                      ) : (
                        likedPosts.map((post, index) => (
                          <Card
                            key={index}
                            className="p-4 hover:shadow-md transition-shadow border border-gray-100"
                          >
                            <ProfilePosts post={post} userData={userData} />
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="photos"
                    className="p-6 focus:outline-none"
                  >
                    {userData && (
                      <>
                        {loadingPhotos ? (
                          <div className="flex justify-center py-10">
                            <Loader2Icon className="w-8 h-8 animate-spin text-gray-400" />
                          </div>
                        ) : (
                          <>
                            <PhotosGrid
                              photos={userPhotos}
                              userId={userData.uid}
                              onPhotoDeleted={(photoId) => {
                                // We don't need to update local state - snapshot will handle it
                              }}
                              onAddPhoto={() => setIsAddPhotoModalOpen(true)}
                            />
                            {auth.currentUser && (
                              <AddPhotoModal
                                isOpen={isAddPhotoModalOpen}
                                onClose={() => setIsAddPhotoModalOpen(false)}
                                userId={auth.currentUser.uid}
                              />
                            )}
                          </>
                        )}
                      </>
                    )}
                  </TabsContent>

                  <TabsContent
                    value="products"
                    className="p-6 focus:outline-none"
                  >
                    {userData && user && (
                      <ShowProductsTabContent
                        userId={userId}
                        userData={userData}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            )}
          </main>

          {/* Right sidebar */}
          <aside className="hidden lg:block lg:w-80 space-y-6">
            <WhoToFollow />
          </aside>
        </div>
      </div>
    </div>
  );
}
