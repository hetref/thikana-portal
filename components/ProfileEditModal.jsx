"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import ImageUpload from "./ImageUpload";
import { db, storage, updateProfile, uploadImage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";

export default function ProfileEditModal({ isOpen, onClose, currentUser }) {
  const [isBusinessUser, setIsBusinessUser] = useState(
    currentUser?.role === "business"
  );
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: currentUser?.name || "",
      username: currentUser?.username || "",
      email: currentUser?.email || "",
      phone: currentUser?.phone || "",
      location: currentUser?.location || "",
      website: currentUser?.website || "",
      bio: currentUser?.bio || "",
    },
  });

  const onSubmit = async (data) => {
    try {
      let profileImageUrl = currentUser?.profileImage;
      let coverImageUrl = currentUser?.coverImage;
      if (profileImageFile) {
        profileImageUrl = await uploadImage(profileImageFile);
      }
      if (isBusinessUser) {
        if (coverImageFile) {
          coverImageUrl = await uploadImage(coverImageFile);
        }
      } else {
        coverImageUrl = null;
      }
      const updatedData = {
        ...data,
        ...(profileImageUrl ? { profilePic: profileImageUrl } : {}),
        ...(coverImageUrl ? { coverPic: coverImageUrl } : {}),
      };
      console.log("UPDATEDDATA", updatedData);
      await updateProfile(updatedData);
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  async function updateProfile(userData) {
    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, userData, { merge: true });
  }

  async function uploadImage(file, onProgress) {
    const storageRef = ref(storage, `${currentUser.uid}/profilePhoto`);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 pr-4 custom-scrollbar"
        >
          <ImageUpload
            label="Profile Image"
            currentImage={currentUser?.profileImage}
            onImageChange={setProfileImageFile}
          />
          {isBusinessUser && (
            <>
              <ImageUpload
                label="Cover Image"
                currentImage={currentUser?.coverImage}
                onImageChange={setCoverImageFile}
                isCover
              />
            </>
          )}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              {...register("username", { required: "Username is required" })}
            />
            {errors.username && (
              <p className="text-red-500 text-sm">{errors.username.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register("location")} />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" {...register("website")} />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" {...register("bio")} />
          </div>
          <Button type="submit" className="w-full">
            Save Changes
          </Button>
        </form>
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
