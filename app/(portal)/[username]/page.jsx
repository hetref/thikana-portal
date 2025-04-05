"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileTextIcon,
  MapPinIcon,
  Loader2Icon,
  Images,
  SquareChartGantt,
  Globe,
  Minus,
  Plus,
  User,
  Calendar,
  Phone,
  Mail,
  Info,
  Settings,
  Home,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useGetUserPosts } from "@/hooks/useGetPosts";
import useGetUser from "@/hooks/useGetUser";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
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
} from "@/components/ui/dialog";
import Link from "next/link";
import ShowProductsTabContent from "@/components/profile/ShowProductsTabContent";
import Image from "next/image";
import MoreInformationDialog from "@/components/profile/MoreInformationDialog";
import FollowingDialog from "@/components/profile/FollowingDialog";
import FollowerDialog from "@/components/profile/FollowerDialog";
import ShareBusinessDialog from "@/components/profile/ShareBusinessDialog";
import RequestCallButton from "@/components/RequestCallButton";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import ShowServicesTabContent from "@/components/profile/ShowServicesTabContent";
import { sendNotificationToUser } from "@/lib/notifications";
import ShowBusinessProperties from "@/components/profile/ShowBusinessProperties";

// Add a style element to hide scrollbars
const scrollbarHideStyles = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

