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
import { Label } from "@/components/ui/label";
import { collection, addDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { Loader2, Upload, ImageIcon, X } from "lucide-react";
import toast from "react-hot-toast";

export default function AddPhotoModal({ isOpen, onClose, userId }) {
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) return;

    setIsLoading(true);
    setUploadProgress(0);

    try {
      const imageUrl = await uploadImage(imageFile, (progress) => {
        setUploadProgress(progress);
      });
      await addPhotoToFirestore(userId, {
        imageUrl,
      });
      setUploadProgress(100);
      toast.success("Photo added successfully!");
      setTimeout(() => {
        onClose();
        setImageFile(null);
        setPreviewUrl(null);
        setIsLoading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Error adding photo:", error);
      toast.error("Failed to upload photo. Please try again.");
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

  async function addPhotoToFirestore(userId, photoData) {
    // Add the photo to the subcollection with a random document ID
    const userPhotosRef = collection(db, "users", userId, "photos");

    // Create photo data with required fields
    const photoDocData = {
      photoUrl: photoData.imageUrl,
      timestamp: new Date().toISOString(),
    };

    // Add the document to the subcollection
    await addDoc(userPhotosRef, photoDocData);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden">
        <DialogHeader className="bg-primary/5 p-6 border-b">
          <DialogTitle className="text-xl font-semibold">Add Photo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {!previewUrl ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById("photo-upload").click()}
            >
              <ImageIcon className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-base font-medium mb-1">
                Click to upload an image
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                PNG, JPG or WEBP (max. 10MB)
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mx-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose file
              </Button>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-full aspect-video relative bg-black/5 rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full h-8 w-8"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
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

          <DialogFooter className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={!imageFile || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Photo"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
