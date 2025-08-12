"use client";
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
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
  ArrowLeftIcon,
  HomeIcon,
  Printer,
  Star,
  MoreHorizontal,
  Home,
  PhoneCall,
  Building2,
  ChevronDown,
  Store,
  RefreshCw,
  Trash2,
  PlusCircle,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { useGetUserPosts } from "@/hooks/useGetPosts";
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
  updateDoc,
  where,
  addDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import PostCard from "@/components/PostCard";
import Link from "next/link";
import ShowProductsTabContent from "@/components/profile/ShowProductsTabContent";
import Image from "next/image";
import { userEmailStatus } from "@/utils/userStatus";
import toast from "react-hot-toast";
import { sendEmailVerification } from "firebase/auth";
import FollowingDialog from "@/components/profile/FollowingDialog";
import FollowerDialog from "@/components/profile/FollowerDialog";
import PhotosGrid from "@/components/PhotosGrid";
import AddPhotoModal from "@/components/AddPhotoModal";
import ShareBusinessDialog from "@/components/profile/ShareBusinessDialog";
import { cn } from "@/lib/utils";
import ShowServicesTabContent from "@/components/profile/ShowServicesTabContent";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import FranchiseSelector from "@/components/profile/FranchiseSelector";
import WebsiteBuilderButton from "@/components/WebsiteBuilderButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Textarea } from "@/components/ui/textarea";
import "leaflet/dist/leaflet.css";
import ShowPropertiesTabContent from "@/components/profile/ShowPropertiesTabContent";
import Loader from "@/components/Loader";

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

// Dynamically import Leaflet components to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  loading: () => (
    <div className="h-[300px] flex justify-center items-center bg-gray-100">
      <Loader />
    </div>
  ),
  ssr: false,
});

// Dynamically import FranchiseModal
const FranchiseModal = dynamic(
  () => import("@/components/profile/FranchiseModal"),
  {
    loading: () => (
      <div className="flex justify-center items-center h-[400px]">
        <Loader />
      </div>
    ),
  }
);

// Memoized components
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-[400px]">
    <Loader />
  </div>
);

