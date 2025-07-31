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
import WhoToFollow from "@/components/WhoToFollow";
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
import ProfilePosts from "@/components/ProfilePosts";
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
      <Loader/>
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
        <Loader/>
      </div>
    ),
  }
);

// Memoized components
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-[400px]">
    <Loader/>
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
  const userId = useMemo(() => selectedFranchiseId || user?.uid, [selectedFranchiseId, user?.uid]);
  
  const [userData, setUserData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  // Fixed: Use consistent userId for posts hook
  const { posts, loading, fetchMorePosts, hasMore, error } = useGetUserPosts(userId);
  
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
  const [selectedProductForRating, setSelectedProductForRating] = useState(null);
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
        setSavedPosts(prev => prev.filter(post => post.id !== postId));
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
    unsubscribeRefs.current.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
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
          const aTime = a.savedAt?.toDate ? a.savedAt.toDate() : new Date(a.savedAt || 0);
          const bTime = b.savedAt?.toDate ? b.savedAt.toDate() : new Date(b.savedAt || 0);
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
  const handleSwitchFranchise = useCallback((franchiseId, shouldReload = true) => {
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
        toast.success(`Switched to ${franchise?.businessName || "Franchise"}`);
      }

      // Force reload to refresh data if specified
      if (shouldReload) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error switching franchise:", error);
      toast.error("Failed to switch franchise");
    }
  }, [franchises]);

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
          <Loader/>
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
        <Loader/>
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
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
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
  }, [selectedProductForRating, user?.uid, ratingValue, ratingFeedback, productRatings]);

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
  const renderStarRating = useCallback((currentRating, isSelectable = false) => {
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
              className={`h-6 w-6 ${
                star <= currentRating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              } ${isSelectable && star <= currentRating ? "text-yellow-400" : ""}`}
            />
          </button>
        ))}
      </div>
    );
  }, []);

  // Fixed: Add error boundary for auth errors
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Profile</h1>
          <p className="text-gray-600 mb-4">{authError}</p>
          <Button onClick={() => window.location.reload()} className="rounded-full px-6">
            Retry
          </Button>
        </div>
      </div>
    );
  }

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
              <LoadingSpinner />
            ) : (
              <>
                {/* Profile Card */}
                <Card className="overflow-hidden bg-white border-0 shadow-sm">
                  {/* Cover Image */}
                  <div className="relative h-[180px] w-full">
                    {isBusinessUser && (
                      <Dialog>
                        <DialogTrigger className="z-30 w-full h-full">
                          <Image
                            src={userData?.coverPic || "/coverimg.png"}
                            width={1200}
                            height={180}
                            alt="Cover Image"
                            className="z-30 object-cover w-full h-full transition-opacity hover:opacity-95 border border-black/40 rounded-t-xl"
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
                              height={500}
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
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                          {isBusinessUser
                            ? userData?.businessName || userData?.name
                            : userData?.name}
                          {isBusinessUser && userData?.role === "member" ? (
                            <Badge
                              variant="outline"
                              className="ml-2 bg-violet-50 text-violet-600 border-violet-200 text-xs"
                            >
                              Member
                            </Badge>
                          ) : isBusinessUser && userData?.isFranchise ? (
                            <Badge
                              variant="outline"
                              className="ml-2 bg-blue-50 text-blue-600 border-blue-200 text-xs"
                            >
                              Franchise
                            </Badge>
                          ) : isBusinessUser ? (
                            <Badge
                              variant="outline"
                              className="ml-2 bg-primary/10 text-primary border-primary/20 text-xs"
                            >
                              Headquarters
                            </Badge>
                          ) : null}
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

                      {/* Franchise Selector for business users with franchises */}
                      {isBusinessUser &&
                        hasFranchises &&
                        !userData?.franchiseOwner && (
                          <div className="mt-2 mb-2 flex gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                  {loadingFranchises ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : selectedFranchiseId ? (
                                    <Store className="h-4 w-4" />
                                  ) : (
                                    <Building2 className="h-4 w-4" />
                                  )}
                                  {loadingFranchises ? (
                                    "Loading..."
                                  ) : selectedFranchiseId ? (
                                    <>
                                      {franchises.find(
                                        (f) => f.id === selectedFranchiseId
                                      )?.businessName || "Franchise"}
                                      <Badge
                                        variant="outline"
                                        className="ml-2 bg-blue-50 text-blue-600 border-blue-200 text-xs"
                                      >
                                        Franchise
                                      </Badge>
                                    </>
                                  ) : (
                                    <>
                                      Headquarters
                                      <Badge
                                        variant="outline"
                                        className="ml-2 bg-primary/10 text-primary border-primary/20 text-xs"
                                      >
                                        HQ
                                      </Badge>
                                    </>
                                  )}
                                  <ChevronDown className="h-4 w-4 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                  Switch Location
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {/* Main business (Headquarters) */}
                                <DropdownMenuItem
                                  className="flex items-center gap-2 cursor-pointer"
                                  onClick={() =>
                                    handleSwitchFranchise("headquarters")
                                  }
                                >
                                  <HomeIcon className="h-4 w-4" />
                                  <span>Headquarters</span>
                                  {!selectedFranchiseId && (
                                    <Badge className="ml-auto">Current</Badge>
                                  )}
                                </DropdownMenuItem>

                                {/* Franchises list */}
                                {franchises.map((franchise) => (
                                  <DropdownMenuItem
                                    key={franchise.id}
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={() =>
                                      handleSwitchFranchise(franchise.id)
                                    }
                                  >
                                    <Store className="h-4 w-4" />
                                    <span>
                                      {franchise.businessName || "Franchise"}
                                    </span>
                                    {selectedFranchiseId === franchise.id && (
                                      <Badge className="ml-auto">Current</Badge>
                                    )}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Exit Franchise View button */}
                            {selectedFranchiseId && (
                              <Button
                                variant="outline"
                                className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={exitFranchiseView}
                              >
                                <ArrowLeftIcon className="h-4 w-4" />
                                Exit Franchise View
                              </Button>
                            )}
                          </div>
                        )}

                      {/* Action buttons - simplified layout */}
                      <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
                        {/* Primary buttons - always visible */}
                        {isCurrentUser && (
                          <Button
                            asChild
                            variant="default"
                            className="bg-black hover:bg-black/90 h-9"
                            size="sm"
                          >
                            <Link
                              href={
                                isBusinessUser
                                  ? "/profile/settings"
                                  : "/profile/settings/user"
                              }
                            >
                              <EditIcon className="w-3.5 h-3.5 mr-1.5" />
                              <span className="text-xs">Edit Profile</span>
                            </Link>
                          </Button>
                        )}

                        {isCurrentUser && isBusinessUser && (
                          <Button
                            asChild
                            variant="default"
                            className="bg-primary hover:bg-primary/90 h-9"
                            size="sm"
                          >
                            <Link href="/dashboard">
                              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                              <span className="text-xs">Dashboard</span>
                            </Link>
                          </Button>
                        )}

                        {isCurrentUser && isBusinessUser && (
                          <WebsiteBuilderButton userId={user?.uid} />
                        )}

                        {/* More options dropdown */}
                        {isBusinessUser && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 border-gray-200"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={toggleLocationIFrame}>
                                <MapPinIcon className="w-3.5 h-3.5 mr-2" />
                                <span>Location</span>
                              </DropdownMenuItem>

                              {/* Add Manage Calls option for business users */}
                              <DropdownMenuItem
                                onClick={() => router.push("/profile/calls")}
                              >
                                <PhoneCall className="w-3.5 h-3.5 mr-2" />
                                <span>Manage AI Calls</span>
                              </DropdownMenuItem>

                              {userData &&
                                !selectedFranchiseId &&
                                !userData?.franchiseOwner && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setIsFranchiseModalOpen(true)
                                    }
                                  >
                                    <Globe className="w-3.5 h-3.5 mr-2" />
                                    <span>Add Franchise</span>
                                  </DropdownMenuItem>
                                )}

                              {selectedFranchiseId && (
                                <DropdownMenuItem onClick={exitFranchiseView}>
                                  <ArrowLeftIcon className="w-3.5 h-3.5 mr-2" />
                                  <span>
                                    Return to{" "}
                                    {userData?.franchiseOwner
                                      ? "Business"
                                      : "HQ"}
                                  </span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {/* Always show the share button */}
                        {isBusinessUser && userData && (
                          <ShareBusinessDialog userData={userData} />
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
                    {showLocationIFrame && (
                      <div className="mt-6 rounded-lg border overflow-hidden bg-white shadow-sm">
                        <div className="p-4 border-b">
                          <h3 className="font-medium flex items-center gap-2 text-gray-900">
                            <MapPinIcon className="w-4 h-4" />
                            {isBusinessUser
                              ? "Business Location"
                              : "User Location"}
                          </h3>
                          {userData?.locations?.address ? (
                            <div className="mt-1 text-sm text-gray-600">
                              {userData.locations.address}
                            </div>
                          ) : null}
                        </div>
                        <div className="h-[300px] w-full relative">
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
                            <div className="flex justify-center items-center h-full bg-gray-100">
                              <p className="text-gray-500">
                                No location data available
                              </p>
                            </div>
                          )}
                        </div>
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
                  <Suspense fallback={<LoadingSpinner />}>
                    <Card className="border-0 shadow-sm overflow-hidden bg-white">
                      <Tabs defaultValue="posts" className="w-full">
                        <div className="border-b overflow-x-auto scrollbar-hide">
                          <TabsList className="justify-between h-auto p-0 bg-transparent w-full flex">
                            <TabsTrigger
                              value="posts"
                              className={cn(
                                "rounded-none border-b-2 border-transparent flex-1",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
                              )}
                              title="View Posts"
                            >
                              <FileTextIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden data-[state=active]:block">
                                Posts{" "}
                                {userData?.role === "member" && "from Business"}
                              </span>
                            </TabsTrigger>

                            {/* Franchises Tab - Only show for business owners with franchises */}
                            {hasFranchises && !selectedFranchiseId && (
                              <TabsTrigger
                                value="franchises"
                                title="Your Franchises"
                                className={cn(
                                  "rounded-none border-b-2 border-transparent flex-1",
                                  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                  "px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
                                )}
                              >
                                <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden data-[state=active]:block">
                                  Franchises
                                </span>
                              </TabsTrigger>
                            )}

                            <TabsTrigger
                              value="likes"
                              title="Liked Posts"
                              className={cn(
                                "rounded-none border-b-2 border-transparent flex-1",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
                              )}
                            >
                              <HeartIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden data-[state=active]:block">
                                Likes
                              </span>
                            </TabsTrigger>
                            <TabsTrigger
                              value="photos"
                              title="Photos"
                              className={cn(
                                "rounded-none border-b-2 border-transparent flex-1",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
                              )}
                            >
                              <Images className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden data-[state=active]:block">
                                Photos
                              </span>
                            </TabsTrigger>
                            {userData?.business_categories?.includes(
                              "product"
                            ) && (
                              <TabsTrigger
                              title="Products"
                                value="products"
                                className={cn(
                                  "rounded-none border-b-2 border-transparent flex-1",
                                  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                  "px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
                                )}
                              >
                                <SquareChartGantt className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden data-[state=active]:block">
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
                                  "rounded-none border-b-2 border-transparent flex-1",
                                  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                  "px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
                                )}
                              >
                                <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden data-[state=active]:block">
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
                                  "rounded-none border-b-2 border-transparent flex-1",
                                  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                  "px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
                                )}
                              >
                                <Home className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden data-[state=active]:block">
                                  Properties
                                </span>
                              </TabsTrigger>
                            )}
                            <TabsTrigger
                              value="saved"
                              title="Saved Posts"
                              className={cn(
                                "rounded-none border-b-2 border-transparent flex-1",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
                              )}
                            >
                              <Bookmark className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden data-[state=active]:block">
                                Saved Posts
                              </span>
                            </TabsTrigger>
                            <TabsTrigger
                              value="orders"
                              title="Your Orders"
                              className={cn(
                                "rounded-none border-b-2 border-transparent flex-1",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
                              )}
                            >
                              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden data-[state=active]:block">
                                Orders
                              </span>
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <TabsContent
                          value="posts"
                          className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
                        >
                          {renderPosts}
                        </TabsContent>

                        {/* Franchises tab content */}
                        {hasFranchises && !selectedFranchiseId && (
                          <TabsContent
                            value="franchises"
                            className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
                          >
                            <div className="space-y-2 mb-4">
                              <h2 className="text-xl font-semibold">
                                Your Franchises
                              </h2>
                              <p className="text-muted-foreground">
                                Manage all your franchise locations.
                              </p>
                            </div>

                            {loadingFranchises ? (
                              <div className="flex justify-center py-10">
                                <Loader/>
                              </div>
                            ) : franchises.length === 0 ? (
                              <div className="text-center py-12">
                                <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                <p className="text-muted-foreground">
                                  No franchises yet. Add a franchise to expand
                                  your business.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {franchises.map((franchise) => (
                                  <Card
                                    key={franchise.id}
                                    className="overflow-hidden"
                                  >
                                    <CardHeader className="p-4 bg-gray-50">
                                      <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                          <Avatar className="h-10 w-10 border border-gray-200">
                                            <AvatarImage
                                              src={
                                                franchise.profilePic ||
                                                "/avatar.png"
                                              }
                                              alt={franchise.businessName}
                                            />
                                          </Avatar>
                                          <div>
                                            <h3 className="font-medium text-lg">
                                              {franchise.businessName}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                              {franchise.locations?.address ||
                                                "No address"}
                                            </p>
                                          </div>
                                        </div>
                                        <Badge
                                          variant="outline"
                                          className="bg-blue-50 text-blue-600 border-blue-200"
                                        >
                                          Franchise
                                        </Badge>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                      <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="flex flex-col">
                                          <span className="text-xs text-muted-foreground">
                                            Admin
                                          </span>
                                          <span className="font-medium">
                                            {franchise.adminName}
                                          </span>
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-xs text-muted-foreground">
                                            Contact
                                          </span>
                                          <span className="font-medium">
                                            {franchise.phone}
                                          </span>
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-xs text-muted-foreground">
                                            Email
                                          </span>
                                          <span className="font-medium truncate">
                                            {franchise.email}
                                          </span>
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-xs text-muted-foreground">
                                            Created
                                          </span>
                                          <span className="font-medium">
                                            {franchise.createdAt?.toDate
                                              ? format(
                                                  new Date(
                                                    franchise.createdAt?.toDate()
                                                  ),
                                                  "MMM d, yyyy"
                                                )
                                              : "N/A"}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 justify-between">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 flex-1"
                                          onClick={() =>
                                            handleSwitchFranchise(franchise.id)
                                          }
                                        >
                                          <Store className="h-4 w-4" />
                                          <span>View Franchise</span>
                                        </Button>

                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>
                                                Delete Franchise
                                              </AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to delete
                                                this franchise? This action
                                                cannot be undone and will remove
                                                the franchise administrator
                                                account.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>
                                                Cancel
                                              </AlertDialogCancel>
                                              <AlertDialogAction
                                                className="bg-destructive hover:bg-destructive/90"
                                                onClick={() => {
                                                  // Delete franchise handler
                                                  const deleteFranchise =
                                                    async () => {
                                                      try {
                                                        toast.loading(
                                                          "Deleting franchise..."
                                                        );

                                                        // Delete franchise documents
                                                        await deleteDoc(
                                                          doc(
                                                            db,
                                                            "users",
                                                            franchise.id
                                                          )
                                                        );
                                                        await deleteDoc(
                                                          doc(
                                                            db,
                                                            "businesses",
                                                            franchise.id
                                                          )
                                                        );

                                                        // Delete the user from Firebase Auth via API
                                                        const response =
                                                          await fetch(
                                                            `/api/delete-franchise-user?userId=${franchise.id}`,
                                                            { method: "DELETE" }
                                                          );

                                                        if (!response.ok) {
                                                          throw new Error(
                                                            "Failed to delete franchise user"
                                                          );
                                                        }

                                                        // Update local state
                                                        setFranchises(
                                                          franchises.filter(
                                                            (f) =>
                                                              f.id !==
                                                              franchise.id
                                                          )
                                                        );
                                                        if (
                                                          franchises.length <= 1
                                                        ) {
                                                          setHasFranchises(
                                                            false
                                                          );
                                                        }

                                                        toast.dismiss();
                                                        toast.success(
                                                          "Franchise deleted successfully"
                                                        );
                                                      } catch (error) {
                                                        console.error(
                                                          "Error deleting franchise:",
                                                          error
                                                        );
                                                        toast.dismiss();
                                                        toast.error(
                                                          "Failed to delete franchise"
                                                        );
                                                      }
                                                    };

                                                  deleteFranchise();
                                                }}
                                              >
                                                Delete
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

                            <div className="mt-6">
                              <Button
                                onClick={() => setIsFranchiseModalOpen(true)}
                                className="gap-2"
                              >
                                <PlusCircle className="h-4 w-4" />
                                Add New Franchise
                              </Button>
                            </div>
                          </TabsContent>
                        )}

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

                        {userData?.business_categories?.includes(
                          "real-estate"
                        ) && (
                          <TabsContent
                            value="properties"
                            className="p-6 focus-visible:outline-none focus:outline-none transition-all duration-200 animate-in fade-in-50"
                          >
                            {userData && user && <ShowPropertiesTabContent />}
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
                                ? renderEmptyState(
                                    Bookmark,
                                    "No saved posts yet"
                                  )
                                : savedPosts.map(renderSavedPostCard)}
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
                                <Card
                                  key={order.id}
                                  className="overflow-hidden"
                                >
                                  <CardHeader className="bg-gray-50 py-3">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                      <div>
                                        <div className="flex items-center">
                                          <h3 className="font-medium text-sm sm:text-base">
                                            Order #
                                            {order.orderId.substring(0, 8)}
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
                                            {order.status === "completed" && (
                                              <div className="mt-2">
                                                {productRatings[
                                                  product.productId
                                                ] ? (
                                                  <div className="flex flex-col gap-1">
                                                    {renderStarRating(
                                                      productRatings[
                                                        product.productId
                                                      ].rating
                                                    )}
                                                    <div className="flex items-center justify-between">
                                                      <span className="text-xs text-green-600">
                                                        You rated this product
                                                      </span>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-xs h-7 px-2 text-muted-foreground hover:text-primary"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleOpenRatingDialog(
                                                            product,
                                                            order
                                                          );
                                                        }}
                                                      >
                                                        Edit
                                                      </Button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleOpenRatingDialog(
                                                        product,
                                                        order
                                                      );
                                                    }}
                                                  >
                                                    Rate & Review
                                                  </Button>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <p className="font-medium">
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
                                    <div className="border-t p-4 bg-gray-50">
                                      <div className="flex flex-col gap-2">
                                        <div className="flex justify-between">
                                          <span className="text-sm font-medium">
                                            Total
                                          </span>
                                          <span className="font-semibold">
                                            ₹{order.amount?.toFixed(2)}
                                          </span>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex items-center gap-1 mt-2 w-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleGenerateBill(order);
                                          }}
                                        >
                                          <FileText className="h-4 w-4" />
                                          <span>Generate Bill</span>
                                        </Button>
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
                  </Suspense>
                )}

                {/* Saved Posts tab for regular users */}
                {isEmailVerified && !isBusinessUser && (
                  <Suspense fallback={<LoadingSpinner />}>
                    <Card className="border-0 shadow-sm overflow-hidden bg-white">
                      <Tabs defaultValue="saved" className="w-full">
                        <div className="border-b overflow-x-auto scrollbar-hide">
                          <TabsList className="justify-between h-auto p-0 bg-transparent w-full flex">
                            <TabsTrigger
                            title="Saved Posts"
                              value="saved"
                              className={cn(
                                "rounded-none border-b-2 border-transparent flex-1",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
                              )}
                            >
                              <Bookmark className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden data-[state=active]:block">
                                Saved Posts
                              </span>
                            </TabsTrigger>
                            <TabsTrigger
                            title="Liked Posts"
                              value="likes"
                              className={cn(
                                "rounded-none border-b-2 border-transparent flex-1",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
                              )}
                            >
                              <HeartIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden data-[state=active]:block">
                                Likes
                              </span>
                            </TabsTrigger>
                            <TabsTrigger
                            title="Your Orders"
                              value="orders"
                              className={cn(
                                "rounded-none border-b-2 border-transparent flex-1",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
                              )}
                            >
                              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden data-[state=active]:block">
                                Orders
                              </span>
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
                                ? renderEmptyState(
                                    Bookmark,
                                    "No saved posts yet"
                                  )
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
                                <Card
                                  key={order.id}
                                  className="overflow-hidden"
                                >
                                  <CardHeader className="bg-gray-50 py-3">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                      <div>
                                        <div className="flex items-center">
                                          <h3 className="font-medium text-sm sm:text-base">
                                            Order #
                                            {order.orderId.substring(0, 8)}
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
                                            {order.status === "completed" && (
                                              <div className="mt-2">
                                                {productRatings[
                                                  product.productId
                                                ] ? (
                                                  <div className="flex flex-col gap-1">
                                                    {renderStarRating(
                                                      productRatings[
                                                        product.productId
                                                      ].rating
                                                    )}
                                                    <div className="flex items-center justify-between">
                                                      <span className="text-xs text-green-600">
                                                        You rated this product
                                                      </span>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-xs h-7 px-2 text-muted-foreground hover:text-primary"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleOpenRatingDialog(
                                                            product,
                                                            order
                                                          );
                                                        }}
                                                      >
                                                        Edit
                                                      </Button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleOpenRatingDialog(
                                                        product,
                                                        order
                                                      );
                                                    }}
                                                  >
                                                    Rate & Review
                                                  </Button>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <p className="font-medium">
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
                                    <div className="border-t p-4 bg-gray-50">
                                      <div className="flex flex-col gap-2">
                                        <div className="flex justify-between">
                                          <span className="text-sm font-medium">
                                            Total
                                          </span>
                                          <span className="font-semibold">
                                            ₹{order.amount?.toFixed(2)}
                                          </span>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex items-center gap-1 mt-2 w-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleGenerateBill(order);
                                          }}
                                        >
                                          <FileText className="h-4 w-4" />
                                          <span>Generate Bill</span>
                                        </Button>
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
                  </Suspense>
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

      {/* Franchise Modal */}
      <Suspense fallback={<LoadingSpinner />}>
        <FranchiseModal
          isOpen={isFranchiseModalOpen}
          onOpenChange={setIsFranchiseModalOpen}
        />
      </Suspense>

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {productRatings[selectedProductForRating?.productId]
                ? "Edit Your Rating"
                : "Rate Product"}
            </DialogTitle>
            <DialogDescription>
              Share your experience with {selectedProductForRating?.productName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              <span className="text-sm font-medium">
                How would you rate this product?
              </span>
              {renderStarRating(ratingValue, true)}
              <span className="text-sm text-muted-foreground mt-1">
                {ratingValue === 0 && "Select a rating"}
                {ratingValue === 1 && "Poor"}
                {ratingValue === 2 && "Fair"}
                {ratingValue === 3 && "Good"}
                {ratingValue === 4 && "Very Good"}
                {ratingValue === 5 && "Excellent"}
              </span>
            </div>

            <div className="space-y-2">
              <label htmlFor="feedback" className="text-sm font-medium">
                Your Review (Optional)
              </label>
              <Textarea
                id="feedback"
                placeholder="Share your experience with this product..."
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRatingDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRating}
              disabled={ratingValue === 0 || isSubmittingRating}
            >
              {isSubmittingRating ? (
                <>
                  <Loader/>
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderId?.substring(0, 8)} details
            </DialogDescription>
          </DialogHeader>

          <div ref={billRef} className="p-4 bg-white">
            {/* Bill Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">INVOICE</h1>
              <p className="text-muted-foreground">Thikana Portal</p>
            </div>

            {/* Bill Info */}
            <div className="flex justify-between mb-6">
              <div>
                <h3 className="font-medium">Invoice To:</h3>
                <p>
                  Customer: {user?.displayName || user?.email || "Customer"}
                </p>
                <p>
                  Order Date:{" "}
                  {selectedOrder &&
                    format(new Date(selectedOrder?.timestamp), "MMM d, yyyy")}
                </p>
              </div>
              <div className="text-right">
                <h3 className="font-medium">Invoice Details:</h3>
                <p>Invoice #: INV-{selectedOrder?.orderId?.substring(0, 8)}</p>
                <p>Order #: {selectedOrder?.orderId?.substring(0, 8)}</p>
              </div>
            </div>

            {/* Bill Items */}
            <table className="w-full mb-6">
              <thead className="border-b-2 border-gray-300">
                <tr>
                  <th className="py-2 text-left">Item</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedOrder?.products?.map((product, idx) => (
                  <tr key={idx}>
                    <td className="py-2">{product.productName}</td>
                    <td className="py-2 text-right">{product.quantity}</td>
                    <td className="py-2 text-right">
                      ₹{product.amount?.toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      ₹{(product.amount * product.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300 font-medium">
                <tr>
                  <td colSpan={3} className="py-2 text-right">
                    Subtotal:
                  </td>
                  <td className="py-2 text-right">
                    ₹{selectedOrder?.amount?.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 text-right">
                    Tax:
                  </td>
                  <td className="py-2 text-right">₹0.00</td>
                </tr>
                <tr className="font-bold">
                  <td colSpan={3} className="py-2 text-right">
                    Total:
                  </td>
                  <td className="py-2 text-right">
                    ₹{selectedOrder?.amount?.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Payment info */}
            <div className="border-t pt-4 mb-6">
              <h3 className="font-medium mb-2">Payment Information</h3>
              <p>Status: {selectedOrder?.paymentStatus || "Paid"}</p>
              <p>Method: {selectedOrder?.paymentMethod || "Online Payment"}</p>
            </div>

            {/* Thank You */}
            <div className="text-center mt-8">
              <p className="font-medium">Thank you for your business!</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setBillDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handlePrint} className="flex items-center gap-1">
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </Button>
            <Button
              onClick={handleDownloadPDF}
              variant="default"
              className="flex items-center gap-1"
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
