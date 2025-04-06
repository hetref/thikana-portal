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
  DialogClose,
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
  ArrowLeftIcon,
  HomeIcon,
  Printer,
  Star,
  MoreHorizontal,
  Home,
  PhoneCall,
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
  updateDoc,
  where,
  addDoc,
  serverTimestamp,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import FranchiseSelector from "@/components/profile/FranchiseSelector";
import WebsiteBuilderButton from "@/components/WebsiteBuilderButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Textarea } from "@/components/ui/textarea";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import ShowPropertiesTabContent from "@/components/profile/ShowPropertiesTabContent";

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
      <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
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
        <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
      </div>
    ),
  }
);

// Memoized components
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-[400px]">
    <Loader2Icon className="w-10 h-10 animate-spin text-primary" />
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
  const userId = selectedFranchiseId || user?.uid;
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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [selectedProductForRating, setSelectedProductForRating] =
    useState(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [productRatings, setProductRatings] = useState({});

  const billRef = useRef();
  const [isFranchiseModalOpen, setIsFranchiseModalOpen] = useState(false);
  const [isBusinessUser, setIsBusinessUser] = useState(false);

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
    return userEmailStatus() === true;
  }, []);

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

  // Optimized effects
  useEffect(() => {
    // Check sessionStorage for selected franchise
    const storedFranchiseId = sessionStorage.getItem("selectedFranchiseId");
    if (storedFranchiseId) {
      setSelectedFranchiseId(storedFranchiseId);
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        setLoadingUserData(true);

        try {
          const userDocRef = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userDocRef);

          if (userSnapshot.exists()) {
            const userDoc = userSnapshot.data();

            // Check if user is a member with a businessId
            if (userDoc.role === "member" && userDoc.businessId) {
              // Fetch the business data
              const businessDocRef = doc(db, "businesses", userDoc.businessId);
              const businessSnapshot = await getDoc(businessDocRef);

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
          toast.error("Failed to load user profile");
        } finally {
          setLoadingUserData(false);
        }
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

  // User photos listener
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
      }
    );

    return () => unsubscribe();
  }, [userId, userData?.businessId]);

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
    // Skip if not the current user
    if (!user || !isCurrentUser) {
      return;
    }

    const fetchSavedPosts = async () => {
      try {
        setLoadingSavedPosts(true);

        const savedPostsRef = collection(db, "users", user.uid, "savedPosts");
        const savedPostsSnap = await getDocs(savedPostsRef);

        const postsData = [];

        for (const doc of savedPostsSnap.docs) {
          const postRef = doc.ref;
          const postData = doc.data();

          // If postData has a reference to the original post
          if (postData.postId) {
            const postDoc = await getDoc(doc(db, "posts", postData.postId));

            if (postDoc.exists()) {
              postsData.push({
                id: postDoc.id,
                ...postDoc.data(),
                savedAt: postData.timestamp,
                savedId: doc.id,
              });
            }
          }
        }

        // Sort by savedAt timestamp
        postsData.sort((a, b) => b.savedAt - a.savedAt);

        setSavedPosts(postsData);
      } catch (error) {
        console.error("Error fetching saved posts:", error);
      } finally {
        setLoadingSavedPosts(false);
      }
    };

    fetchSavedPosts();
  }, [user, isCurrentUser]);

  // Orders listener
  useEffect(() => {
    // Skip if not the current user
    if (!user?.uid || !isCurrentUser) {
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
        toast.error("Failed to load orders");
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [user?.uid, isCurrentUser]);

  // Load product ratings
  useEffect(() => {
    if (!user?.uid || !isCurrentUser) {
      return;
    }

    const fetchProductRatings = async () => {
      try {
        const ratingsRef = collection(db, "users", user.uid, "productRatings");
        const ratingsSnap = await getDocs(ratingsRef);

        const ratingsData = {};

        ratingsSnap.docs.forEach((doc) => {
          const data = doc.data();
          ratingsData[data.productId] = {
            id: doc.id,
            ...data,
          };
        });

        setProductRatings(ratingsData);
      } catch (error) {
        console.error("Error fetching product ratings:", error);
      }
    };

    fetchProductRatings();
  }, [user?.uid, isCurrentUser]);

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

  // Handle printing functionality
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
    },
  });

  // Function to download PDF directly
  const handleDownloadPDF = async () => {
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
  };

  // Function to handle bill generation
  const handleGenerateBill = (order) => {
    setSelectedOrder(order);
    setBillDialogOpen(true);
  };

  // Handle rating submission
  const handleSubmitRating = async () => {
    if (!selectedProductForRating || !user?.uid || ratingValue === 0) return;

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
      };

      // Add rating to user's ratings collection
      const userRatingRef = collection(db, "users", user.uid, "ratings");
      const newRatingDoc = await addDoc(userRatingRef, ratingData);

      // Also add rating to product's ratings collection
      const productRatingRef = collection(
        db,
        "products",
        selectedProductForRating.productId,
        "ratings"
      );
      await addDoc(productRatingRef, ratingData);

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

      // Update local state
      setProductRatings((prev) => ({
        ...prev,
        [selectedProductForRating.productId]: {
          id: newRatingDoc.id,
          ...ratingData,
        },
      }));

      toast.success("Rating submitted successfully");
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
  };

  // Handle opening the rating dialog
  const handleOpenRatingDialog = (product, order) => {
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
      setRatingFeedback(productRatings[product.productId].feedback);
    } else {
      setRatingValue(0);
      setRatingFeedback("");
    }

    setRatingDialogOpen(true);
  };

  // Render star rating component for selection
  const renderStarRating = (currentRating, isSelectable = false) => {
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
  };

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
                                <DropdownMenuItem
                                  onClick={() => {
                                    sessionStorage.removeItem(
                                      "selectedFranchiseId"
                                    );
                                    window.location.reload();
                                  }}
                                >
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
                          <TabsList className="justify-start h-auto p-0 bg-transparent overflow-x-auto scrollbar-hide whitespace-nowrap w-max min-w-full">
                            <TabsTrigger
                              value="posts"
                              className={cn(
                                "rounded-none border-b-2 border-transparent",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap"
                              )}
                            >
                              <FileTextIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              Posts{" "}
                              {userData?.role === "member" && "from Business"}
                            </TabsTrigger>
                            <TabsTrigger
                              value="likes"
                              className={cn(
                                "rounded-none border-b-2 border-transparent",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap"
                              )}
                            >
                              <HeartIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              Likes
                            </TabsTrigger>
                            <TabsTrigger
                              value="photos"
                              className={cn(
                                "rounded-none border-b-2 border-transparent",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap"
                              )}
                            >
                              <Images className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
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
                                  "px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap"
                                )}
                              >
                                <SquareChartGantt className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
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
                                  "px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap"
                                )}
                              >
                                <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                Services
                              </TabsTrigger>
                            )}
                            {userData?.business_categories?.includes(
                              "real-estate"
                            ) && (
                              <TabsTrigger
                                value="properties"
                                className={cn(
                                  "rounded-none border-b-2 border-transparent",
                                  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                  "px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap"
                                )}
                              >
                                <Home className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                Properties
                              </TabsTrigger>
                            )}
                            <TabsTrigger
                              value="saved"
                              className={cn(
                                "rounded-none border-b-2 border-transparent",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap"
                              )}
                            >
                              <Bookmark className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              Saved
                            </TabsTrigger>
                            <TabsTrigger
                              value="orders"
                              className={cn(
                                "rounded-none border-b-2 border-transparent",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap"
                              )}
                            >
                              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
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
                          <TabsList className="justify-start h-auto p-0 bg-transparent overflow-x-auto scrollbar-hide whitespace-nowrap w-max min-w-full">
                            <TabsTrigger
                              value="saved"
                              className={cn(
                                "rounded-none border-b-2 border-transparent",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap"
                              )}
                            >
                              <Bookmark className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              Saved Posts
                            </TabsTrigger>
                            <TabsTrigger
                              value="likes"
                              className={cn(
                                "rounded-none border-b-2 border-transparent",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap"
                              )}
                            >
                              <HeartIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              Likes
                            </TabsTrigger>
                            <TabsTrigger
                              value="orders"
                              className={cn(
                                "rounded-none border-b-2 border-transparent",
                                "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary",
                                "px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap"
                              )}
                            >
                              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
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
                                                    <span className="text-xs text-green-600">
                                                      You rated this product
                                                    </span>
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
            <DialogTitle>Rate Product</DialogTitle>
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
                  <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
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