const EmptyState = ({ icon: Icon, message }) => (
  <div className="text-center py-12">
    <Icon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
    <p className="text-muted-foreground">{message}</p>
  </div>
);

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState(null);
  const [likedPosts, setLikedPosts] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Fixed: Use consistent userId calculation
  const userId = useMemo(
    () => selectedFranchiseId || user?.uid,
    [selectedFranchiseId, user?.uid]
  );

  const [userData, setUserData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Fixed: Use consistent userId for posts hook
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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [selectedProductForRating, setSelectedProductForRating] =
    useState(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [productRatings, setProductRatings] = useState({});
  const [franchises, setFranchises] = useState([]);
  const [hasFranchises, setHasFranchises] = useState(false);
  const [loadingFranchises, setLoadingFranchises] = useState(false);

  const billRef = useRef();
  const [isFranchiseModalOpen, setIsFranchiseModalOpen] = useState(false);
  const [isBusinessUser, setIsBusinessUser] = useState(false);

  // Fixed: Add cleanup refs for listeners
  const unsubscribeRefs = useRef([]);

  const franchiseFormSchema = z.object({
    adminName: z.string().min(2, { message: "Admin name is required" }),
    email: z.string().email({ message: "Please enter a valid email" }),
    phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  });

  const franchiseForm = useForm({
    resolver: zodResolver(franchiseFormSchema),
    defaultValues: {
      adminName: "",
      email: "",
      phone: "",
    },
  });

  const handleAddFranchise = async (data) => {
    try {
      // Implementation for adding franchise will go here
      // For now, just show a success message
      toast.success("Franchise invitation sent successfully!");
      setIsFranchiseModalOpen(false);
      franchiseForm.reset();
    } catch (error) {
      console.error("Error adding franchise:", error);
      toast.error("Failed to add franchise");
    }
  };

  // Memoized values
  const isCurrentUser = useMemo(() => {
    return userId === user?.uid;
  }, [userId, user?.uid]);

  const isEmailVerified = useMemo(() => {
    try {
      return userEmailStatus() === true;
    } catch (error) {
      console.error("Error checking email verification:", error);
      return false;
    }
  }, [user?.emailVerified]); // Fixed: Add dependency

  // Optimized handlers
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

        // Fixed: Update local state immediately
        setSavedPosts((prev) => prev.filter((post) => post.id !== postId));
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
      setIsUnsaveDialogOpen(false);
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

  // Fixed: Cleanup function for all listeners
  const cleanupListeners = useCallback(() => {
    unsubscribeRefs.current.forEach((unsubscribe) => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    });
    unsubscribeRefs.current = [];
  }, []);

  // Fixed: Optimized main auth effect with better error handling
  useEffect(() => {
    let mounted = true;

    // Check sessionStorage for selected franchise
    try {
      const storedFranchiseId = sessionStorage.getItem("selectedFranchiseId");
      if (storedFranchiseId && mounted) {
        setSelectedFranchiseId(storedFranchiseId);
      }
    } catch (error) {
      console.error("Error reading from sessionStorage:", error);
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!mounted) return;

      if (user) {
        setUser(user);
        setLoadingUserData(true);
        setAuthError(null);

        try {
          const userDocRef = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userDocRef);

          if (!mounted) return;

          if (userSnapshot.exists()) {
            const userDoc = userSnapshot.data();

            // Check if user is a member with a businessId
            if (userDoc.role === "member" && userDoc.businessId) {
              // Fetch the business data
              const businessDocRef = doc(db, "businesses", userDoc.businessId);
              const businessSnapshot = await getDoc(businessDocRef);

              if (!mounted) return;

              if (businessSnapshot.exists()) {
                const businessData = businessSnapshot.data();

                // Merge business data with user-specific data
                const mergedData = {
                  ...businessData,
                  // Keep user email, phone, and name from user data
                  email: userDoc.email,
                  phone: userDoc.phone || businessData.phone,
                  name: userDoc.name,
                  // Set role to member for badge display
                  role: "member",
                  // Store original user data for reference
                  _userData: userDoc,
                  // Keep user's original ID for posts and other user-specific operations
                  uid: user.uid,
                };

                setUserData(mergedData);
                setIsBusinessUser(true);
              } else {
                // If business not found, fall back to user data
                setUserData(userDoc);
                setIsBusinessUser(!!userDoc.businessName);
              }
            } else {
              // Not a member or no businessId, use user data as is
              setUserData(userDoc);
              setIsBusinessUser(!!userDoc.businessName);
            }
          } else {
            setUserData(null);
            setIsBusinessUser(false);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setAuthError("Failed to load user profile");
          if (mounted) {
            toast.error("Failed to load user profile");
          }
        } finally {
          if (mounted) {
            setLoadingUserData(false);
          }
        }
      } else {
        if (mounted) {
          router.push("/login");
        }
      }
    });

    // Store unsubscribe function
    unsubscribeRefs.current.push(unsubscribe);

    return () => {
      mounted = false;
      cleanupListeners();
    };
  }, [router, cleanupListeners]);

  // Fixed: Followers/Following listener with proper cleanup
  useEffect(() => {
    if (!userId) return;

    const followersRef = collection(db, "users", userId, "followers");
    const followingRef = collection(db, "users", userId, "following");

    const unsubscribeFollowers = onSnapshot(
      followersRef,
      (snapshot) => {
        setFollowersCount(snapshot.size);
      },
      (error) => {
        console.error("Error fetching followers:", error);
      }
    );

    const unsubscribeFollowing = onSnapshot(
      followingRef,
      (snapshot) => {
        setFollowingCount(snapshot.size);
      },
      (error) => {
        console.error("Error fetching following:", error);
      }
    );

    // Store unsubscribe functions
    unsubscribeRefs.current.push(unsubscribeFollowers, unsubscribeFollowing);

    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
    };
  }, [userId]);

  // Fixed: User photos listener with proper error handling
  useEffect(() => {
    if (!userId) {
      setLoadingPhotos(false);
      return;
    }

    setLoadingPhotos(true);

    // For members, use the business ID for fetching photos
    const targetUserId = userData?.businessId || userId;

    const photosRef = collection(db, "users", targetUserId, "photos");
    // Photos can use 'timestamp' or 'addedOn' field for ordering
    const q = query(photosRef, orderBy("addedOn", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const photosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUserPhotos(photosData);
        setLoadingPhotos(false);
      },
      (error) => {
        console.error("Error fetching user photos:", error);
        setLoadingPhotos(false);
        setUserPhotos([]); // Fixed: Set empty array on error
      }
    );

    unsubscribeRefs.current.push(unsubscribe);

    return () => unsubscribe();
  }, [userId, userData?.businessId]);

  // Fixed: Liked posts listener with better error handling
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "postlikes"),
      async (querySnapshot) => {
        try {
          const postIds = querySnapshot.docs.map((doc) => doc.id);
          if (postIds.length === 0) {
            setLikedPosts([]);
            return;
          }

          const postDocs = await Promise.all(
            postIds.map((id) => getDoc(doc(db, "posts", id)).catch(() => null))
          );

          const tempLikedPosts = postDocs
            .filter((doc) => doc && doc.exists())
            .map((doc) => ({ ...doc.data(), id: doc.id }));
          setLikedPosts(tempLikedPosts);
        } catch (error) {
          console.error("Error fetching liked posts:", error);
          setLikedPosts([]);
        }
      },
      (error) => {
        console.error("Error with liked posts listener:", error);
        setLikedPosts([]);
      }
    );

    unsubscribeRefs.current.push(unsubscribe);

    return () => unsubscribe();
  }, [user?.uid]);

  // Fixed: Saved posts effect with better error handling
  useEffect(() => {
    // Skip if not the current user
    if (!user || !isCurrentUser) {
      setSavedPosts([]);
      setLoadingSavedPosts(false);
      return;
    }

    const fetchSavedPosts = async () => {
      try {
        setLoadingSavedPosts(true);

        const savedPostsRef = collection(db, "users", user.uid, "savedPosts");
        const savedPostsSnap = await getDocs(savedPostsRef);

        const postsData = [];

        for (const docSnapshot of savedPostsSnap.docs) {
          try {
            const postData = docSnapshot.data();

            // If postData has a reference to the original post
            if (postData.postId) {
              const postDoc = await getDoc(doc(db, "posts", postData.postId));

              if (postDoc.exists()) {
                postsData.push({
                  id: postDoc.id,
                  ...postDoc.data(),
                  savedAt: postData.timestamp,
                  savedId: docSnapshot.id,
                });
              }
            }
          } catch (error) {
            console.error("Error processing saved post:", error);
          }
        }

        // Sort by savedAt timestamp
        postsData.sort((a, b) => {
          const aTime = a.savedAt?.toDate
            ? a.savedAt.toDate()
            : new Date(a.savedAt || 0);
          const bTime = b.savedAt?.toDate
            ? b.savedAt.toDate()
            : new Date(b.savedAt || 0);
          return bTime - aTime;
        });

        setSavedPosts(postsData);
      } catch (error) {
        console.error("Error fetching saved posts:", error);
        setSavedPosts([]);
        toast.error("Failed to load saved posts");
      } finally {
        setLoadingSavedPosts(false);
      }
    };

    fetchSavedPosts();
  }, [user?.uid, isCurrentUser]); // Fixed: Remove user dependency to avoid infinite loop

  // Fixed: Orders effect with better error handling
  useEffect(() => {
    // Skip if not the current user
    if (!user?.uid || !isCurrentUser) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoadingOrders(true);

        const ordersRef = collection(db, "users", user.uid, "orders");
        const q = query(ordersRef, orderBy("timestamp", "desc"));
        const ordersSnap = await getDocs(q);

        const ordersData = ordersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }));

        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
        toast.error("Failed to load orders");
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [user?.uid, isCurrentUser]);

  // Fixed: Product ratings effect with better error handling
  useEffect(() => {
    if (!user?.uid || !isCurrentUser) {
      setProductRatings({});
      return;
    }

    const fetchProductRatings = async () => {
      try {
        const ratingsRef = collection(db, "users", user.uid, "productRatings");
        const ratingsSnap = await getDocs(ratingsRef);

        const ratingsData = {};

        ratingsSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.productId) {
            ratingsData[data.productId] = {
              id: doc.id,
              ...data,
            };
          }
        });

        setProductRatings(ratingsData);
      } catch (error) {
        console.error("Error fetching product ratings:", error);
        setProductRatings({});
      }
    };

    fetchProductRatings();
  }, [user?.uid, isCurrentUser]);

  // Fixed: Franchises effect with better error handling
  useEffect(() => {
    if (!user?.uid || !isBusinessUser) {
      setHasFranchises(false);
      setFranchises([]);
      setLoadingFranchises(false);
      return;
    }

    const fetchFranchises = async () => {
      try {
        setLoadingFranchises(true);

        // Query franchises owned by this business
        const franchisesQuery = query(
          collection(db, "businesses"),
          where("franchiseOwner", "==", user.uid)
        );

        const franchisesSnapshot = await getDocs(franchisesQuery);

        if (franchisesSnapshot.empty) {
          setFranchises([]);
          setHasFranchises(false);
        } else {
          const franchisesList = franchisesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setFranchises(franchisesList);
          setHasFranchises(true);
        }
      } catch (error) {
        console.error("Error fetching franchises:", error);
        toast.error("Failed to load franchises");
        setHasFranchises(false);
        setFranchises([]);
      } finally {
        setLoadingFranchises(false);
      }
    };

    fetchFranchises();
  }, [user?.uid, isBusinessUser]);

  // Fixed: Handle franchise switch with better state management
  const handleSwitchFranchise = useCallback(
    (franchiseId, shouldReload = true) => {
      try {
        if (franchiseId === "headquarters") {
          // Switch to main business profile
          sessionStorage.removeItem("selectedFranchiseId");
          setSelectedFranchiseId(null);
          toast.success("Switched to Headquarters");
        } else {
          // Switch to franchise profile
          sessionStorage.setItem("selectedFranchiseId", franchiseId);
          setSelectedFranchiseId(franchiseId);
          const franchise = franchises.find((f) => f.id === franchiseId);
          toast.success(
            `Switched to ${franchise?.businessName || "Franchise"}`
          );
        }

        // Force reload to refresh data if specified
        if (shouldReload) {
          window.location.reload();
        }
      } catch (error) {
        console.error("Error switching franchise:", error);
        toast.error("Failed to switch franchise");
      }
    },
    [franchises]
  );

  // Fixed: Dynamically exit franchise view with better error handling
  const exitFranchiseView = useCallback(async () => {
    try {
      // Show loading state
      const loadingToast = toast.loading("Updating profile...");

      // Remove franchise ID from session storage
      sessionStorage.removeItem("selectedFranchiseId");
      setSelectedFranchiseId(null);

      // Fetch the current user's data
      const userDocRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userDocRef);

      if (userSnapshot.exists()) {
        const userDoc = userSnapshot.data();
        setUserData(userDoc);
        setIsBusinessUser(!!userDoc.businessName);
      }

      // Fetch user photos
      const photosRef = collection(db, "users", user.uid, "photos");
      const photosQuery = query(photosRef, orderBy("addedOn", "desc"));
      const photosSnapshot = await getDocs(photosQuery);

      const photosData = photosSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUserPhotos(photosData);

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("Exited franchise view");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.dismiss();
      toast.error("Failed to update profile");

      // Fallback to page reload if dynamic update fails
      window.location.reload();
    }
  }, [user?.uid]);

  // Fixed: Memoized UI components with error handling
  const renderPosts = useMemo(() => {
    if (error) {
      return (
        <div className="text-center py-12">
          <FileTextIcon className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Failed to load posts</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="rounded-full px-6"
          >
            Try Again
          </Button>
        </div>
      );
    }

    if (loading && !posts.length) {
      return (
        <div className="flex justify-center py-8">
          <Loader />
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
              <PostCard post={post} onView={() => router.push(`/feed/${post.id || post.postId}`)} />
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
                  <Loader />
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
  }, [posts, loading, hasMore, handleLoadMore, userData, error]);

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
        <Loader />
      </div>
    ),
    []
  );

  const renderSavedPostCard = useCallback(
    (post) => (
      <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow border border-gray-100">
        <CardContent className="pt-6">
          <PostCard post={post} onView={() => router.push(`/feed/${post.id || post.postId}`)} />
        </CardContent>
      </Card>
    ),
    [router]
  );

  // Fixed: Handle printing functionality with better error handling
  const handlePrint = useReactToPrint({
    content: () => billRef.current,
    documentTitle: `Invoice_${selectedOrder?.orderId || "order"}`,
    onBeforeGetContent: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 200);
      });
    },
    onAfterPrint: () => {
      toast.success("Invoice ready for printing/saving");
    },
    removeAfterPrint: false,
    print: async (printIframe) => {
      try {
        const document = printIframe.contentDocument;
        if (document) {
          const html = document.getElementsByTagName("html")[0];

          // Try to force PDF to be an option
          document.body.style.width = "210mm";
          document.body.style.height = "297mm"; // A4 dimensions

          html.style.width = "210mm";
          html.style.height = "297mm";

          setTimeout(() => {
            window.print();
          }, 500);
        }
      } catch (error) {
        console.error("Error printing:", error);
        toast.error("Failed to print invoice");
      }
    },
  });

  // Fixed: Function to download PDF directly with better error handling
  const handleDownloadPDF = useCallback(async () => {
    if (!billRef.current) return;

    try {
      toast.loading("Generating PDF...");

      const content = billRef.current;
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`Invoice_${selectedOrder?.orderId || "order"}.pdf`);

      toast.dismiss();
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.dismiss();
      toast.error("Failed to generate PDF");
    }
  }, [selectedOrder?.orderId]);

  // Fixed: Function to handle bill generation with validation
  const handleGenerateBill = useCallback((order) => {
    if (!order) {
      toast.error("Invalid order data");
      return;
    }
    setSelectedOrder(order);
    setBillDialogOpen(true);
  }, []);

  // Fixed: Handle rating submission with better error handling
  const handleSubmitRating = useCallback(async () => {
    if (!selectedProductForRating || !user?.uid || ratingValue === 0) {
      toast.error("Please provide a rating");
      return;
    }

    setIsSubmittingRating(true);

    try {
      const ratingData = {
        productId: selectedProductForRating.productId,
        productName: selectedProductForRating.productName,
        rating: ratingValue,
        feedback: ratingFeedback,
        userId: user.uid,
        userName: user.displayName || user.email,
        timestamp: serverTimestamp(),
        orderId: selectedProductForRating.orderId,
        updatedAt: serverTimestamp(),
      };

      const isUpdating = productRatings[selectedProductForRating.productId];

      if (isUpdating) {
        // Update existing rating
        const ratingId = productRatings[selectedProductForRating.productId].id;
        const userRatingRef = doc(
          db,
          "users",
          user.uid,
          "productRatings",
          ratingId
        );
        await updateDoc(userRatingRef, {
          rating: ratingValue,
          feedback: ratingFeedback,
          updatedAt: serverTimestamp(),
        });

        // Try to update in product's ratings collection if we have the ID
        const productRatingId =
          productRatings[selectedProductForRating.productId].productRatingId;
        if (productRatingId) {
          const productRatingRef = doc(
            db,
            "products",
            selectedProductForRating.productId,
            "ratings",
            productRatingId
          );
          await updateDoc(productRatingRef, {
            rating: ratingValue,
            feedback: ratingFeedback,
            updatedAt: serverTimestamp(),
          });
        }

        toast.success("Rating updated successfully");
      } else {
        // Add new rating to user's ratings collection
        const userRatingRef = collection(
          db,
          "users",
          user.uid,
          "productRatings"
        );
        const newRatingDoc = await addDoc(userRatingRef, ratingData);

        // Also add rating to product's ratings collection
        const productRatingRef = collection(
          db,
          "products",
          selectedProductForRating.productId,
          "ratings"
        );
        const productRatingDoc = await addDoc(productRatingRef, ratingData);

        // Update the user's rating with the product rating ID for future reference
        await updateDoc(
          doc(db, "users", user.uid, "productRatings", newRatingDoc.id),
          {
            productRatingId: productRatingDoc.id,
          }
        );

        // Update product's average rating in products collection
        const productRef = doc(
          db,
          "products",
          selectedProductForRating.productId
        );
        const productDoc = await getDoc(productRef);

        if (productDoc.exists()) {
          const productData = productDoc.data();
          const currentRatingCount = productData.ratingCount || 0;
          const currentRatingSum = productData.ratingSum || 0;

          const newRatingCount = currentRatingCount + 1;
          const newRatingSum = currentRatingSum + ratingValue;
          const newAverageRating = newRatingSum / newRatingCount;

          await updateDoc(productRef, {
            ratingCount: newRatingCount,
            ratingSum: newRatingSum,
            averageRating: newAverageRating,
          });
        }

        // Update local state with the new rating ID
        ratingData.id = newRatingDoc.id;
        ratingData.productRatingId = productRatingDoc.id;

        toast.success("Rating submitted successfully");
      }

      // Update local state
      setProductRatings((prev) => ({
        ...prev,
        [selectedProductForRating.productId]: {
          ...(prev[selectedProductForRating.productId] || {}),
          id: isUpdating
            ? productRatings[selectedProductForRating.productId].id
            : ratingData.id,
          productId: selectedProductForRating.productId,
          rating: ratingValue,
          feedback: ratingFeedback,
          updatedAt: new Date(),
        },
      }));

      setRatingDialogOpen(false);

      // Reset rating form
      setRatingValue(0);
      setRatingFeedback("");
      setSelectedProductForRating(null);
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating");
    } finally {
      setIsSubmittingRating(false);
    }
  }, [
    selectedProductForRating,
    user?.uid,
    ratingValue,
    ratingFeedback,
    productRatings,
  ]);

  // Fixed: Handle opening the rating dialog with validation
  const handleOpenRatingDialog = useCallback(
    (product, order) => {
      if (!product || !order) {
        toast.error("Invalid product or order data");
        return;
      }

      const productWithOrderInfo = {
        ...product,
        orderId: order.id,
        businessId: order.businessId,
        businessName: order.businessName,
      };
      setSelectedProductForRating(productWithOrderInfo);

      // If product has already been rated, pre-fill the form
      if (productRatings[product.productId]) {
        setRatingValue(productRatings[product.productId].rating);
        setRatingFeedback(productRatings[product.productId].feedback || "");
      } else {
        setRatingValue(0);
        setRatingFeedback("");
      }

      setRatingDialogOpen(true);
    },
    [productRatings]
  );

  // Fixed: Render star rating component for selection with proper key handling
  const renderStarRating = useCallback(
    (currentRating, isSelectable = false) => {
      return (
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`${isSelectable ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
              onClick={() => isSelectable && setRatingValue(star)}
              disabled={!isSelectable}
            >
              <Star
                className={`h-6 w-6 ${star <= currentRating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                  } ${isSelectable && star <= currentRating ? "text-yellow-400" : ""}`}
              />
            </button>
          ))}
        </div>
      );
    },
    []
  );

  // Fixed: Add error boundary for auth errors
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Error Loading Profile
          </h1>
          <p className="text-gray-600 mb-4">{authError}</p>
          <Button
            onClick={() => window.location.reload()}
            className="rounded-full px-6"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Add style element for custom CSS */}
      <style jsx global>
        {scrollbarHideStyles}
      </style>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <main className="flex-1 space-y-8">
            {loadingUserData || isBusinessUser === null ? (
              <LoadingSpinner />
            ) : (
              <>
                {/* Profile Card - Enhanced with Fixed Spacing */}
                <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl">
                  {/* Cover Image with Gradient Overlay */}
                  <div className="relative h-48 sm:h-56 lg:h-64 w-full overflow-hidden">
                    {isBusinessUser && (
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
                    )}
                  </div>

                  {/* Profile info with improved spacing */}
                  <div className="relative px-6 sm:px-8 pb-8 pt-4">
                    {/* Profile picture positioned over cover image */}
                    <div
                      className={`${isBusinessUser
                          ? "absolute -top-12 left-8 z-10"
                          : "flex justify-center -mt-12 mb-6"
                        }`}
                    >
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
                                {isBusinessUser
                                  ? userData?.businessName?.charAt(0) || "B"
                                  : userData?.name?.charAt(0) || "U"}
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
                    <div
                      className={`${isBusinessUser ? "pt-20" : "pt-0"
                        } space-y-6`}
                    >
                      {/* Name, username and bio section */}
                      <div className="space-y-4">
                        {/* Name and badges */}
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="space-y-3">
                              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex flex-wrap items-center gap-3">
                                {isBusinessUser
                                  ? userData?.businessName || userData?.name
                                  : userData?.name}
                                {isBusinessUser &&
                                  userData?.role === "member" ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 border-violet-200 px-3 py-1 text-sm font-medium rounded-full"
                                  >
                                    Member
                                  </Badge>
                                ) : isBusinessUser && userData?.isFranchise ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 px-3 py-1 text-sm font-medium rounded-full"
                                  >
                                    Franchise
                                  </Badge>
                                ) : isBusinessUser ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-gradient-to-r from-amber-50 to-orange-100 text-amber-700 border-amber-200 px-3 py-1 text-sm font-medium rounded-full"
                                  >
                                    Headquarters
                                  </Badge>
                                ) : null}
                              </h1>

                              <div className="flex items-center text-gray-600 gap-2 text-lg">
                                <div className="p-2 rounded-full bg-gray-100">
                                  <User className="w-4 h-4" />
                                </div>
                                <span className="font-medium">
                                  @{userData?.username}
                                </span>
                              </div>
                            </div>

                            {/* Action buttons with Switch Location */}
                            <div className="flex flex-wrap gap-3 sm:flex-shrink-0">
                              {isCurrentUser && (
                                <Button
                                  asChild
                                  className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
                                >
                                  <Link
                                    href={
                                      isBusinessUser
                                        ? "/profile/settings"
                                        : "/profile/settings/user"
                                    }
                                  >
                                    <EditIcon className="w-4 h-4 mr-2" />
                                    <span className="font-medium">Edit Profile</span>
                                  </Link>
                                </Button>
                              )}

                              {/* Switch Location Dropdown */}
                              {isBusinessUser &&
                                hasFranchises &&
                                !userData?.franchiseOwner && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="gap-3 px-6 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                                      >
                                        {loadingFranchises ? (
                                          <RefreshCw className="h-5 w-5 animate-spin" />
                                        ) : selectedFranchiseId ? (
                                          <div className="p-1.5 rounded-lg bg-blue-100">
                                            <Store className="h-4 w-4 text-blue-600" />
                                          </div>
                                        ) : (
                                          <div className="p-1.5 rounded-lg bg-amber-100">
                                            <Building2 className="h-4 w-4 text-amber-600" />
                                          </div>
                                        )}
                                        <div className="flex flex-col items-start">
                                          <span className="font-medium">
                                            {loadingFranchises
                                              ? "Loading..."
                                              : selectedFranchiseId
                                                ? franchises.find(
                                                  (f) =>
                                                    f.id === selectedFranchiseId
                                                )?.businessName || "Franchise"
                                                : "Headquarters"}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className={`text-xs px-2 py-0.5 ${selectedFranchiseId
                                                ? "bg-blue-50 text-blue-600 border-blue-200"
                                                : "bg-amber-50 text-amber-600 border-amber-200"
                                              }`}
                                          >
                                            {selectedFranchiseId ? "Franchise" : "HQ"}
                                          </Badge>
                                        </div>
                                        <ChevronDown className="h-4 w-4 ml-2" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="start"
                                      className="w-72 rounded-2xl shadow-xl border-0 bg-white/95 backdrop-blur-sm"
                                    >
                                      <DropdownMenuLabel className="px-4 py-3 text-lg font-semibold">
                                        Switch Location
                                      </DropdownMenuLabel>
                                      <DropdownMenuSeparator />

                                      <DropdownMenuItem
                                        className="flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl mx-2 hover:bg-amber-50"
                                        onClick={() =>
                                          handleSwitchFranchise("headquarters")
                                        }
                                      >
                                        <div className="p-2 rounded-lg bg-amber-100">
                                          <HomeIcon className="h-4 w-4 text-amber-600" />
                                        </div>
                                        <div className="flex-1">
                                          <span className="font-medium">
                                            Headquarters
                                          </span>
                                        </div>
                                        {!selectedFranchiseId && (
                                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                            Current
                                          </Badge>
                                        )}
                                      </DropdownMenuItem>

                                      {franchises.map((franchise) => (
                                        <DropdownMenuItem
                                          key={franchise.id}
                                          className="flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl mx-2 hover:bg-blue-50"
                                          onClick={() =>
                                            handleSwitchFranchise(franchise.id)
                                          }
                                        >
                                          <div className="p-2 rounded-lg bg-blue-100">
                                            <Store className="h-4 w-4 text-blue-600" />
                                          </div>
                                          <div className="flex-1">
                                            <span className="font-medium">
                                              {franchise.businessName || "Franchise"}
                                            </span>
                                          </div>
                                          {selectedFranchiseId === franchise.id && (
                                            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                              Current
                                            </Badge>
                                          )}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}

                              {/* Exit Franchise View Button */}
                              {selectedFranchiseId && (
                                <Button
                                  variant="outline"
                                  className="gap-2 px-6 py-3 h-auto rounded-2xl border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                                  onClick={exitFranchiseView}
                                >
                                  <ArrowLeftIcon className="h-4 w-4" />
                                  Exit Franchise View
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Bio section */}
                          {isBusinessUser && userData?.bio && (
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
                        {isBusinessUser ? (
                          <>
                            <FollowingDialog
                              followingCount={followingCount}
                              userId={userId}
                              className="flex flex-col items-center pl-4 border-l border-gray-300"
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
                          </>
                        ) : (
                          <div className="col-span-4 flex justify-center">
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
                          </div>
                        )}
                      </div>

                      {/* Location map with modern styling */}
                      {showLocationIFrame && (
                        <div className="rounded-3xl border border-gray-200 overflow-hidden bg-white shadow-lg">
                          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                            <h3 className="font-bold text-lg flex items-center gap-3 text-gray-900">
                              <div className="p-2 rounded-xl bg-green-100">
                                <MapPinIcon className="w-5 h-5 text-green-600" />
                              </div>
                              {isBusinessUser
                                ? "Business Location"
                                : "User Location"}
                            </h3>
                            {userData?.locations?.address && (
                              <div className="mt-2 text-gray-700 ml-11">
                                {userData.locations.address}
                              </div>
                            )}
                          </div>
                          <div className="h-[350px] w-full relative">
                            {userData?.location?.latitude &&
                              userData?.location?.longitude ? (
                              <MapComponent
                                location={{
                                  lat: userData.location.latitude,
                                  lng: userData.location.longitude,
                                }}
                                name={
                                  isBusinessUser
                                    ? userData?.businessName
                                    : userData?.name
                                }
                                address={
                                  userData?.locations?.address || "Location"
                                }
                              />
                            ) : (
                              <div className="flex justify-center items-center h-full bg-gray-50">
                                <div className="text-center">
                                  <MapPinIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                  <p className="text-gray-500 font-medium">
                                    No location data available
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Email verification warning with modern design */}
                {!isEmailVerified && (
                  <div className="rounded-3xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-200 p-6 shadow-lg">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 rounded-full bg-amber-100">
                        <Mail className="w-8 h-8 text-amber-600" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-amber-900">
                          Email Verification Required
                        </h3>
                        <p className="text-amber-800 max-w-md">
                          Please verify your email address to access all
                          platform features and ensure account security.
                        </p>
                      </div>
                      <Button
                        onClick={verifyEmailHandler}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-3 h-auto font-semibold"
                      >
                        Verify Email Address
                      </Button>
                    </div>
                  </div>
                )}

                {/* Content tabs with modern design */}
                {isEmailVerified && isBusinessUser && (
                  <Suspense fallback={<LoadingSpinner />}>
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
                              title="View Posts"
                            >
                              <div className="p-1.5 rounded-lg bg-blue-100 data-[state=active]:bg-blue-100">
                                <FileTextIcon className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="hidden sm:block">
                                Posts
                                {userData?.role === "member" &&
                                  " from Business"}
                              </span>
                            </TabsTrigger>

                            {hasFranchises && !selectedFranchiseId && (
                              <TabsTrigger
                                value="franchises"
                                title="Your Franchises"
                                className={cn(
                                  "rounded-2xl flex-1 transition-all duration-300",
                                  "data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg",
                                  "px-4 py-4 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/50"
                                )}
                              >
                                <div className="p-1.5 rounded-lg bg-purple-100">
                                  <Building2 className="w-4 h-4 text-purple-600" />
                                </div>
                                <span className="hidden sm:block">
                                  Franchises
                                </span>
                              </TabsTrigger>
                            )}

                            <TabsTrigger
                              value="likes"
                              title="Liked Posts"
                              className={cn(
                                "rounded-2xl flex-1 transition-all duration-300",
                                "data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-lg",
                                "px-4 py-4 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/50"
                              )}
                            >
                              <div className="p-1.5 rounded-lg bg-red-100">
                                <HeartIcon className="w-4 h-4 text-red-600" />
                              </div>
                              <span className="hidden sm:block">Likes</span>
                            </TabsTrigger>

                            <TabsTrigger
                              value="photos"
                              title="Photos"
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

                            {userData?.business_categories?.includes(
                              "product"
                            ) && (
                                <TabsTrigger
                                  title="Products"
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
                                  <span className="hidden sm:block">
                                    Products
                                  </span>
                                </TabsTrigger>
                              )}

                            {userData?.business_categories?.includes(
                              "service"
                            ) && (
                                <TabsTrigger
                                  value="services"
                                  title="Services"
                                  className={cn(
                                    "rounded-2xl flex-1 transition-all duration-300",
                                    "data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg",
                                    "px-4 py-4 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/50"
                                  )}
                                >
                                  <div className="p-1.5 rounded-lg bg-indigo-100">
                                    <Settings className="w-4 h-4 text-indigo-600" />
                                  </div>
                                  <span className="hidden sm:block">
                                    Services
                                  </span>
                                </TabsTrigger>
                              )}

                            {userData?.business_categories?.includes(
                              "real-estate"
                            ) && (
                                <TabsTrigger
                                  value="properties"
                                  title="Properties"
                                  className={cn(
                                    "rounded-2xl flex-1 transition-all duration-300",
                                    "data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-lg",
                                    "px-4 py-4 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/50"
                                  )}
                                >
                                  <div className="p-1.5 rounded-lg bg-teal-100">
                                    <Home className="w-4 h-4 text-teal-600" />
                                  </div>
                                  <span className="hidden sm:block">
                                    Properties
                                  </span>
                                </TabsTrigger>
                              )}

                            <TabsTrigger
                              value="saved"
                              title="Saved Posts"
                              className={cn(
                                "rounded-2xl flex-1 transition-all duration-300",
                                "data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-lg",
                                "px-4 py-4 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/50"
                              )}
                            >
                              <div className="p-1.5 rounded-lg bg-pink-100">
                                <Bookmark className="w-4 h-4 text-pink-600" />
                              </div>
                              <span className="hidden sm:block">Saved</span>
                            </TabsTrigger>

                            <TabsTrigger
                              value="orders"
                              title="Your Orders"
                              className={cn(
                                "rounded-2xl flex-1 transition-all duration-300",
                                "data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg",
                                "px-4 py-4 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/50"
                              )}
                            >
                              <div className="p-1.5 rounded-lg bg-emerald-100">
                                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                              </div>
                              <span className="hidden sm:block">Orders</span>
                            </TabsTrigger>
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
                            {renderPosts}
                          </div>
                        </TabsContent>

                        {/* Franchises tab content with modern design */}
                        {hasFranchises && !selectedFranchiseId && (
                          <TabsContent
                            value="franchises"
                            className="p-8 focus-visible:outline-none focus:outline-none transition-all duration-300 animate-in fade-in-50"
                          >
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h2 className="text-2xl font-bold text-gray-900">
                                    Your Franchises
                                  </h2>
                                  <p className="text-gray-600 mt-1">
                                    Manage all your franchise locations.
                                  </p>
                                </div>
                                <Button
                                  onClick={() => setIsFranchiseModalOpen(true)}
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
                                >
                                  <PlusCircle className="h-4 w-4 mr-2" />
                                  Add New Franchise
                                </Button>
                              </div>

                              {loadingFranchises ? (
                                <div className="flex justify-center py-12">
                                  <Loader />
                                </div>
                              ) : franchises.length === 0 ? (
                                <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border border-gray-200">
                                  <div className="p-4 rounded-full bg-blue-100 w-fit mx-auto mb-4">
                                    <Building2 className="w-12 h-12 text-blue-600" />
                                  </div>
                                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    No franchises yet
                                  </h3>
                                  <p className="text-gray-600 mb-6">
                                    Add a franchise to expand your business
                                    reach.
                                  </p>
                                  <Button
                                    onClick={() =>
                                      setIsFranchiseModalOpen(true)
                                    }
                                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-3 h-auto"
                                  >
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Create First Franchise
                                  </Button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {franchises.map((franchise) => (
                                    <Card
                                      key={franchise.id}
                                      className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                                    >
                                      <CardHeader className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                                        <div className="flex justify-between items-start">
                                          <div className="flex items-center gap-4">
                                            <Avatar className="h-14 w-14 border-3 border-white shadow-lg">
                                              <AvatarImage
                                                src={
                                                  franchise.profilePic ||
                                                  "/avatar.png"
                                                }
                                                alt={franchise.businessName}
                                              />
                                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                                                {franchise.businessName?.charAt(
                                                  0
                                                ) || "F"}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div>
                                              <h3 className="font-bold text-lg text-gray-900">
                                                {franchise.businessName}
                                              </h3>
                                              <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                                <MapPinIcon className="w-3 h-3" />
                                                {franchise.locations?.address ||
                                                  "No address"}
                                              </p>
                                            </div>
                                          </div>
                                          <Badge
                                            variant="outline"
                                            className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 px-3 py-1 rounded-full font-semibold"
                                          >
                                            Franchise
                                          </Badge>
                                        </div>
                                      </CardHeader>
                                      <CardContent className="p-6">
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                          <div className="space-y-1">
                                            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                                              Admin
                                            </span>
                                            <p className="font-semibold text-gray-900">
                                              {franchise.adminName}
                                            </p>
                                          </div>
                                          <div className="space-y-1">
                                            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                                              Contact
                                            </span>
                                            <p className="font-semibold text-gray-900">
                                              {franchise.phone}
                                            </p>
                                          </div>
                                          <div className="space-y-1 col-span-2">
                                            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                                              Email
                                            </span>
                                            <p className="font-semibold text-gray-900 truncate">
                                              {franchise.email}
                                            </p>
                                          </div>
                                          <div className="space-y-1 col-span-2">
                                            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                                              Created
                                            </span>
                                            <p className="font-semibold text-gray-900">
                                              {franchise.createdAt?.toDate
                                                ? format(
                                                  new Date(
                                                    franchise.createdAt?.toDate()
                                                  ),
                                                  "MMM d, yyyy"
                                                )
                                                : "N/A"}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex gap-3">
                                          <Button
                                            variant="outline"
                                            className="gap-2 text-blue-700 border-blue-200 hover:bg-blue-50 hover:border-blue-300 flex-1 rounded-2xl py-3 h-auto font-semibold transition-all duration-200"
                                            onClick={() =>
                                              handleSwitchFranchise(
                                                franchise.id
                                              )
                                            }
                                          >
                                            <Store className="h-4 w-4" />
                                            <span>View Franchise</span>
                                          </Button>

                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                variant="outline"
                                                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 rounded-2xl py-3 px-4 h-auto transition-all duration-200"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="rounded-3xl border-0 shadow-2xl">
                                              <AlertDialogHeader>
                                                <AlertDialogTitle className="text-2xl font-bold text-red-600">
                                                  Delete Franchise
                                                </AlertDialogTitle>
                                                <AlertDialogDescription className="text-lg text-gray-600">
                                                  Are you sure you want to
                                                  delete this franchise? This
                                                  action cannot be undone and
                                                  will remove the franchise
                                                  administrator account.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter className="gap-3">
                                                <AlertDialogCancel className="rounded-2xl px-6 py-3 h-auto">
                                                  Cancel
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-2xl px-6 py-3 h-auto"
                                                  onClick={() => {
                                                    // Delete franchise handler would go here
                                                    console.log(
                                                      "Delete franchise:",
                                                      franchise.id
                                                    );
                                                  }}
                                                >
                                                  Delete Franchise
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        )}

                        {/* Likes tab */}
                        <TabsContent
                          value="likes"
                          className="p-8 focus-visible:outline-none focus:outline-none transition-all duration-300 animate-in fade-in-50"
                        >
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <h2 className="text-2xl font-bold text-gray-900">
                                Liked Posts
                              </h2>
                              <div className="text-sm text-gray-500 bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-200">
                                {likedPosts.length} likes
                              </div>
                            </div>
                            <div className="space-y-4">
                              {likedPosts.length === 0 ? (
                                <div className="text-center py-16 bg-gradient-to-br from-red-50 to-pink-50 rounded-3xl border border-red-100">
                                  <div className="p-4 rounded-full bg-red-100 w-fit mx-auto mb-4">
                                    <Heart className="w-12 h-12 text-red-600" />
                                  </div>
                                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    No liked posts yet
                                  </h3>
                                  <p className="text-gray-600">
                                    Start liking posts to see them here.
                                  </p>
                                </div>
                              ) : (
                                likedPosts.map((post, index) => (
                                  <Card
                                    key={index}
                                    className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm shadow-lg rounded-3xl hover:-translate-y-1"
                                  >
                                    <CardContent className="p-6">
                                      <PostCard post={post} onView={() => router.push(`/feed/${post.id || post.postId}`)} />
                                    </CardContent>
                                  </Card>
                                ))
                              )}
                            </div>
                          </div>
                        </TabsContent>

                        {/* Photos tab */}
                        <TabsContent
                          value="photos"
                          className="p-8 focus-visible:outline-none focus:outline-none transition-all duration-300 animate-in fade-in-50"
                        >
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <h2 className="text-2xl font-bold text-gray-900">
                                Photos
                              </h2>
                              <div className="flex items-center gap-3">
                                {auth.currentUser && (
                                  <Button
                                    onClick={openAddPhotoModal}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-4 py-2 h-auto"
                                  >
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Add Photo
                                  </Button>
                                )}
                              </div>
                            </div>
                            {userData && (
                              <>
                                {loadingPhotos ? (
                                  <div className="flex justify-center py-12">
                                    <Loader />
                                  </div>
                                ) : (
                                  <>
                                    <PhotosGrid
                                      photos={userPhotos}
                                      userId={userData.uid}
                                      onPhotoDeleted={() => { }}
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
                          </div>
                        </TabsContent>

                        {/* Products tab */}
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
                              {userData && user && (
                                <ShowProductsTabContent
                                  userId={userId}
                                  userData={userData}
                                  currentUserView={true}
                                />
                              )}
                            </div>
                          </TabsContent>
                        )}

                        {/* Services tab */}
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
                              {userData && user && (
                                <ShowServicesTabContent
                                  userId={userId}
                                  userData={userData}
                                />
                              )}
                            </div>
                          </TabsContent>
                        )}

                        {/* Properties tab */}
                        {userData?.business_categories?.includes(
                          "real-estate"
                        ) && (
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
                                {userData && user && <ShowPropertiesTabContent />}
                              </div>
                            </TabsContent>
                          )}

                        {/* Saved Posts tab */}
                        <TabsContent
                          value="saved"
                          className="p-8 focus-visible:outline-none focus:outline-none transition-all duration-300 animate-in fade-in-50"
                        >
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <h2 className="text-2xl font-bold text-gray-900">
                                Saved Posts
                              </h2>
                              <div className="text-sm text-gray-500 bg-pink-50 text-pink-600 px-3 py-1 rounded-full border border-pink-200">
                                {savedPosts.length} saved
                              </div>
                            </div>
                            <div className="space-y-4">
                              {loadingSavedPosts ? (
                                <div className="flex justify-center py-12">
                                  <Loader />
                                </div>
                              ) : savedPosts.length === 0 ? (
                                <div className="text-center py-16 bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl border border-pink-100">
                                  <div className="p-4 rounded-full bg-pink-100 w-fit mx-auto mb-4">
                                    <Bookmark className="w-12 h-12 text-pink-600" />
                                  </div>
                                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    No saved posts yet
                                  </h3>
                                  <p className="text-gray-600">
                                    Save posts to read them later.
                                  </p>
                                </div>
                              ) : (
                                savedPosts.map(renderSavedPostCard)
                              )}
                            </div>
                          </div>
                        </TabsContent>

                        {/* Orders tab */}
                        <TabsContent
                          value="orders"
                          className="p-8 focus-visible:outline-none focus:outline-none transition-all duration-300 animate-in fade-in-50"
                        >
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <h2 className="text-2xl font-bold text-gray-900">
                                Your Orders
                              </h2>
                              <div className="text-sm text-gray-500 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-200">
                                {orders.length} orders
                              </div>
                            </div>

                            {loadingOrders ? (
                              <div className="flex justify-center py-12">
                                <Loader />
                              </div>
                            ) : orders.length === 0 ? (
                              <div className="text-center py-16 bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl border border-emerald-100">
                                <div className="p-4 rounded-full bg-emerald-100 w-fit mx-auto mb-4">
                                  <ShoppingCart className="w-12 h-12 text-emerald-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                  No orders yet
                                </h3>
                                <p className="text-gray-600">
                                  Your purchase history will appear here.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                {orders.map((order) => (
                                  <Card
                                    key={order.id}
                                    className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl hover:shadow-2xl transition-all duration-300"
                                  >
                                    <CardHeader className="p-6 bg-gradient-to-r from-emerald-50 to-green-50">
                                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-lg text-gray-900">
                                              Order #
                                              {order.orderId.substring(0, 8)}...
                                            </h3>
                                            <Badge
                                              variant={
                                                order.status === "completed"
                                                  ? "success"
                                                  : "outline"
                                              }
                                              className={`px-3 py-1 rounded-full font-semibold ${order.status === "completed"
                                                  ? "bg-green-100 text-green-700 border-green-200"
                                                  : "bg-gray-100 text-gray-700 border-gray-200"
                                                }`}
                                            >
                                              {order.status === "completed"
                                                ? "Completed"
                                                : order.status}
                                            </Badge>
                                          </div>
                                          <p className="text-gray-600 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            {format(
                                              new Date(order.timestamp),
                                              "MMM d, yyyy · h:mm a"
                                            )}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-2xl font-bold text-gray-900">
                                            ₹{order.amount?.toFixed(2)}
                                          </p>
                                          <p className="text-gray-600 font-medium">
                                            {order.businessName}
                                          </p>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                      <div className="px-6 py-4 bg-white border-b border-gray-100">
                                        <div className="flex justify-between items-center">
                                          <h4 className="font-semibold text-gray-900">
                                            Order Items
                                          </h4>
                                          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                            {order.products?.length || 0}{" "}
                                            item(s)
                                          </span>
                                        </div>
                                      </div>

                                      <div className="divide-y divide-gray-100">
                                        {order.products?.map((product, idx) => (
                                          <div
                                            key={idx}
                                            className="p-6 flex items-center gap-4 hover:bg-gray-50 transition-colors duration-200"
                                          >
                                            <div className="relative w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden flex-shrink-0">
                                              {product.imageUrl ? (
                                                <Image
                                                  src={product.imageUrl}
                                                  alt={product.productName}
                                                  fill
                                                  className="object-cover"
                                                />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                  <Package className="w-8 h-8" />
                                                </div>
                                              )}
                                            </div>

                                            <div className="flex-grow space-y-2">
                                              <h5 className="font-semibold text-gray-900">
                                                {product.productName}
                                              </h5>
                                              <div className="flex items-center text-gray-600">
                                                <span className="text-sm">
                                                  ₹{product.amount?.toFixed(2)}{" "}
                                                  × {product.quantity}
                                                </span>
                                              </div>

                                              {order.status === "completed" && (
                                                <div className="mt-3">
                                                  {productRatings[
                                                    product.productId
                                                  ] ? (
                                                    <div className="space-y-2">
                                                      {renderStarRating(
                                                        productRatings[
                                                          product.productId
                                                        ].rating
                                                      )}
                                                      <div className="flex items-center justify-between">
                                                        <span className="text-sm text-green-600 font-medium">
                                                          ✓ You rated this
                                                          product
                                                        </span>
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          className="text-sm h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenRatingDialog(
                                                              product,
                                                              order
                                                            );
                                                          }}
                                                        >
                                                          Edit Rating
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="text-sm h-9 px-4 rounded-2xl border-2 hover:bg-yellow-50 hover:border-yellow-300"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenRatingDialog(
                                                          product,
                                                          order
                                                        );
                                                      }}
                                                    >
                                                      <Star className="h-4 w-4 mr-2" />
                                                      Rate & Review
                                                    </Button>
                                                  )}
                                                </div>
                                              )}
                                            </div>

                                            <div className="text-right">
                                              <p className="text-lg font-bold text-gray-900">
                                                ₹
                                                {(
                                                  product.amount *
                                                  product.quantity
                                                ).toFixed(2)}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
                                        <div className="flex flex-col gap-4">
                                          <div className="flex justify-between items-center">
                                            <span className="text-lg font-semibold text-gray-900">
                                              Total Amount
                                            </span>
                                            <span className="text-2xl font-bold text-gray-900">
                                              ₹{order.amount?.toFixed(2)}
                                            </span>
                                          </div>
                                          <Button
                                            variant="outline"
                                            className="flex items-center justify-center gap-2 w-full py-3 h-auto rounded-2xl border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-semibold transition-all duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleGenerateBill(order);
                                            }}
                                          >
                                            <FileText className="h-5 w-5" />
                                            <span>Generate Invoice</span>
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </Card>
                  </Suspense>
                )}

                {/* Saved Posts tab for regular users with modern design */}
                {isEmailVerified && !isBusinessUser && (
                  <Suspense fallback={<LoadingSpinner />}>
                    <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm rounded-3xl">
                      <Tabs defaultValue="saved" className="w-full">
                        <div className="border-b border-gray-200 overflow-x-auto scrollbar-hide bg-gradient-to-r from-gray-50 to-gray-100">
                          <TabsList className="justify-between h-auto p-2 bg-transparent w-full flex gap-1">
                            <TabsTrigger
                              title="Saved Posts"
                              value="saved"
                              className={cn(
                                "rounded-2xl flex-1 transition-all duration-300",
                                "data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-lg",
                                "px-6 py-4 font-semibold text-sm flex items-center justify-center gap-3 hover:bg-white/50"
                              )}
                            >
                              <div className="p-1.5 rounded-lg bg-pink-100">
                                <Bookmark className="w-4 h-4 text-pink-600" />
                              </div>
                              <span>Saved Posts</span>
                            </TabsTrigger>
                            <TabsTrigger
                              title="Liked Posts"
                              value="likes"
                              className={cn(
                                "rounded-2xl flex-1 transition-all duration-300",
                                "data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-lg",
                                "px-6 py-4 font-semibold text-sm flex items-center justify-center gap-3 hover:bg-white/50"
                              )}
                            >
                              <div className="p-1.5 rounded-lg bg-red-100">
                                <HeartIcon className="w-4 h-4 text-red-600" />
                              </div>
                              <span>Liked Posts</span>
                            </TabsTrigger>
                            <TabsTrigger
                              title="Your Orders"
                              value="orders"
                              className={cn(
                                "rounded-2xl flex-1 transition-all duration-300",
                                "data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg",
                                "px-6 py-4 font-semibold text-sm flex items-center justify-center gap-3 hover:bg-white/50"
                              )}
                            >
                              <div className="p-1.5 rounded-lg bg-emerald-100">
                                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                              </div>
                              <span>Orders</span>
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <TabsContent
                          value="saved"
                          className="p-8 focus-visible:outline-none focus:outline-none transition-all duration-300 animate-in fade-in-50"
                        >
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <h2 className="text-2xl font-bold text-gray-900">
                                Saved Posts
                              </h2>
                              <div className="text-sm text-gray-500 bg-pink-50 text-pink-600 px-3 py-1 rounded-full border border-pink-200">
                                {savedPosts.length} saved
                              </div>
                            </div>
                            <div className="space-y-4">
                              {loadingSavedPosts ? (
                                <div className="flex justify-center py-12">
                                  <Loader />
                                </div>
                              ) : savedPosts.length === 0 ? (
                                <div className="text-center py-16 bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl border border-pink-100">
                                  <div className="p-4 rounded-full bg-pink-100 w-fit mx-auto mb-4">
                                    <Bookmark className="w-12 h-12 text-pink-600" />
                                  </div>
                                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    No saved posts yet
                                  </h3>
                                  <p className="text-gray-600">
                                    Save posts to read them later.
                                  </p>
                                </div>
                              ) : (
                                savedPosts.map(renderSavedPostCard)
                              )}
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent
                          value="likes"
                          className="p-8 focus-visible:outline-none focus:outline-none transition-all duration-300 animate-in fade-in-50"
                        >
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <h2 className="text-2xl font-bold text-gray-900">
                                Liked Posts
                              </h2>
                              <div className="text-sm text-gray-500 bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-200">
                                {likedPosts.length} likes
                              </div>
                            </div>
                            <div className="space-y-4">
                              {likedPosts.length === 0 ? (
                                <div className="text-center py-16 bg-gradient-to-br from-red-50 to-pink-50 rounded-3xl border border-red-100">
                                  <div className="p-4 rounded-full bg-red-100 w-fit mx-auto mb-4">
                                    <Heart className="w-12 h-12 text-red-600" />
                                  </div>
                                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    No liked posts yet
                                  </h3>
                                  <p className="text-gray-600">
                                    Start liking posts to see them here.
                                  </p>
                                </div>
                              ) : (
                                likedPosts.map((post, index) => (
                                  <Card
                                    key={index}
                                    className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm shadow-lg rounded-3xl hover:-translate-y-1"
                                  >
                                    <CardContent className="p-6">
                                      <PostCard post={post} onView={() => router.push(`/feed/${post.id || post.postId}`)} />
                                    </CardContent>
                                  </Card>
                                ))
                              )}
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent
                          value="orders"
                          className="p-8 focus-visible:outline-none focus:outline-none transition-all duration-300 animate-in fade-in-50"
                        >
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <h2 className="text-2xl font-bold text-gray-900">
                                Your Orders
                              </h2>
                              <div className="text-sm text-gray-500 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-200">
                                {orders.length} orders
                              </div>
                            </div>

                            {/* Same orders content as business users */}
                            {loadingOrders ? (
                              <div className="flex justify-center py-12">
                                <Loader />
                              </div>
                            ) : orders.length === 0 ? (
                              <div className="text-center py-16 bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl border border-emerald-100">
                                <div className="p-4 rounded-full bg-emerald-100 w-fit mx-auto mb-4">
                                  <ShoppingCart className="w-12 h-12 text-emerald-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                  No orders yet
                                </h3>
                                <p className="text-gray-600">
                                  Your purchase history will appear here.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                {orders.map((order) => (
                                  <Card
                                    key={order.id}
                                    className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl hover:shadow-2xl transition-all duration-300"
                                  >
                                    {/* Same order card content as above */}
                                    <CardHeader className="p-6 bg-gradient-to-r from-emerald-50 to-green-50">
                                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-lg text-gray-900">
                                              Order #
                                              {order.orderId.substring(0, 8)}...
                                            </h3>
                                            <Badge
                                              variant={
                                                order.status === "completed"
                                                  ? "success"
                                                  : "outline"
                                              }
                                              className={`px-3 py-1 rounded-full font-semibold ${order.status === "completed"
                                                  ? "bg-green-100 text-green-700 border-green-200"
                                                  : "bg-gray-100 text-gray-700 border-gray-200"
                                                }`}
                                            >
                                              {order.status === "completed"
                                                ? "Completed"
                                                : order.status}
                                            </Badge>
                                          </div>
                                          <p className="text-gray-600 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            {format(
                                              new Date(order.timestamp),
                                              "MMM d, yyyy · h:mm a"
                                            )}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-2xl font-bold text-gray-900">
                                            ₹{order.amount?.toFixed(2)}
                                          </p>
                                          <p className="text-gray-600 font-medium">
                                            {order.businessName}
                                          </p>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                      <div className="px-6 py-4 bg-white border-b border-gray-100">
                                        <div className="flex justify-between items-center">
                                          <h4 className="font-semibold text-gray-900">
                                            Order Items
                                          </h4>
                                          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                            {order.products?.length || 0}{" "}
                                            item(s)
                                          </span>
                                        </div>
                                      </div>

                                      <div className="divide-y divide-gray-100">
                                        {order.products?.map((product, idx) => (
                                          <div
                                            key={idx}
                                            className="p-6 flex items-center gap-4 hover:bg-gray-50 transition-colors duration-200"
                                          >
                                            <div className="relative w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden flex-shrink-0">
                                              {product.imageUrl ? (
                                                <Image
                                                  src={product.imageUrl}
                                                  alt={product.productName}
                                                  fill
                                                  className="object-cover"
                                                />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                  <Package className="w-8 h-8" />
                                                </div>
                                              )}
                                            </div>

                                            <div className="flex-grow space-y-2">
                                              <h5 className="font-semibold text-gray-900">
                                                {product.productName}
                                              </h5>
                                              <div className="flex items-center text-gray-600">
                                                <span className="text-sm">
                                                  ₹{product.amount?.toFixed(2)}{" "}
                                                  × {product.quantity}
                                                </span>
                                              </div>

                                              {order.status === "completed" && (
                                                <div className="mt-3">
                                                  {productRatings[
                                                    product.productId
                                                  ] ? (
                                                    <div className="space-y-2">
                                                      {renderStarRating(
                                                        productRatings[
                                                          product.productId
                                                        ].rating
                                                      )}
                                                      <div className="flex items-center justify-between">
                                                        <span className="text-sm text-green-600 font-medium">
                                                          ✓ You rated this
                                                          product
                                                        </span>
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          className="text-sm h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenRatingDialog(
                                                              product,
                                                              order
                                                            );
                                                          }}
                                                        >
                                                          Edit Rating
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="text-sm h-9 px-4 rounded-2xl border-2 hover:bg-yellow-50 hover:border-yellow-300"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenRatingDialog(
                                                          product,
                                                          order
                                                        );
                                                      }}
                                                    >
                                                      <Star className="h-4 w-4 mr-2" />
                                                      Rate & Review
                                                    </Button>
                                                  )}
                                                </div>
                                              )}
                                            </div>

                                            <div className="text-right">
                                              <p className="text-lg font-bold text-gray-900">
                                                ₹
                                                {(
                                                  product.amount *
                                                  product.quantity
                                                ).toFixed(2)}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
                                        <div className="flex flex-col gap-4">
                                          <div className="flex justify-between items-center">
                                            <span className="text-lg font-semibold text-gray-900">
                                              Total Amount
                                            </span>
                                            <span className="text-2xl font-bold text-gray-900">
                                              ₹{order.amount?.toFixed(2)}
                                            </span>
                                          </div>
                                          <Button
                                            variant="outline"
                                            className="flex items-center justify-center gap-2 w-full py-3 h-auto rounded-2xl border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-semibold transition-all duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleGenerateBill(order);
                                            }}
                                          >
                                            <FileText className="h-5 w-5" />
                                            <span>Generate Invoice</span>
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </Card>
                  </Suspense>
                )}
              </>
            )}
          </main>

          {/* Right sidebar - Quick Actions */}
          <aside className="hidden xl:block w-80 space-y-6">
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {isCurrentUser && isBusinessUser && (
                  <>
                    {/* Dashboard */}
                    <Button
                      asChild
                      variant="outline"
                      className="w-full justify-start gap-3 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    >
                      <Link href="/dashboard">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                    </Button>

                    {/* Build Website */}
                    <Button
                      asChild
                      variant="outline"
                      className="w-full justify-start gap-3 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    >
                      <Link href="/websites">
                        <Globe className="w-4 h-4" />
                        Build Website
                      </Link>
                    </Button>

                    {/* Share Business - full width */}
                    {userData && (
                      <ShareBusinessDialog
                        userData={userData}
                        buttonText="Share"
                        buttonClassName="w-full justify-start gap-3 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      />
                    )}

                    {/* Flat buttons replacing dropdown */}
                    <Button
                      variant="outline"
                      onClick={toggleLocationIFrame}
                      className="w-full justify-start gap-3 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    >
                      <MapPinIcon className="w-4 h-4" />
                      Location
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => router.push('/profile/calls')}
                      className="w-full justify-start gap-3 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    >
                      <PhoneCall className="w-4 h-4" />
                      Manage AI Calls
                    </Button>

                    {userData && !selectedFranchiseId && !userData?.franchiseOwner && (
                      <Button
                        variant="outline"
                        onClick={() => setIsFranchiseModalOpen(true)}
                        className="w-full justify-start gap-3 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      >
                        <Globe className="w-4 h-4" />
                        Add Franchise
                      </Button>
                    )}

                    {selectedFranchiseId && (
                      <Button
                        variant="outline"
                        onClick={exitFranchiseView}
                        className="w-full justify-start gap-3 py-3 h-auto rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Return to {userData?.franchiseOwner ? 'Business' : 'HQ'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Card>
          </aside>
        </div>
      </div>

      {/* Confirmation Dialog for Unsaving Posts */}
      <AlertDialog
        open={isUnsaveDialogOpen}
        onOpenChange={setIsUnsaveDialogOpen}
      >
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-gray-900">
              Unsave Post
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg text-gray-600">
              Are you sure you want to remove this post from your saved posts?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-2xl px-6 py-3 h-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnsave}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-2xl px-6 py-3 h-auto"
            >
              Unsave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Franchise Modal */}
      <Suspense fallback={<LoadingSpinner />}>
        <FranchiseModal
          isOpen={isFranchiseModalOpen}
          onOpenChange={setIsFranchiseModalOpen}
        />
      </Suspense>

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {productRatings[selectedProductForRating?.productId]
                ? "Edit Your Rating"
                : "Rate Product"}
            </DialogTitle>
            <DialogDescription className="text-lg text-gray-600">
              Share your experience with {selectedProductForRating?.productName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="flex flex-col items-center gap-4">
              <span className="text-lg font-semibold text-gray-900">
                How would you rate this product?
              </span>
              <div className="p-4 bg-gray-50 rounded-2xl">
                {renderStarRating(ratingValue, true)}
              </div>
              <span className="text-sm text-gray-600 font-medium">
                {ratingValue === 0 && "Select a rating"}
                {ratingValue === 1 && "Poor"}
                {ratingValue === 2 && "Fair"}
                {ratingValue === 3 && "Good"}
                {ratingValue === 4 && "Very Good"}
                {ratingValue === 5 && "Excellent"}
              </span>
            </div>

            <div className="space-y-3">
              <label
                htmlFor="feedback"
                className="text-lg font-semibold text-gray-900"
              >
                Your Review (Optional)
              </label>
              <Textarea
                id="feedback"
                placeholder="Share your experience with this product..."
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                rows={4}
                className="rounded-2xl border-2 border-gray-200 focus:border-blue-400 focus:ring-0 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setRatingDialogOpen(false)}
              className="rounded-2xl px-6 py-3 h-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRating}
              disabled={ratingValue === 0 || isSubmittingRating}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-2xl px-6 py-3 h-auto"
            >
              {isSubmittingRating ? (
                <>
                  <Loader />
                  {productRatings[selectedProductForRating?.productId]
                    ? "Updating..."
                    : "Submitting..."}
                </>
              ) : productRatings[selectedProductForRating?.productId] ? (
                "Update Rating"
              ) : (
                "Submit Rating"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill Generation Dialog */}
      <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Invoice
            </DialogTitle>
            <DialogDescription className="text-lg text-gray-600">
              Order #{selectedOrder?.orderId?.substring(0, 8)} details
            </DialogDescription>
          </DialogHeader>

          <div
            ref={billRef}
            className="p-6 bg-white rounded-2xl border border-gray-200"
          >
            {/* Bill Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <p className="text-gray-600 text-lg">Thikana Portal</p>
            </div>

            {/* Bill Info */}
            <div className="flex justify-between mb-8">
              <div className="space-y-2">
                <h3 className="font-bold text-lg text-gray-900">Invoice To:</h3>
                <p className="text-gray-700">
                  Customer: {user?.displayName || user?.email || "Customer"}
                </p>
                <p className="text-gray-700">
                  Order Date:{" "}
                  {selectedOrder &&
                    format(new Date(selectedOrder?.timestamp), "MMM d, yyyy")}
                </p>
              </div>
              <div className="text-right space-y-2">
                <h3 className="font-bold text-lg text-gray-900">
                  Invoice Details:
                </h3>
                <p className="text-gray-700">
                  Invoice #: INV-{selectedOrder?.orderId?.substring(0, 8)}
                </p>
                <p className="text-gray-700">
                  Order #: {selectedOrder?.orderId?.substring(0, 8)}
                </p>
              </div>
            </div>

            {/* Bill Items */}
            <table className="w-full mb-8">
              <thead className="border-b-2 border-gray-300">
                <tr>
                  <th className="py-3 text-left font-bold text-gray-900">
                    Item
                  </th>
                  <th className="py-3 text-right font-bold text-gray-900">
                    Qty
                  </th>
                  <th className="py-3 text-right font-bold text-gray-900">
                    Price
                  </th>
                  <th className="py-3 text-right font-bold text-gray-900">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedOrder?.products?.map((product, idx) => (
                  <tr key={idx}>
                    <td className="py-3 text-gray-700">
                      {product.productName}
                    </td>
                    <td className="py-3 text-right text-gray-700">
                      {product.quantity}
                    </td>
                    <td className="py-3 text-right text-gray-700">
                      ₹{product.amount?.toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-gray-700">
                      ₹{(product.amount * product.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300 font-bold">
                <tr>
                  <td colSpan={3} className="py-3 text-right text-gray-900">
                    Subtotal:
                  </td>
                  <td className="py-3 text-right text-gray-900">
                    ₹{selectedOrder?.amount?.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-3 text-right text-gray-900">
                    Tax:
                  </td>
                  <td className="py-3 text-right text-gray-900">₹0.00</td>
                </tr>
                <tr className="text-lg">
                  <td colSpan={3} className="py-3 text-right text-gray-900">
                    Total:
                  </td>
                  <td className="py-3 text-right text-gray-900">
                    ₹{selectedOrder?.amount?.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Payment info */}
            <div className="border-t pt-6 mb-6">
              <h3 className="font-bold text-lg text-gray-900 mb-3">
                Payment Information
              </h3>
              <div className="space-y-1">
                <p className="text-gray-700">
                  Status: {selectedOrder?.paymentStatus || "Paid"}
                </p>
                <p className="text-gray-700">
                  Method: {selectedOrder?.paymentMethod || "Online Payment"}
                </p>
              </div>
            </div>

            {/* Thank You */}
            <div className="text-center mt-8 p-4 bg-gray-50 rounded-xl">
              <p className="font-bold text-lg text-gray-900">
                Thank you for your business!
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setBillDialogOpen(false)}
              className="rounded-2xl px-6 py-3 h-auto"
            >
              Close
            </Button>
            <Button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-2xl px-6 py-3 h-auto bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 rounded-2xl px-6 py-3 h-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <FileText className="h-4 w-4" />
              <span>Download PDF</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
