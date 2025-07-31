"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Expand,
  X,
  AlertTriangle,
  Plus,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { deleteDoc, doc, collection, onSnapshot } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import useBusinessIdForMember from "@/hooks/useBusinessIdForMember";
import Loader from "@/components/Loader";

export default function PhotosGrid({ userId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const imageRef = useRef(null);
  const { user } = useAuth();

  // Use our custom hook to get the appropriate ID for fetching data
  const {
    targetId,
    isMember,
    loading: idLoading,
  } = useBusinessIdForMember(userId);

  useEffect(() => {
    if (idLoading) return; // Wait until we know if the user is a member

    const photosCol = collection(db, `users/${targetId}/photos`);
    const unsubscribe = onSnapshot(
      photosCol,
      (photosSnapshot) => {
        if (!photosSnapshot.empty) {
          const photosData = photosSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setPhotos(photosData);
        } else {
          setPhotos([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching photos:", error);
        setError("Failed to fetch photos. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetId, idLoading]);

  // Reset zoom when photo changes
  useEffect(() => {
    setZoomLevel(1);
  }, [selectedPhoto]);

  // Check if the current user can delete photos
  const canDelete = user?.uid === userId;

  // Handle photo deletion
  const handleDeletePhoto = async (photo) => {
    if (!canDelete || !photo) return;

    setIsDeleting(true);
    try {
      // 1. Delete from Firestore subcollection
      await deleteDoc(doc(db, "users", userId, "photos", photo.id));

      // 2. Delete from Firebase Storage
      const photoPath =
        photo.storagePath || getStoragePathFromUrl(photo.photoUrl);
      if (photoPath) {
        const storageRef = ref(storage, photoPath);
        await deleteObject(storageRef);
      }

      toast.success("Photo deleted successfully");

      // Notify parent component to update the photos list
      setPhotos((prevPhotos) => prevPhotos.filter((p) => p.id !== photo.id));

      // Close the delete dialog
      setIsDeleteDialogOpen(false);
      setSelectedPhoto(null);
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to extract storage path from URL
  const getStoragePathFromUrl = (url) => {
    try {
      if (!url || !url.includes("firebasestorage.googleapis.com")) return null;

      const baseUrlPattern =
        /firebasestorage\.googleapis\.com\/v0\/b\/[^\/]+\/o\/(.*?)(?:\?|$)/;
      const match = url.match(baseUrlPattern);

      if (match && match[1]) {
        // Firebase encodes paths in URLs, so decode it
        return decodeURIComponent(match[1]);
      }
      return null;
    } catch (e) {
      console.error("Error extracting storage path:", e);
      return null;
    }
  };

  // Function to get image dimensions for proper layout
  const preloadImage = (photoUrl, id) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        setImageDimensions((prev) => ({
          ...prev,
          [id]: {
            width: img.width,
            height: img.height,
            aspect: img.height / img.width,
          },
        }));
        resolve();
      };
      img.src = photoUrl;
    });
  };

  // Preload images to get dimensions
  useEffect(() => {
    const loadImages = async () => {
      for (const photo of photos) {
        if (photo.photoUrl && !imageDimensions[photo.id]) {
          await preloadImage(photo.photoUrl, photo.id);
        }
      }
    };
    loadImages();
  }, [photos]);

  // Function to download the selected photo
  const downloadPhoto = (photo) => {
    if (!photo || !photo.photoUrl) return;

    // Create a temporary link element
    const link = document.createElement("a");
    link.href = photo.photoUrl;
    link.download = `photo-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle fullscreen mode
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (imageRef.current?.parentElement?.requestFullscreen) {
        imageRef.current.parentElement.requestFullscreen();
        setIsFullScreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Navigate to next/previous photo
  const navigatePhotos = (direction) => {
    if (!photos.length) return;

    const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === "next") {
      newIndex = (currentIndex + 1) % photos.length;
    } else {
      newIndex = (currentIndex - 1 + photos.length) % photos.length;
    }

    setZoomLevel(1); // Reset zoom
    setSelectedPhoto(photos[newIndex]);
    setSelectedIndex(newIndex);
  };

  // Handle opening a photo
  const handlePhotoSelect = (photo, index) => {
    setSelectedPhoto(photo);
    setSelectedIndex(index);
    setZoomLevel(1);
  };

  // Handle zoom controls
  const handleZoom = (zoomIn) => {
    setZoomLevel((prev) => {
      if (zoomIn) {
        return Math.min(prev + 0.25, 3); // Max zoom 3x
      } else {
        return Math.max(prev - 0.25, 0.5); // Min zoom 0.5x
      }
    });
  };

  if (idLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader/>
        <p className="text-muted-foreground">Loading photos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="w-12 h-12 text-destructive/70 mb-4" />
        <p className="text-destructive font-medium mb-1">
          Something went wrong
        </p>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ImageIcon className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          No photos yet
        </h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {isMember
            ? "The business hasn't added any photos yet."
            : "This business hasn't added any photos yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Photos ({photos.length})</h3>
        {canDelete && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setSelectedPhoto(null)}
          >
            <Plus className="h-4 w-4" />
            Add Photo
          </Button>
        )}
      </div>

      {/* Enhanced Photo Grid */}
      <div className="grid grid-cols-2 gap-4">
        {photos.map((photo, index) => {
          const dims = imageDimensions[photo.id];
          const aspectRatio = dims ? dims.aspect : 1;
          // Set a max height to prevent extremely tall images
          const maxHeight = 360;
          const height = Math.min(240 * aspectRatio, maxHeight);

          return (
            <div
              key={photo.id}
              className="relative group overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all duration-300 bg-black/5 border border-border/30 hover:border-border/50 cursor-pointer"
              style={{ height: dims ? `${height}px` : "240px" }}
              onClick={() => handlePhotoSelect(photo, index)}
            >
              {/* Shimmer effect while loading */}
              {!dims && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer-effect"></div>
              )}

              <div className="relative w-full h-full">
                <Image
                  src={photo.photoUrl}
                  alt="Photo"
                  fill
                  sizes="(max-width: 768px) 50vw, 50vw"
                  className={cn(
                    "object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]",
                    !dims && "opacity-50"
                  )}
                  priority={index < 4} // Prioritize loading first 4 images
                  onLoad={() => {
                    if (!imageDimensions[photo.id]) {
                      preloadImage(photo.photoUrl, photo.id);
                    }
                  }}
                />
              </div>

              {/* Overlay with date and controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                <div className="flex justify-end">
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhoto(photo);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="p-2 bg-red-500/80 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </button>
                  )}
                </div>
                <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 w-fit">
                  <p className="text-white text-xs font-medium">
                    {photo.timestamp
                      ? new Date(photo.timestamp).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : ""}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Photo View Dialog */}
      {selectedPhoto && (
        <Dialog
          open={!!selectedPhoto && !isDeleteDialogOpen}
          onOpenChange={(open) => !open && setSelectedPhoto(null)}
        >
          <DialogContent className="sm:max-w-6xl max-h-[95vh] p-0 overflow-hidden bg-black border-border/20 shadow-2xl">
            <div className="relative w-full h-full flex flex-col">
              {/* Top controls bar */}
              <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="text-white/90">
                    <p className="text-sm font-medium">
                      {selectedIndex + 1} / {photos.length}
                    </p>
                    <p className="text-xs text-white/70">
                      {selectedPhoto.timestamp
                        ? new Date(selectedPhoto.timestamp).toLocaleDateString(
                            "en-US",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }
                          )
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Zoom controls */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleZoom(false)}
                      disabled={zoomLevel <= 0.5}
                      className="rounded-full bg-white/10 text-white hover:bg-white/20 h-9 w-9"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleZoom(true)}
                      disabled={zoomLevel >= 3}
                      className="rounded-full bg-white/10 text-white hover:bg-white/20 h-9 w-9"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>

                    {/* Fullscreen toggle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFullScreen}
                      className="rounded-full bg-white/10 text-white hover:bg-white/20 h-9 w-9"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>

                    {/* Download button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadPhoto(selectedPhoto)}
                      className="rounded-full bg-white/10 text-white hover:bg-white/20 h-9 w-9"
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    {/* Delete button */}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="rounded-full bg-red-500/80 text-white hover:bg-red-600 h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Close button */}
                    <DialogClose asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-white/10 text-white hover:bg-white/20 h-9 w-9"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </DialogClose>
                  </div>
                </div>
              </div>

              {/* Next/Prev Navigation Buttons */}
              {photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigatePhotos("prev")}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/30 text-white hover:bg-black/50 h-12 w-12"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigatePhotos("next")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/30 text-white hover:bg-black/50 h-12 w-12"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}

              {/* Improved Image Container with Zoom */}
              <div
                className={cn(
                  "flex-1 flex items-center justify-center pt-16 pb-4 overflow-auto",
                  isFullScreen ? "bg-black" : ""
                )}
              >
                <div
                  className="relative flex items-center justify-center transition-transform duration-300 ease-out"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <img
                    ref={imageRef}
                    src={selectedPhoto.photoUrl}
                    alt="Photo"
                    className="max-w-full max-h-[85vh] object-contain"
                    style={{
                      transition: "transform 300ms ease-out",
                    }}
                  />
                </div>
              </div>

              {/* Large Close Button at the bottom */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
                <DialogClose asChild>
                  <Button
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 py-2 rounded-full shadow-lg transition-all duration-300"
                    onClick={() => setSelectedPhoto(null)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this photo? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeletePhoto(selectedPhoto)}
              disabled={isDeleting}
              className="flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Photo
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .shimmer-effect {
          background-size: 1000px 100%;
          animation: shimmer 2s infinite linear;
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
      `}</style>
    </div>
  );
}
