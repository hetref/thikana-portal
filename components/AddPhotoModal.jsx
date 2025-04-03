"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  setDoc,
  addDoc,
} from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

// Utility function to format date and create dynamic time display
function formatDate(isoDateString) {
  const date = new Date(isoDateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // Format as dd/mm/yyyy
  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Dynamic time display
  if (diffInSeconds < 60) {
    return "Just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  } else {
    return formattedDate; // Fallback to formatted date
  }
}

export default function AddPhotoModal({ isOpen, onClose, userId }) {
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImageFiles(files);

      // Create preview URLs
      const previews = files.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(previews).then(setPreviewUrls);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImageFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setPreviewUrls((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (imageFiles.length === 0) return;

    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Upload images sequentially
      const uploadedPhotos = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const imageUrl = await uploadImage(imageFiles[i], (progress) => {
          // Calculate overall progress across all files
          const individualProgress = progress / imageFiles.length;
          setUploadProgress(
            (prevProgress) => prevProgress + individualProgress
          );
        });

        const uploadTimestamp = new Date().toISOString();
        uploadedPhotos.push({
          photoUrl: imageUrl,
          title: uploadTimestamp, // Use ISO timestamp
          addedOn: uploadTimestamp,
        });
      }

      // Add all photos to Firestore
      await addPhotosToFirestore(userId, uploadedPhotos);

      // Reset state after successful upload
      setTimeout(() => {
        onClose();
        setImageFiles([]);
        setPreviewUrls([]);
        setIsLoading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Error adding photos:", error);
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  async function uploadImage(file, onProgress) {
    const storageRef = ref(
      storage,
      `${userId}/photos/${Date.now()}_${file.name}`
    );
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  }

  async function addPhotosToFirestore(userId, photosData) {
    const photosRef = collection(db, "users", userId, "photos");

    // Add each photo as a separate document in the photos subcollection
    for (const photo of photosData) {
      await addDoc(photosRef, {
        photoUrl: photo.photoUrl,
        timestamp: new Date().toISOString(),
        uid: userId,
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Photos</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              id="images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              required
            />
          </div>

          {previewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1"
                    onClick={() => handleRemoveImage(index)}
                  >
                    X
                  </Button>
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center mb-2">
                <div className="w-full bg-muted-foreground/20 rounded-full h-2.5 mr-2">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium">
                  {uploadProgress.toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {uploadProgress < 100
                  ? "Uploading your photo..."
                  : "Upload complete!"}
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-blend-darken"
            disabled={imageFiles.length === 0 || isLoading}
          >
            {isLoading ? "Uploading..." : `Add ${imageFiles.length} Photo(s)`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Export the formatDate utility function for use in other components
export { formatDate };