export default function UserProfile() {
  const router = useRouter();
  const params = useParams();
  const username = params.username;
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showLocationIFrame, setShowLocationIFrame] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Get the user ID from the search params or by looking up the username
  const paramUserId = searchParams.get("user");
  const [userId, setUserId] = useState(paramUserId);
  const userData = useGetUser(userId);
  const {
    posts,
    loading: postsLoading,
    fetchMorePosts,
    hasMore,
    error,
  } = useGetUserPosts(userId);

  // If we don't have a userId from search params, look it up by username
  useEffect(() => {
    const fetchUserIdByUsername = async () => {
      if (!username || paramUserId) return;
      try {
        const usernameDoc = await getDoc(doc(db, "usernames", username));
        if (usernameDoc.exists()) {
          const uid = usernameDoc.data().uid;
          setUserId(uid);
        }
      } catch (err) {
        console.error("Error fetching user by username:", err);
      }
    };

    fetchUserIdByUsername();
  }, [username, paramUserId]);

  // Check if the current user is logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      if (authUser) {
        // Redirect to /profile if the user is viewing their own profile
        if (userId === authUser.uid) {
          router.push("/profile");
        }
        setCurrentUser(authUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId, router]);

  // Fetch followers and following counts
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

  // Check if current user is following this profile
  useEffect(() => {
    if (!currentUser || !userId) return;

    const followingRef = collection(db, "users", currentUser.uid, "following");
    const unsubscribe = onSnapshot(followingRef, (snapshot) => {
      const isUserFollowing = snapshot.docs.some((doc) => doc.id === userId);
      setIsFollowing(isUserFollowing);
    });

    return () => unsubscribe();
  }, [currentUser, userId]);

  // Fetch user photos
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
          timestamp: doc.data().timestamp
            ? new Date(doc.data().timestamp)
            : null,
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
    if (hasMore && !postsLoading) {
      fetchMorePosts();
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !userId || followLoading) return;

    try {
      setFollowLoading(true);

      if (isFollowing) {
        // Unfollow logic
        await Promise.all([
          deleteDoc(doc(db, "users", userId, "followers", currentUser.uid)),
          deleteDoc(doc(db, "users", currentUser.uid, "following", userId)),
        ]);

        // Send notification to the business being unfollowed
        const currentUserData = await getDoc(doc(db, "users", currentUser.uid));
        const userData = currentUserData.exists()
          ? currentUserData.data()
          : null;
        const businessName =
          userData?.businessName || userData?.displayName || "Someone";

        await sendNotificationToUser(userId, {
          title: "Lost a Follower",
          message: `${businessName} has unfollowed you`,
          type: "follower",
          sender: "System",
          whatsapp: false,
          email: false,
        });

        toast.success("Unfollowed successfully");
      } else {
        // Follow logic
        await Promise.all([
          setDoc(doc(db, "users", userId, "followers", currentUser.uid), {
            uid: currentUser.uid,
            timestamp: new Date(),
          }),
          setDoc(doc(db, "users", currentUser.uid, "following", userId), {
            uid: userId,
            timestamp: new Date(),
          }),
        ]);

        // Send notification to the business being followed
        const currentUserData = await getDoc(doc(db, "users", currentUser.uid));
        const userData = currentUserData.exists()
          ? currentUserData.data()
          : null;
        const businessName =
          userData?.businessName || userData?.displayName || "Someone";

        await sendNotificationToUser(userId, {
          title: "New Follower",
          message: `${businessName} started following you`,
          type: "follower",
          sender: "System",
          whatsapp: false,
          email: false,
        });

        toast.success("Followed successfully");
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
      toast.error("Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const renderPosts = () => {
    if (postsLoading && !posts.length) {
      return (
        <div className="flex justify-center py-8">
          <Loader2Icon className="w-6 h-6 animate-spin text-primary/70" />
        </div>
      );
    }
    if (!postsLoading && !posts.length) {
      return (
        <div className="text-center py-12">
          <FileTextIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No posts yet.</p>
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
              disabled={postsLoading}
              className="rounded-full px-6"
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2Icon className="w-8 h-8 animate-spin text-primary/70" />
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }

  const formattedDate = userData?.createdAt
    ? new Date(userData.createdAt.toDate()).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="space-y-6 py-6">
      {/* Add style element for custom CSS */}
      <style jsx global>
        {scrollbarHideStyles}
      </style>

      {/* Profile Card */}
      <Card className="overflow-hidden bg-white border-0 shadow-sm">
        {/* Cover Image */}
        <div className="relative h-full w-full">
          <Dialog>
            <DialogTrigger className="z-30 w-full h-full">
              <Image
                src={userData?.coverPic || "/coverimg.png"}
                width={1000}
                height={1000}
                alt="Cover Image"
                className=" z-30 object-cover transition-opacity hover:opacity-95 border border-black/40 rounded-t-xl"
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
              <Avatar className="z-50 w-24 h-24 border-4 border-white shadow-md hover:shadow-lg transition-all cursor-pointer">
                <AvatarImage
                  src={userData?.profilePic || "/avatar.png"}
                  alt={userData?.name}
                />
                <AvatarFallback>
                  {userData?.businessName?.charAt(0) || "B"}
                </AvatarFallback>
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
              {formattedDate && (
                <div className="flex items-center text-gray-600 gap-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Joined {formattedDate}</span>
                </div>
              )}
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
              {currentUser && (
                <Button
                  onClick={handleFollowToggle}
                  variant={isFollowing ? "outline" : "default"}
                  className={
                    isFollowing ? "px-4" : "bg-black hover:bg-black/90 px-4"
                  }
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <>
                      <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                      {isFollowing ? "Unfollowing..." : "Following..."}
                    </>
                  ) : isFollowing ? (
                    <>
                      <Minus className="w-4 h-4 mr-2" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
              )}

              {userData?.role === "business" && (
                <>
                  {currentUser && userData && currentUser.uid !== userId && (
                    <RequestCallButton
                      businessId={userId}
                      businessName={userData.businessName}
                    />
                  )}

                  <Button
                    variant="outline"
                    className=""
                    onClick={() => setShowLocationIFrame(!showLocationIFrame)}
                  >
                    <MapPinIcon className="w-4 h-4 mr-1" />
                    Location
                  </Button>

                  {userData && <MoreInformationDialog userData={userData} />}

                  {userData && <ShareBusinessDialog userData={userData} />}

                  {userData?.website && (
                    <Button variant="outline" asChild className="px-3">
                      <Link
                        href={userData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Globe className="w-4 h-4 mr-1" />
                        Website
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-4 gap-4 divide-x divide-gray-200 rounded-lg border p-4 bg-gray-50">
            <FollowingDialog
              followingCount={followingCount}
              userId={userId}
              className="flex flex-col items-center"
            />
            <FollowerDialog
              followerCount={followersCount}
              userId={userId}
              className="flex flex-col items-center pl-4"
            />
            <div className="flex flex-col items-center pl-4">
              <div className="font-semibold text-gray-900">{posts.length}</div>
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

      {/* Content tabs */}
      <Card className="border-0 shadow-sm overflow-hidden bg-white">
        <Tabs defaultValue="posts" className="w-full">
          <div className="border-b">
            <TabsList className="justify-start h-auto p-0 bg-transparent overflow-x-auto scrollbar-hide whitespace-nowrap">
              <TabsTrigger
                value="posts"
                className={cn(
                  "rounded-none border-b-2 border-transparent",
                  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                  "px-6 py-3 font-medium text-sm transition-all duration-200"
                )}
              >
                <FileTextIcon className="w-4 h-4 mr-2" />
                Posts
              </TabsTrigger>
              <TabsTrigger
                value="photos"
                className={cn(
                  "rounded-none border-b-2 border-transparent",
                  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                  "px-6 py-3 font-medium text-sm transition-all duration-200"
                )}
              >
                <Images className="w-4 h-4 mr-2" />
                Photos
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className={cn(
                  "rounded-none border-b-2 border-transparent",
                  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                  "px-6 py-3 font-medium text-sm transition-all duration-200"
                )}
              >
                <SquareChartGantt className="w-4 h-4 mr-2" />
                Products
              </TabsTrigger>
              {userData?.business_categories?.includes("service") && (
                <TabsTrigger
                  value="services"
                  className={cn(
                    "rounded-none border-b-2 border-transparent",
                    "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                    "px-6 py-3 font-medium text-sm transition-all duration-200"
                  )}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Services
                </TabsTrigger>
              )}
              {userData?.business_categories?.includes("real-estate") && (
                <TabsTrigger
                  value="properties"
                  className={cn(
                    "rounded-none border-b-2 border-transparent",
                    "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                    "px-6 py-3 font-medium text-sm transition-all duration-200"
                  )}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Properties
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent
            value="posts"
            className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
          >
            {renderPosts()}
          </TabsContent>

          <TabsContent
            value="photos"
            className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
          >
            {loadingPhotos ? (
              <div className="flex justify-center py-10">
                <Loader2Icon className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : userPhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {userPhotos?.map((photo) => (
                  <Dialog key={photo.id}>
                    <DialogTrigger asChild>
                      <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group">
                        <div className="relative">
                          <Image
                            src={photo.photoUrl}
                            alt={photo.caption || "Business photo"}
                            width={500}
                            height={350}
                            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        {photo.caption && (
                          <div className="p-2 bg-white">
                            <p className="text-sm font-medium truncate">
                              {photo.caption}
                            </p>
                            <p className="text-xs text-gray-500">
                              {photo.timestamp
                                ? new Date(photo.timestamp).toLocaleDateString()
                                : ""}
                            </p>
                          </div>
                        )}
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl">
                      <DialogHeader>
                        <DialogTitle>
                          {photo.caption || "Business Photo"}
                        </DialogTitle>
                        <DialogDescription>
                          {photo.timestamp
                            ? new Date(photo.timestamp).toLocaleDateString()
                            : ""}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-2 rounded-md overflow-hidden">
                        <Image
                          src={photo.photoUrl}
                          width={800}
                          height={800}
                          alt={photo.caption || "Business photo"}
                          className="w-full object-contain max-h-[70vh]"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Images className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No photos available</p>
              </div>
            )}
          </TabsContent>

          {userData?.business_categories?.includes("product") && (
            <TabsContent
              value="products"
              className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
            >
              {userData && (
                <ShowProductsTabContent
                  userId={userId}
                  userData={userData}
                  isViewOnly={true}
                  currentUserView={false}
                />
              )}
            </TabsContent>
          )}

          {userData?.business_categories?.includes("service") && (
            <TabsContent
              value="services"
              className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
            >
              {userData && (
                <ShowServicesTabContent
                  userId={userId}
                  userData={userData}
                  isViewOnly={true}
                  currentUserView={false}
                />
              )}
            </TabsContent>
          )}

          {userData?.business_categories?.includes("real-estate") && (
            <TabsContent
              value="properties"
              className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
            >
              {userData && <ShowBusinessProperties businessId={userId} />}
            </TabsContent>
          )}
        </Tabs>
      </Card>
    </div>
  );
}
