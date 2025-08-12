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
  X,
  ChevronLeft,
  ChevronRight,
  Home,
} from "lucide-react";
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
  DialogClose,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSidebar } from "@/lib/context/SidebarContext";

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
  const userId = params.username; // Use username param directly as userId
  const { setRightSidebarContent } = useSidebar();
  const [currentUser, setCurrentUser] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showLocationIFrame, setShowLocationIFrame] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(""); // YYYY-MM-DD
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedStart, setSelectedStart] = useState(""); // HH:MM
  const [multiplier, setMultiplier] = useState(1);
  const [computedEnd, setComputedEnd] = useState(""); // HH:MM
  const [bookingDescription, setBookingDescription] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  const userData = useGetUser(userId);

  // Set right sidebar content
  useEffect(() => {
    if (userData?.role === "business") {
      const sidebarContent = (
        <div className="space-y-6">
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => setShowLocationIFrame(!showLocationIFrame)}
                className="w-full justify-start gap-3 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              >
                <MapPinIcon className="w-4 h-4" />
                {showLocationIFrame ? "Hide Location" : "Show Location"}
              </Button>

              <MoreInformationDialog
                userData={userData}
                buttonClassName="w-full justify-start gap-3 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              />

              <ShareBusinessDialog
                userData={userData}
                buttonText="Share Business"
                buttonClassName="w-full justify-start gap-3 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              />

              {currentUser && currentUser.uid !== userId && (
                <RequestCallButton
                  businessId={userId}
                  businessName={userData.businessName}
                  variant="outline"
                  className="w-full justify-start gap-3 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                />
              )}

              {userData?.website && (
                <Button
                  variant="outline"
                  asChild
                  className="w-full justify-start gap-3 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                >
                  <Link
                    href={userData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="w-4 h-4" />
                    Visit Website
                  </Link>
                </Button>
              )}

              {userData?.email && (
                <Button
                  variant="outline"
                  asChild
                  className="w-full justify-start gap-3 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                >
                  <Link href={`mailto:${userData.email}`}>
                    <Mail className="w-4 h-4" />
                    Send Email
                  </Link>
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Business Info
            </h3>
            <div className="space-y-4">
              {userData?.locations?.address && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 flex-shrink-0">
                    <MapPinIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Address</p>
                    <p className="text-sm text-gray-600">
                      {userData.locations.address}
                    </p>
                  </div>
                </div>
              )}

              {userData?.phone && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-green-100 flex-shrink-0">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600">
                      {userData.phone}
                    </p>
                  </div>
                </div>
              )}

              {userData?.email && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-purple-100 flex-shrink-0">
                    <Mail className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600 break-words">
                      {userData.email}
                    </p>
                  </div>
                </div>
              )}

              {userData?.business_categories &&
                userData.business_categories.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-orange-100 flex-shrink-0">
                      <Info className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Categories
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {userData.business_categories.map((category) => (
                          <span
                            key={category}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize"
                          >
                            {category.replace("-", " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </Card>
        </div>
      );
      setRightSidebarContent(sidebarContent);
    } else {
      setRightSidebarContent(null);
    }

    // Cleanup when component unmounts
    return () => setRightSidebarContent(null);
  }, [userData, showLocationIFrame, setRightSidebarContent, currentUser, userId]);

  // Helpers for slot computation
  const parseTimeToMinutes = (hhmm) => {
    const [h, m] = (hhmm || "").split(":");
    const hours = parseInt(h, 10);
    const mins = parseInt(m, 10);
    if (Number.isNaN(hours) || Number.isNaN(mins)) return null;
    return hours * 60 + mins;
  };
  const minutesToTime = (mins) => {
    const h = Math.floor(mins / 60)
      .toString()
      .padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };
  const getDayIndexFromISO = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
    const dt = new Date(y, m - 1, d);
    const jsDay = dt.getDay();
    return (jsDay + 6) % 7; // Monday=0
  };

  useEffect(() => {
    // Recompute available slots when date changes
    if (!selectedDate || !userData) {
      setAvailableSlots([]);
      setSelectedStart("");
      setComputedEnd("");
      return;
    }
    if (!userData.acceptAppointments) {
      setAvailableSlots([]);
      return;
    }
    const ops = userData.operationalHours || [];
    const dayIdx = getDayIndexFromISO(selectedDate);
    const info = ops[dayIdx];
    if (!info || !info.enabled) {
      setAvailableSlots([]);
      return;
    }
    const slotMinutes =
      typeof userData.appointmentSlotMinutes === "number"
        ? userData.appointmentSlotMinutes
        : 30;
    const openMins = parseTimeToMinutes(info.openTime);
    const closeMins = parseTimeToMinutes(info.closeTime);
    if (openMins == null || closeMins == null) {
      setAvailableSlots([]);
      return;
    }

    const slots = [];
    for (let t = openMins; t + slotMinutes <= closeMins; t += slotMinutes) {
      slots.push(minutesToTime(t));
    }
    setAvailableSlots(slots);
    setSelectedStart(slots[0] || "");
  }, [selectedDate, userData]);

  useEffect(() => {
    // Compute end time from start and multiplier
    if (!selectedStart || !userData) {
      setComputedEnd("");
      return;
    }
    const slotMinutes =
      typeof userData.appointmentSlotMinutes === "number"
        ? userData.appointmentSlotMinutes
        : 30;
    const ops = userData.operationalHours || [];
    const dayIdx = getDayIndexFromISO(selectedDate);
    const info = ops[dayIdx];
    const startMins = parseTimeToMinutes(selectedStart);
    const endMins =
      startMins + slotMinutes * Math.max(1, Number(multiplier) || 1);
    const closeMins = info && parseTimeToMinutes(info.closeTime);
    if (closeMins != null && endMins <= closeMins) {
      setComputedEnd(minutesToTime(endMins));
    } else {
      setComputedEnd("");
    }
  }, [selectedStart, multiplier, selectedDate, userData]);

  const submitBooking = async () => {
    if (!currentUser) {
      toast.error("Please log in to book an appointment");
      return;
    }
    if (!userData?.acceptAppointments) {
      toast.error("This business is not accepting appointments");
      return;
    }
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }
    if (!selectedStart || !computedEnd) {
      toast.error("Please select a valid time slot");
      return;
    }

    try {
      setBookingLoading(true);
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId: userId,
          date: selectedDate,
          startTime: selectedStart,
          endTime: computedEnd,
          description: bookingDescription,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to book appointment");
      }
      toast.success("Appointment requested successfully");
      setBookOpen(false);
      setSelectedDate("");
      setSelectedStart("");
      setMultiplier(1);
      setBookingDescription("");
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to book appointment");
    } finally {
      setBookingLoading(false);
    }
  };

  // Log user data for debugging
  useEffect(() => {
    if (userData) {
      console.log("User data loaded:", userData);
      console.log("Business categories:", userData.business_categories);
    }
  }, [userData]);

  const {
    posts,
    loading: postsLoading,
    fetchMorePosts,
    hasMore,
    error,
  } = useGetUserPosts(userId);

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
    <div className="min-h-screen bg-white">
      {/* Add style element for custom CSS */}
      <style jsx global>
        {scrollbarHideStyles}
      </style>

      <div className="w-full px-4 py-6">
        <div className="space-y-8">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="p-4 rounded-full bg-blue-100">
                <Loader2Icon className="w-8 h-8 animate-spin text-blue-600" />
              </div>
              <span className="ml-4 text-lg text-gray-600">
                Loading profile...
              </span>
            </div>
          ) : (
            <>
              {/* Profile Card - Enhanced with Fixed Spacing */}
              <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl">
                {/* Cover Image with Gradient Overlay */}
                <div className="relative h-48 sm:h-56 lg:h-64 w-full overflow-hidden">
                  <Dialog>
                    <DialogTrigger className="z-30 w-full h-full group">
                      <div className="relative w-full h-full">
                        <Image
                          src={userData?.coverPic || "/coverimg.png"}
                          width={1200}
                          height={256}
                          alt="Cover Image"
                          className="object-cover w-full h-full transition-all duration-500 group-hover:scale-105"
                          priority
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">
                          Cover Image
                        </DialogTitle>
                      </DialogHeader>
                      <div className="mt-4 rounded-2xl overflow-hidden">
                        <Image
                          src={userData?.coverPic || "/coverimg.png"}
                          width={1200}
                          height={600}
                          alt="Cover Image"
                          className="w-full object-cover"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Profile info with improved spacing */}
                <div className="relative px-6 sm:px-8 pb-8 pt-4">
                  {/* Profile picture positioned over cover image */}
                  <div className="absolute -top-12 left-8 z-10">
                    <Dialog>
                      <DialogTrigger>
                        <div className="relative group cursor-pointer">
                          <Avatar className="w-24 h-24 sm:w-28 sm:h-28 border-4 border-white shadow-2xl ring-4 ring-white/50 transition-all duration-300 group-hover:scale-105 group-hover:shadow-3xl">
                            <AvatarImage
                              src={userData?.profilePic || "/avatar.png"}
                              alt={userData?.name}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-2xl">
                              {userData?.businessName?.charAt(0) ||
                                userData?.name?.charAt(0) ||
                                "U"}
                            </AvatarFallback>
                          </Avatar>
                          {/* Subtle hover ring */}
                          <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold">
                            Profile Picture
                          </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4 rounded-2xl overflow-hidden">
                          <Image
                            src={userData?.profilePic || "/avatar.png"}
                            width={400}
                            height={400}
                            alt="Profile Image"
                            className="w-full object-cover"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Main content with proper spacing for profile picture */}
                  <div className="pt-20 space-y-6">
                    {/* Name, username and bio section */}
                    <div className="space-y-4">
                      {/* Name and badges */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-3">
                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex flex-wrap items-center gap-3">
                              {userData?.businessName ||
                                userData?.name ||
                                "User"}
                            </h1>

                            <div className="flex items-center text-gray-600 gap-2 text-lg">
                              <div className="p-2 rounded-full bg-gray-100">
                                <User className="w-4 h-4" />
                              </div>
                              <span className="font-medium">
                                {userData?.name || "Owner Name"}
                              </span>
                            </div>

                            {formattedDate && (
                              <div className="flex items-center text-gray-600 gap-2 text-sm">
                                <div className="p-1.5 rounded-full bg-gray-100">
                                  <Calendar className="w-3 h-3" />
                                </div>
                                <span>Joined {formattedDate}</span>
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-3 sm:flex-shrink-0">
                            {currentUser && (
                              <Button
                                onClick={handleFollowToggle}
                                disabled={followLoading}
                                className={cn(
                                  "w-full h-14 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] px-6",
                                  isFollowing
                                    ? "bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                                    : "bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 hover:from-orange-600 hover:via-red-600 hover:to-orange-700 text-white"
                                )}
                              >
                                {followLoading ? (
                                  <>
                                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                                    {isFollowing
                                      ? "Unfollowing..."
                                      : "Following..."}
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



                            {/* Book Appointment Button */}
                            {userData?.acceptAppointments &&
                              currentUser &&
                              currentUser.uid !== userId && (
                                <Dialog
                                  open={bookOpen}
                                  onOpenChange={setBookOpen}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="border-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 rounded-2xl px-6 py-3 h-auto font-medium transition-all duration-200"
                                    >
                                      <Calendar className="w-4 h-4 mr-2" />
                                      Book Appointment
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl">
                                    <DialogHeader>
                                      <DialogTitle className="text-2xl font-bold text-gray-900">
                                        Book Appointment
                                      </DialogTitle>
                                      <DialogDescription className="text-lg text-gray-600">
                                        Select a date and time. Slots are in
                                        increments of{" "}
                                        {userData?.appointmentSlotMinutes ||
                                          30}{" "}
                                        minutes.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-6 py-4">
                                      <div>
                                        <label className="block text-sm font-semibold mb-2 text-gray-900">
                                          Date
                                        </label>
                                        <Input
                                          type="date"
                                          value={selectedDate}
                                          onChange={(e) =>
                                            setSelectedDate(e.target.value)
                                          }
                                          className="rounded-2xl border-2 border-gray-200 focus:border-blue-400 focus:ring-0"
                                        />
                                      </div>
                                      {selectedDate && (
                                        <>
                                          {availableSlots.length === 0 ? (
                                            <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                                              <div className="p-3 rounded-full bg-gray-200 w-fit mx-auto mb-3">
                                                <Calendar className="w-6 h-6 text-gray-500" />
                                              </div>
                                              <p className="text-gray-600 font-medium">
                                                Closed on selected date
                                              </p>
                                            </div>
                                          ) : (
                                            <>
                                              <div>
                                                <label className="block text-sm font-semibold mb-2 text-gray-900">
                                                  Start Time
                                                </label>
                                                <select
                                                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 focus:border-blue-400 focus:ring-0"
                                                  value={selectedStart}
                                                  onChange={(e) =>
                                                    setSelectedStart(
                                                      e.target.value
                                                    )
                                                  }
                                                >
                                                  {availableSlots.map((s) => (
                                                    <option key={s} value={s}>
                                                      {s}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>
                                              <div>
                                                <label className="block text-sm font-semibold mb-2 text-gray-900">
                                                  Duration (x slots)
                                                </label>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  max={8}
                                                  value={multiplier}
                                                  onChange={(e) =>
                                                    setMultiplier(
                                                      Number(
                                                        e.target.value
                                                      ) || 1
                                                    )
                                                  }
                                                  className="rounded-2xl border-2 border-gray-200 focus:border-blue-400 focus:ring-0"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-sm font-semibold mb-2 text-gray-900">
                                                  End Time
                                                </label>
                                                <Input
                                                  type="time"
                                                  value={computedEnd || ""}
                                                  readOnly
                                                  className="rounded-2xl border-2 border-gray-200 bg-gray-50"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-sm font-semibold mb-2 text-gray-900">
                                                  Notes
                                                </label>
                                                <Textarea
                                                  placeholder="Share any details for the business"
                                                  value={bookingDescription}
                                                  onChange={(e) =>
                                                    setBookingDescription(
                                                      e.target.value
                                                    )
                                                  }
                                                  rows={3}
                                                  className="rounded-2xl border-2 border-gray-200 focus:border-blue-400 focus:ring-0 resize-none"
                                                />
                                              </div>
                                            </>
                                          )}
                                        </>
                                      )}
                                      <div className="flex justify-end gap-3 pt-2">
                                        <Button
                                          variant="outline"
                                          onClick={() => setBookOpen(false)}
                                          className="rounded-2xl px-6 py-3 h-auto"
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          onClick={submitBooking}
                                          disabled={
                                            bookingLoading ||
                                            !computedEnd ||
                                            availableSlots.length === 0
                                          }
                                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-2xl px-6 py-3 h-auto"
                                        >
                                          {bookingLoading ? (
                                            <>
                                              <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                                              Booking...
                                            </>
                                          ) : (
                                            "Confirm"
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                          </div>
                        </div>

                        {/* Bio section */}
                        {userData?.bio && (
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200">
                            <p className="text-gray-700 leading-relaxed">
                              {userData.bio}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats row with enhanced design */}
                    <div className="grid grid-cols-4 gap-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-3xl p-6 border border-gray-200">
                      <FollowingDialog
                        followingCount={followingCount}
                        userId={userId}
                        className="flex flex-col items-center"
                      >
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 mb-1">
                            {followingCount}
                          </div>
                          <div className="text-sm text-gray-600 font-medium">
                            Following
                          </div>
                        </div>
                      </FollowingDialog>

                      <FollowerDialog
                        followerCount={followersCount}
                        userId={userId}
                        className="flex flex-col items-center pl-4 border-l border-gray-300"
                      >
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 mb-1">
                            {followersCount}
                          </div>
                          <div className="text-sm text-gray-600 font-medium">
                            Followers
                          </div>
                        </div>
                      </FollowerDialog>

                      <div className="flex flex-col items-center pl-4 border-l border-gray-300">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 mb-1">
                            {posts.length}
                          </div>
                          <div className="text-sm text-gray-600 font-medium">
                            Posts
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center pl-4 border-l border-gray-300">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 mb-1">
                            {userPhotos.length || 0}
                          </div>
                          <div className="text-sm text-gray-600 font-medium">
                            Photos
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Location map with modern styling */}
                    {showLocationIFrame && userData?.role === "business" && (
                      <div className="rounded-3xl border border-gray-200 overflow-hidden bg-white shadow-lg">
                        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                          <h3 className="font-bold text-lg flex items-center gap-3 text-gray-900">
                            <div className="p-2 rounded-xl bg-green-100">
                              <MapPinIcon className="w-5 h-5 text-green-600" />
                            </div>
                            Business Location
                          </h3>
                          {userData?.locations?.address && (
                            <div className="mt-2 text-gray-700 ml-11">
                              {userData.locations.address}
                            </div>
                          )}
                        </div>
                        <div className="h-[350px] w-full relative">
                          <iframe
                            src={
                              userData?.locations?.mapUrl ||
                              "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7544.081477968485!2d73.08964204800337!3d19.017926421940366!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7e9d390c16fad%3A0x45a26096b6c171fd!2sKamothe%2C%20Panvel%2C%20Navi%20Mumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1739571469059!5m2!1sen!2sin"
                            }
                            style={{ border: "0" }}
                            allowFullScreen=""
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Content tabs with modern design */}
              <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm rounded-3xl">
                <Tabs defaultValue="posts" className="w-full">
                  <div className="border-b border-gray-200 overflow-x-auto scrollbar-hide bg-gradient-to-r from-gray-50 to-gray-100">
                    <TabsList className="justify-between h-auto p-2 bg-transparent w-full flex gap-1">
                      <TabsTrigger
                        value="posts"
                        className={cn(
                          "rounded-2xl flex-1 transition-all duration-300",
                          "data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg",
                          "px-4 py-4 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/50"
                        )}
                      >
                        <div className="p-1.5 rounded-lg bg-blue-100">
                          <FileTextIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="hidden sm:block">Posts</span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="photos"
                        className={cn(
                          "rounded-2xl flex-1 transition-all duration-300",
                          "data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-lg",
                          "px-4 py-4 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/50"
                        )}
                      >
                        <div className="p-1.5 rounded-lg bg-green-100">
                          <Images className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="hidden sm:block">Photos</span>
                      </TabsTrigger>

                      {userData?.business_categories?.includes("product") && (
                        <TabsTrigger
                          value="products"
                          className={cn(
                            "rounded-2xl flex-1 transition-all duration-300",
                            "data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-lg",
                            "px-4 py-4 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/50"
                          )}
                        >
                          <div className="p-1.5 rounded-lg bg-orange-100">
                            <SquareChartGantt className="w-4 h-4 text-orange-600" />
                          </div>
                          <span className="hidden sm:block">Products</span>
                        </TabsTrigger>
                      )}

                      {userData?.business_categories?.includes("service") && (
                        <TabsTrigger
                          value="services"
                          className={cn(
                            "rounded-2xl flex-1 transition-all duration-300",
                            "data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg",
                            "px-4 py-4 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/50"
                          )}
                        >
                          <div className="p-1.5 rounded-lg bg-indigo-100">
                            <Settings className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="hidden sm:block">Services</span>
                        </TabsTrigger>
                      )}

                      {userData?.business_categories?.includes(
                        "real-estate"
                      ) && (
                          <TabsTrigger
                            value="properties"
                            className={cn(
                              "rounded-2xl flex-1 transition-all duration-300",
                              "data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-lg",
                              "px-4 py-4 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/50"
                            )}
                          >
                            <div className="p-1.5 rounded-lg bg-teal-100">
                              <Home className="w-4 h-4 text-teal-600" />
                            </div>
                            <span className="hidden sm:block">Properties</span>
                          </TabsTrigger>
                        )}
                    </TabsList>
                  </div>

                  {/* Tab Contents with modern styling */}
                  <TabsContent
                    value="posts"
                    className="p-8 focus-visible:outline-none focus:outline-none transition-all duration-300 animate-in fade-in-50"
                  >
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">
                          Posts
                        </h2>
                        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {posts.length} posts
                        </div>
                      </div>
                      {renderPosts()}
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="photos"
                    className="p-8 focus-visible:outline-none focus:outline-none transition-all duration-300 animate-in fade-in-50"
                  >
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900">
                          Photos
                        </h2>
                        <div className="text-sm text-gray-500 bg-green-50 text-green-600 px-3 py-1 rounded-full border border-green-200">
                          {userPhotos.length} photos
                        </div>
                      </div>
                      {loadingPhotos ? (
                        <div className="flex justify-center py-12">
                          <div className="p-4 rounded-full bg-green-100">
                            <Loader2Icon className="w-8 h-8 animate-spin text-green-600" />
                          </div>
                        </div>
                      ) : userPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {userPhotos.map((photo, index) => (
                            <Dialog key={photo.id}>
                              <DialogTrigger asChild>
                                <div
                                  className="relative group overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 hover:border-gray-300 cursor-pointer hover:-translate-y-1"
                                  style={{ height: "240px" }}
                                >
                                  <div className="relative w-full h-full">
                                    <Image
                                      src={photo.photoUrl}
                                      alt={photo.caption || "Business photo"}
                                      fill
                                      sizes="(max-width: 768px) 50vw, 33vw"
                                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                                      priority={index < 6}
                                    />
                                  </div>

                                  {/* Enhanced overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                    {photo.caption && (
                                      <div className="bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2 w-fit">
                                        <p className="text-white text-sm font-medium truncate">
                                          {photo.caption}
                                        </p>
                                        <p className="text-white/70 text-xs">
                                          {photo.timestamp
                                            ? new Date(
                                              photo.timestamp
                                            ).toLocaleDateString("en-US", {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                            })
                                            : ""}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DialogTrigger>

                              {/* Enhanced Photo View Dialog */}
                              <DialogContent className="sm:max-w-6xl max-h-[95vh] p-0 overflow-hidden bg-black border-0 shadow-2xl rounded-3xl">
                                <div className="relative w-full h-full flex flex-col">
                                  {/* Top controls bar */}
                                  <div className="absolute top-0 left-0 right-0 z-20 p-6 bg-gradient-to-b from-black/80 to-transparent">
                                    <div className="flex items-center justify-between">
                                      <div className="text-white/90">
                                        <p className="text-lg font-semibold">
                                          {index + 1} / {userPhotos.length}
                                        </p>
                                        <p className="text-sm text-white/70">
                                          {photo.timestamp
                                            ? new Date(
                                              photo.timestamp
                                            ).toLocaleDateString("en-US", {
                                              day: "numeric",
                                              month: "long",
                                              year: "numeric",
                                            })
                                            : ""}
                                        </p>
                                      </div>
                                      <DialogClose asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="rounded-full bg-white/10 text-white hover:bg-white/20 h-12 w-12"
                                        >
                                          <X className="h-6 w-6" />
                                        </Button>
                                      </DialogClose>
                                    </div>
                                  </div>

                                  {/* Image Container */}
                                  <div className="flex-1 flex items-center justify-center pt-20 pb-6 overflow-auto">
                                    <div className="relative flex items-center justify-center">
                                      <img
                                        src={photo.photoUrl}
                                        alt={
                                          photo.caption || "Business photo"
                                        }
                                        className="max-w-full max-h-[85vh] object-contain rounded-2xl"
                                      />
                                    </div>
                                  </div>

                                  {/* Caption if available */}
                                  {photo.caption && (
                                    <div className="absolute bottom-6 left-6 right-6 text-center">
                                      <div className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-lg">
                                        <p className="font-medium">
                                          {photo.caption}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16 bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl border border-green-100">
                          <div className="p-4 rounded-full bg-green-100 w-fit mx-auto mb-4">
                            <Images className="w-12 h-12 text-green-600" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No photos available
                          </h3>
                          <p className="text-gray-600">
                            This business hasn't shared any photos yet.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Products tab - only shown for businesses with product category */}
                  {userData?.business_categories?.includes("product") && (
                    <TabsContent
                      value="products"
                      className="p-8 focus-visible:outline-none focus:outline-none transition-all duration-300 animate-in fade-in-50"
                    >
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-bold text-gray-900">
                            Products
                          </h2>
                          <div className="text-sm text-gray-500 bg-orange-50 text-orange-600 px-3 py-1 rounded-full border border-orange-200">
                            Business Products
                          </div>
                        </div>
                        {userData && (
                          <ShowProductsTabContent
                            userId={userId}
                            userData={userData}
                            isViewOnly={true}
                            currentUserView={false}
                          />
                        )}
                      </div>
                    </TabsContent>
                  )}

                  {/* Services tab - only shown for businesses with service category */}
                  {userData?.business_categories?.includes("service") && (
                    <TabsContent
                      value="services"
                      className="p-8 focus-visible:outline-none focus:outline-none transition-all duration-300 animate-in fade-in-50"
                    >
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-bold text-gray-900">
                            Services
                          </h2>
                          <div className="text-sm text-gray-500 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-200">
                            Business Services
                          </div>
                        </div>
                        {userData && (
                          <ShowServicesTabContent
                            userId={userId}
                            userData={userData}
                            isViewOnly={true}
                            currentUserView={false}
                          />
                        )}
                      </div>
                    </TabsContent>
                  )}

                  {/* Properties tab */}
                  {userData?.business_categories?.includes("real-estate") && (
                    <TabsContent
                      value="properties"
                      className="p-8 focus-visible:outline-none focus:outline-none transition-all duration-300 animate-in fade-in-50"
                    >
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-bold text-gray-900">
                            Properties
                          </h2>
                          <div className="text-sm text-gray-500 bg-teal-50 text-teal-600 px-3 py-1 rounded-full border border-teal-200">
                            Real Estate
                          </div>
                        </div>
                        {userData && (
                          <ShowBusinessProperties businessId={userId} />
                        )}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
