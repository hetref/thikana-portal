"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  setDoc,
} from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

export default function AddPhotoModal({ isOpen, onClose, userId }) {
  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  console.log("USERID", userId);

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
    if (!imageFile || !title) return;

    setIsLoading(true);
    setUploadProgress(0);

    try {
      const imageUrl = await uploadImage(imageFile, (progress) => {
        setUploadProgress(progress);
      });
      await addPhotoToFirestore(userId, {
        title,
        imageUrl,
        createdAt: new Date().toISOString(),
      });
      setUploadProgress(100);
      setTimeout(() => {
        onClose();
        setTitle("");
        setImageFile(null);
        setPreviewUrl(null);
        setIsLoading(false);
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      console.error("Error adding photo:", error);
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
    // const userPhotosRef = collection(db, "users", userId, "photos");
    // await addDoc(userPhotosRef, photoData);

    // Update the user document to include the new photo object
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const photosArray = userData.photos || []; // Check if photos array exists

      // Create the new photo object
      const newPhotoObject = {
        photoUrl: photoData.imageUrl,
        title: photoData.title,
        addedOn: new Date().toISOString(),
      };

      // Update the user document
      await updateDoc(userRef, {
        photos: arrayUnion(newPhotoObject), // Add the new photo object to the array
      });
    } else {
      // If the user document does not exist, handle accordingly (optional)
      console.error("User document does not exist.");

      // Optionally, create the user document with an empty photos array
      await setDoc(userRef, {
        photos: [
          {
            photoUrl: photoData.imageUrl,
            title: photoData.title,
            addedOn: new Date().toISOString(),
          },
        ],
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Photo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="image">Image</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required
            />
          </div>
          {previewUrl && (
            <div className="space-y-2">
              <div className="w-full h-40 relative">
                <img
                  src={previewUrl || "/placeholder.svg"}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemoveImage}
              >
                Remove Image
              </Button>
            </div>
          )}
          {isLoading && (
            <div className="text-center">
              <p>Uploading... {uploadProgress.toFixed(0)}%</p>
              {uploadProgress === 100 && <p>Upload complete!</p>}
            </div>
          )}
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-blend-darken"
            disabled={!imageFile || !title || isLoading}
          >
            {isLoading ? "Uploading..." : "Add Photo"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
