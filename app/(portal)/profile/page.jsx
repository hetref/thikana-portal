"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Settings,
  LayoutDashboard,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  FileText,
  BookText,
  InfoIcon,
  ShoppingCart,
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
  deleteDoc,
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
import { cn } from "@/lib/utils";
import ShowServicesTabContent from "@/components/profile/ShowServicesTabContent";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

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

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [likedPosts, setLikedPosts] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const userId = user?.uid;
  const [userData, setUserData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const { posts, loading, fetchMorePosts, hasMore, error } =
    useGetUserPosts(userId);
  const [showLocationIFrame, setShowLocationIFrame] = useState(false);
  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loadingSavedPosts, setLoadingSavedPosts] = useState(false);
  const [postToUnsave, setPostToUnsave] = useState(null);
  const [isUnsaveDialogOpen, setIsUnsaveDialogOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Authentication listener
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

  // Followers and following count listeners
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

  // User data listener
  useEffect(() => {
    if (!userId) {
      setLoadingUserData(false);
      return;
    }

    setLoadingUserData(true);
    const userRef = doc(db, "users", userId);
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setUserData({
            uid: userId,
            ...docSnap.data(),
          });
        } else {
          setUserData(null);
        }
        setLoadingUserData(false);
      },
      (error) => {
        console.error("Error fetching user data:", error);
        setLoadingUserData(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // User photos listener
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

  // Liked posts listener
  useEffect(() => {
    if (!user?.uid) return;

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
  }, [user?.uid]);

  // Saved posts listener
  useEffect(() => {
    if (!user?.uid) return;

    setLoadingSavedPosts(true);

    try {
      const savedPostsRef = collection(db, "users", user.uid, "savedPosts");
      const unsubscribe = onSnapshot(
        savedPostsRef,
        async (snapshot) => {
          const savedPostsData = await Promise.all(
            snapshot.docs.map(async (savedPostDoc) => {
              const postData = savedPostDoc.data();
              const postRef = doc(db, "posts", postData.postId);
              const postDoc = await getDoc(postRef);

              if (postDoc.exists()) {
                return {
                  ...postDoc.data(),
                  id: postDoc.id,
                  savedAt: postData.timestamp,
                  authorName: postData.authorName,
                  authorProfileImage: postData.authorProfileImage,
                  authorUsername: postData.authorUsername,
                };
              }
              return null;
            })
          );

          // Filter out any null values and sort by savedAt timestamp
          const validPosts = savedPostsData
            .filter(Boolean)
            .sort((a, b) => b.savedAt?.toMillis() - a.savedAt?.toMillis());

          setSavedPosts(validPosts);
          setLoadingSavedPosts(false);
        },
        (error) => {
          console.error("Error in saved posts snapshot:", error);
          setLoadingSavedPosts(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching saved posts:", error);
      toast.error("Failed to load saved posts");
      setLoadingSavedPosts(false);
    }
  }, [user?.uid]);

  // Orders listener
  useEffect(() => {
    if (!user?.uid) return;

    setLoadingOrders(true);
    const fetchOrders = async () => {
      try {
        // Fetch user's orders
        const ordersRef = collection(db, "users", user.uid, "orders");
        const ordersQuery = query(ordersRef, orderBy("timestamp", "desc"));
        const orderDocs = await getDocs(ordersQuery);

        if (orderDocs.empty) {
          setOrders([]);
          setLoadingOrders(false);
          return;
        }

        // Process each order
        const ordersData = orderDocs.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }));

        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("Failed to load orders");
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [user?.uid]);

  // Memoized handlers
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchMorePosts();
    }
  }, [hasMore, loading, fetchMorePosts]);

  const toggleLocationIFrame = useCallback(() => {
    setShowLocationIFrame((prev) => !prev);
  }, []);

  const openAddPhotoModal = useCallback(() => {
    setIsAddPhotoModalOpen(true);
  }, []);

  const closeAddPhotoModal = useCallback(() => {
    setIsAddPhotoModalOpen(false);
  }, []);

  const handleUnsavePost = useCallback(
    async (postId) => {
      if (!user?.uid) return;

      try {
        const savedPostRef = doc(db, "users", user.uid, "savedPosts", postId);
        await deleteDoc(savedPostRef);
        toast.success("Post unsaved successfully");
      } catch (error) {
        console.error("Error unsaving post:", error);
        toast.error("Failed to unsave post");
      }
    },
    [user?.uid]
  );

  const prepareUnsave = useCallback((postId) => {
    setPostToUnsave(postId);
    setIsUnsaveDialogOpen(true);
  }, []);

  const confirmUnsave = useCallback(() => {
    if (postToUnsave) {
      handleUnsavePost(postToUnsave);
      setPostToUnsave(null);
    }
  }, [postToUnsave, handleUnsavePost]);

  const verifyEmailHandler = useCallback(() => {
    if (user) {
      sendEmailVerification(user)
        .then(() => {
          toast.success("Email Verification Link Sent Successfully!");
        })
        .catch((error) => {
          console.error("Error sending email verification:", error);
          toast.error("Failed to send verification email");
        });
    }
  }, [user]);

  // Memoized values
  const formattedDate = useMemo(() => {
    if (!user?.metadata?.creationTime) return "";
    return new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [user?.metadata?.creationTime]);

  const isBusinessUser = useMemo(() => {
    if (!userData) return null;
    return userData?.role === "business";
  }, [userData]);

  const isCurrentUser = useMemo(() => {
    return userId === user?.uid;
  }, [userId, user?.uid]);

  const isEmailVerified = useMemo(() => {
    return userEmailStatus() === true;
  }, []);

  // Memoized UI components
  const renderPosts = useMemo(() => {
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
  }, [posts, loading, hasMore, handleLoadMore, userData]);

  const renderEmptyState = useCallback((icon, message) => {
    const Icon = icon;
    return (
      <div className="text-center py-12">
        <Icon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    );
  }, []);

  const renderLoading = useCallback(
    () => (
      <div className="flex justify-center py-10">
        <Loader2Icon className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    ),
    []
  );

  const renderSavedPostCard = useCallback(
    (post) => (
      <Card
        key={post.id}
        className="cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
      >
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Post Header */}
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={post.authorProfileImage || "/avatar.png"}
                    alt={post.authorName || "User"}
                  />
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {post.authorName || "Anonymous"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{post.authorUsername || "user"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => prepareUnsave(post.id)}
                className="text-primary hover:text-primary/80"
              >
                <Bookmark className="h-5 w-5 fill-current" />
              </Button>
            </div>

            {/* Post Content */}
            <div className="space-y-4">
              <p>{post.caption || post.content || post.description}</p>
              {post.mediaUrl && (
                <div className="relative rounded-lg overflow-hidden bg-muted">
                  <div className="relative aspect-[16/9]">
                    <img
                      src={post.mediaUrl}
                      alt="Post content"
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Post Actions */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-4">
                <Button variant="ghost" size="sm" className="flex gap-2">
                  <Heart className="h-5 w-5" />
                  <span>{post.likes || 0}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex gap-2"
                  onClick={() => router.push(`/feed/${post.id}`)}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>{post.commentsCount || 0}</span>
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {post.savedAt?.toDate &&
                  new Date(post.savedAt.toDate()).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    ),
    [prepareUnsave, router]
  );

  return (
    <div className="min-h-screen">
      {/* Add style element for custom CSS */}
      <style jsx global>
        {scrollbarHideStyles}
      </style>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <main className="flex-1 space-y-6">
            {loadingUserData || isBusinessUser === null ? (
              <div className="flex justify-center items-center h-[400px]">
                <Loader2Icon className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Profile Card */}
                <Card className="overflow-hidden bg-white border-0 shadow-sm">
                  {/* Cover Image */}
                  <div className="relative h-full w-full">
                    {isBusinessUser && (
                      <Dialog>
                        <DialogTrigger className="z-30 w-full h-full">
                          <Image
                            src={userData?.coverPic || "/coverimg.png"}
                            width={1000}
                            height={1000}
                            alt="Cover Image"
                            className="z-30 object-cover transition-opacity hover:opacity-95 border border-black/40 rounded-t-xl"
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
                    )}

                    {/* Profile picture positioned over cover image */}
                    <Dialog>
                      <DialogTrigger
                        className={`${isBusinessUser ? "absolute bottom-0 left-8 transform translate-y-1/2" : "flex justify-center w-full my-4"}`}
                      >
                        <Avatar className="z-50 w-24 h-24 border-4 border-white shadow-md hover:shadow-lg transition-all cursor-pointer">
                          <AvatarImage
                            src={userData?.profilePic || "/avatar.png"}
                            alt={userData?.name}
                          />
                          <AvatarFallback>
                            {isBusinessUser
                              ? userData?.businessName?.charAt(0) || "B"
                              : userData?.name?.charAt(0) || "U"}
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
                  <div
                    className={`${isBusinessUser ? "pt-16" : "pt-4"} px-4 sm:px-6 pb-6`}
                  >
                    <div className="flex flex-col md:items-start md:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <h1 className="text-2xl font-bold text-gray-900">
                          {isBusinessUser
                            ? userData?.businessName
                            : userData?.name}
                        </h1>
                        <div className="flex items-center text-gray-600 gap-1">
                          <User className="w-4 h-4" />
                          <span>{userData?.username}</span>
                        </div>
                        {isBusinessUser && (
                          <p className="text-gray-700 mt-2">
                            {userData?.bio || "Amazing Bio..."}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex w-full gap-2 mt-3 md:mt-0">
                        {isCurrentUser && (
                          <Button
                            asChild
                            variant="default"
                            className="bg-black hover:bg-black/90 px-4 w-full"
                          >
                            <Link
                              href={
                                isBusinessUser
                                  ? "/profile/settings"
                                  : "/profile/settings/user"
                              }
                            >
                              <EditIcon className="w-4 h-4 mr-2" />
                              Edit Profile
                            </Link>
                          </Button>
                        )}

                        {isCurrentUser && isBusinessUser && (
                          <Button
                            asChild
                            variant="default"
                            className="bg-primary hover:bg-primary/90 px-4 w-full"
                          >
                            <Link href="/dashboard">
                              <LayoutDashboard className="w-4 h-4 mr-2" />
                              Dashboard
                            </Link>
                          </Button>
                        )}

                        {isBusinessUser && (
                          <>
                            <Button
                              variant="outline"
                              onClick={toggleLocationIFrame}
                            >
                              <MapPinIcon className="w-4 h-4 mr-1" />
                              Location
                            </Button>

                            {userData && (
                              <MoreInformationDialog userData={userData} />
                            )}

                            <ShareBusinessDialog userData={userData} />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="mt-6 grid grid-cols-4 gap-4 divide-x divide-gray-200 rounded-lg border p-4 bg-gray-50">
                      {isBusinessUser ? (
                        <>
                          <FollowingDialog
                            followingCount={followingCount}
                            userId={userId}
                            className="flex flex-col items-center cursor-pointer"
                          />
                          <FollowerDialog
                            followerCount={followersCount}
                            userId={userId}
                            className="flex flex-col items-center pl-4 cursor-pointer"
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
                        </>
                      ) : (
                        <div className="col-span-4 flex justify-center">
                          <FollowingDialog
                            followingCount={followingCount}
                            userId={userId}
                            className="flex flex-col items-center cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    {/* Location map */}
                    {showLocationIFrame && isBusinessUser && (
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
                {!isEmailVerified && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 shadow-sm">
                    <div className="flex flex-col items-center text-center">
                      <p className="text-amber-800 mb-3">
                        Please verify your email to access all platform
                        features.
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
                {isEmailVerified && isBusinessUser && (
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
                            value="likes"
                            className={cn(
                              "rounded-none border-b-2 border-transparent",
                              "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                              "px-6 py-3 font-medium text-sm transition-all duration-200"
                            )}
                          >
                            <HeartIcon className="w-4 h-4 mr-2" />
                            Likes
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
                          {userData?.business_categories?.includes(
                            "product"
                          ) && (
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
                          )}
                          {userData?.business_categories?.includes(
                            "service"
                          ) && (
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
                          <TabsTrigger
                            value="saved"
                            className={cn(
                              "rounded-none border-b-2 border-transparent",
                              "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                              "px-6 py-3 font-medium text-sm transition-all duration-200"
                            )}
                          >
                            <Bookmark className="w-4 h-4 mr-2" />
                            Saved
                          </TabsTrigger>
                          <TabsTrigger
                            value="orders"
                            className={cn(
                              "rounded-none border-b-2 border-transparent",
                              "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                              "px-6 py-3 font-medium text-sm transition-all duration-200"
                            )}
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Orders
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent
                        value="posts"
                        className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
                      >
                        {renderPosts}
                      </TabsContent>

                      <TabsContent
                        value="likes"
                        className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
                      >
                        <div className="space-y-4">
                          {likedPosts.length === 0
                            ? renderEmptyState(Heart, "No liked posts yet")
                            : likedPosts.map((post, index) => (
                                <Card
                                  key={index}
                                  className="cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
                                >
                                  <CardContent className="pt-6">
                                    <ProfilePosts
                                      post={post}
                                      userData={userData}
                                    />
                                  </CardContent>
                                </Card>
                              ))}
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="photos"
                        className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
                      >
                        {userData && (
                          <>
                            {loadingPhotos ? (
                              renderLoading()
                            ) : (
                              <>
                                <PhotosGrid
                                  photos={userPhotos}
                                  userId={userData.uid}
                                  onPhotoDeleted={() => {}}
                                  onAddPhoto={openAddPhotoModal}
                                />
                                {auth.currentUser && (
                                  <AddPhotoModal
                                    isOpen={isAddPhotoModalOpen}
                                    onClose={closeAddPhotoModal}
                                    userId={auth.currentUser.uid}
                                  />
                                )}
                              </>
                            )}
                          </>
                        )}
                      </TabsContent>

                      {userData?.business_categories?.includes("product") && (
                        <TabsContent
                          value="products"
                          className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
                        >
                          {userData && user && (
                            <ShowProductsTabContent
                              userId={userId}
                              userData={userData}
                              currentUserView={true}
                            />
                          )}
                        </TabsContent>
                      )}

                      {userData?.business_categories?.includes("service") && (
                        <TabsContent
                          value="services"
                          className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
                        >
                          {userData && user && (
                            <ShowServicesTabContent
                              userId={userId}
                              userData={userData}
                            />
                          )}
                        </TabsContent>
                      )}

                      <TabsContent
                        value="saved"
                        className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
                      >
                        <div className="space-y-4">
                          {loadingSavedPosts
                            ? renderLoading()
                            : savedPosts.length === 0
                              ? renderEmptyState(Bookmark, "No saved posts yet")
                              : savedPosts.map(renderSavedPostCard)}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </Card>
                )}

                {/* Saved Posts tab for regular users */}
                {isEmailVerified && !isBusinessUser && (
                  <Card className="border-0 shadow-sm overflow-hidden bg-white">
                    <Tabs defaultValue="saved" className="w-full">
                      <div className="border-b">
                        <TabsList className="justify-start h-auto p-0 bg-transparent overflow-x-auto scrollbar-hide whitespace-nowrap">
                          <TabsTrigger
                            value="saved"
                            className={cn(
                              "rounded-none border-b-2 border-transparent",
                              "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                              "px-6 py-3 font-medium text-sm transition-all duration-200"
                            )}
                          >
                            <Bookmark className="w-4 h-4 mr-2" />
                            Saved Posts
                          </TabsTrigger>
                          <TabsTrigger
                            value="likes"
                            className={cn(
                              "rounded-none border-b-2 border-transparent",
                              "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                              "px-6 py-3 font-medium text-sm transition-all duration-200"
                            )}
                          >
                            <HeartIcon className="w-4 h-4 mr-2" />
                            Likes
                          </TabsTrigger>
                          <TabsTrigger
                            value="orders"
                            className={cn(
                              "rounded-none border-b-2 border-transparent",
                              "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                              "px-6 py-3 font-medium text-sm transition-all duration-200"
                            )}
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Orders
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent
                        value="saved"
                        className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
                      >
                        <div className="space-y-4">
                          {loadingSavedPosts
                            ? renderLoading()
                            : savedPosts.length === 0
                              ? renderEmptyState(Bookmark, "No saved posts yet")
                              : savedPosts.map(renderSavedPostCard)}
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="likes"
                        className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
                      >
                        <div className="space-y-4">
                          {likedPosts.length === 0
                            ? renderEmptyState(Heart, "No liked posts yet")
                            : likedPosts.map((post, index) => (
                                <Card
                                  key={index}
                                  className="cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
                                >
                                  <CardContent className="pt-6">
                                    <ProfilePosts
                                      post={post}
                                      userData={userData}
                                    />
                                  </CardContent>
                                </Card>
                              ))}
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="orders"
                        className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
                      >
                        {loadingOrders ? (
                          renderLoading()
                        ) : orders.length === 0 ? (
                          renderEmptyState(ShoppingCart, "No orders yet")
                        ) : (
                          <div className="space-y-6">
                            <div className="flex justify-between items-center mb-4">
                              <h2 className="text-lg font-semibold">
                                Your Orders
                              </h2>
                            </div>

                            {orders.map((order) => (
                              <Card key={order.id} className="overflow-hidden">
                                <CardHeader className="bg-gray-50 py-3">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                    <div>
                                      <div className="flex items-center">
                                        <h3 className="font-medium text-sm sm:text-base">
                                          Order #{order.orderId.substring(0, 8)}
                                          ...
                                        </h3>
                                        <Badge
                                          variant={
                                            order.status === "completed"
                                              ? "success"
                                              : "outline"
                                          }
                                          className="ml-2"
                                        >
                                          {order.status === "completed"
                                            ? "Completed"
                                            : order.status}
                                        </Badge>
                                      </div>
                                      <p className="text-xs sm:text-sm text-muted-foreground">
                                        {format(
                                          new Date(order.timestamp),
                                          "MMM d, yyyy · h:mm a"
                                        )}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-sm sm:text-base">
                                        ₹{order.amount?.toFixed(2)}
                                      </p>
                                      <p className="text-xs sm:text-sm text-muted-foreground">
                                        {order.businessName}
                                      </p>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                  <div className="px-4 py-3 border-b">
                                    <div className="flex justify-between items-center">
                                      <h4 className="text-sm font-medium">
                                        Items
                                      </h4>
                                      <span className="text-xs text-muted-foreground">
                                        {order.products?.length || 0} item(s)
                                      </span>
                                    </div>
                                  </div>
                                  <div className="divide-y">
                                    {order.products?.map((product, idx) => (
                                      <div
                                        key={idx}
                                        className="p-4 flex items-center gap-3"
                                      >
                                        <div className="relative w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                          {product.imageUrl ? (
                                            <Image
                                              src={product.imageUrl}
                                              alt={product.productName}
                                              fill
                                              className="object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                              <Package className="w-6 h-6" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-grow">
                                          <h5 className="font-medium text-sm">
                                            {product.productName}
                                          </h5>
                                          <div className="flex items-center text-sm text-muted-foreground">
                                            <span>
                                              ₹{product.amount?.toFixed(2)} ×{" "}
                                              {product.quantity}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-medium">
                                            ₹
                                            {(
                                              product.amount * product.quantity
                                            ).toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="border-t p-4 bg-gray-50">
                                    <div className="flex justify-between">
                                      <span className="text-sm font-medium">
                                        Total
                                      </span>
                                      <span className="font-semibold">
                                        ₹{order.amount?.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </Card>
                )}
              </>
            )}
          </main>

          {/* Right sidebar */}
          <aside className="hidden lg:block lg:w-80 space-y-6">
            <WhoToFollow />
          </aside>
        </div>
      </div>

      {/* Confirmation Dialog for Unsaving Posts */}
      <AlertDialog
        open={isUnsaveDialogOpen}
        onOpenChange={setIsUnsaveDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsave Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this post from your saved posts?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnsave}>
              Unsave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
