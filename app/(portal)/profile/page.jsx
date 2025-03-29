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
  Bookmark,
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
import { cn } from "@/lib/utils";

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
  const { posts, loading, fetchMorePosts, hasMore, error } =
    useGetUserPosts(userId);
  const [showLocationIFrame, setShowLocationIFrame] = useState(false);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loadingSavedPosts, setLoadingSavedPosts] = useState(false);
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

  // Add new useEffect for fetching saved posts
  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (!user?.uid) {
        console.log("No user ID available");
        return;
      }

      setLoadingSavedPosts(true);
      try {
        console.log("Fetching saved posts for user:", user.uid);
        const savedPostsRef = collection(db, "users", user.uid, "savedPosts");
        const unsubscribe = onSnapshot(
          savedPostsRef,
          async (snapshot) => {
            console.log("Saved posts snapshot size:", snapshot.size);
            const savedPostsData = await Promise.all(
              snapshot.docs.map(async (savedPostDoc) => {
                const postData = savedPostDoc.data();
                console.log("Saved post data:", postData);
                console.log("Post Author Name :", postData.authorName);
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
                console.log("Post not found:", postData.postId);
                return null;
              })
            );

            // Filter out any null values and sort by savedAt timestamp
            const validPosts = savedPostsData
              .filter((post) => post !== null)
              .sort((a, b) => b.savedAt?.toMillis() - a.savedAt?.toMillis());

            console.log("Valid saved posts:", validPosts);
            setSavedPosts(validPosts);
          },
          (error) => {
            console.error("Error in saved posts snapshot:", error);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching saved posts:", error);
        toast.error("Failed to load saved posts");
      } finally {
        setLoadingSavedPosts(false);
      }
    };

    fetchSavedPosts();
  }, [user?.uid]);

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
                    {/* <div className="flex items-center text-gray-600 gap-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Joined {formattedDate}</span>
                    </div>
                    {userData?.role === "business" && userData?.phone && (
                      <div className="flex items-center text-gray-600 gap-1">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{userData.phone}</span>
                      </div>
                    )} */}
                    {/* {userData?.role === "business" && userData?.email && (
                      <div className="flex items-center text-gray-600 gap-1">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{userData.email}</span>
                      </div>
                    )} */}
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
                  <FollowingDialog
                    followingCount={followingCount}
                    userId={userId && userId}
                    className="flex flex-col items-center cursor-pointer"
                  />
                  <FollowerDialog
                    followerCount={followersCount}
                    userId={userId && userId}
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
            {userEmailStatus() === true && (
              <Tabs defaultValue="posts" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto whitespace-nowrap sm:text-sm">
                  {userData?.role === "business" && (
                    <>
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
                    </>
                  )}
                  <TabsTrigger
                    value="saved"
                    className="flex items-center gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 font-semibold text-sm sm:text-sm"
                  >
                    <Bookmark className="w-5 h-5" />
                    Saved
                  </TabsTrigger>
                </TabsList>

                {userData?.role === "business" && (
                  <>
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
                                      {new Date(
                                        photo.addedOn
                                      ).toLocaleDateString()}
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
                          userId={userId}
                          userData={userData}
                        />
                      )}
                    </TabsContent>
                  </>
                )}

                <TabsContent value="saved" className="p-6">
                  {loadingSavedPosts ? (
                    <div className="flex justify-center py-8">
                      <Loader2Icon className="w-6 h-6 animate-spin" />
                    </div>
                  ) : savedPosts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No saved posts yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {savedPosts.map((post) => (
                        <Card
                          key={post.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <CardContent className="pt-6">
                            <div className="flex flex-col gap-4">
                              {/* Post Header */}
                              <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage
                                      src={
                                        post.authorProfileImage || "/avatar.png"
                                      }
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
                              </div>

                              {/* Post Content */}
                              <div className="space-y-4">
                                <p>
                                  {post.caption ||
                                    post.content ||
                                    post.description}
                                </p>
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
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex gap-2"
                                  >
                                    <Heart className="h-5 w-5" />
                                    <span>{post.likes || 0}</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex gap-2"
                                    onClick={() =>
                                      router.push(`/feed/${post.id}`)
                                    }
                                  >
                                    <MessageCircle className="h-5 w-5" />
                                    <span>{post.commentsCount || 0}</span>
                                  </Button>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(
                                    post.savedAt?.toDate()
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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
