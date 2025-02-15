"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import ImageUpload from "./ImageUpload";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

const basicInfoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  location: z.string().min(2, "Location must be at least 2 characters"),
  bio: z.string().max(500, "Bio must not exceed 500 characters"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export default function BasicInfoForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [uploadingProgress, setUploadingProgress] = useState({
    profileImg: 0,
    coverImg: 0,
  });
  const [uploadingType, setUploadingType] = useState(null);
  const user = auth.currentUser;
  const form = useForm({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: "",
      businessName: "",
      phone: "",
      address: "",
      location: "",
      bio: "",
      website: "",
    },
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          form.reset(userData);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, form]);

  async function updateProfile(userData) {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, userData, { merge: true });
  }

  async function uploadImage(file, type) {
    setUploadingType(type);
    const storageRef = ref(storage, `${user.uid}/${type}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadingProgress((prev) => ({
            ...prev,
            [type]: progress,
          }));
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

  async function onSubmit(data) {
    setIsSubmitting(true);
    const toastId = toast.loading("Saving changes...");

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      let profileImageUrl = null;
      let coverImageUrl = null;

      if (profileImageFile) {
        toast.loading("Uploading Profile Image...", { id: toastId });
        profileImageUrl = await uploadImage(profileImageFile, "profileImg");
      }
      if (coverImageFile) {
        toast.loading("Uploading Cover Image...", { id: toastId });
        coverImageUrl = await uploadImage(coverImageFile, "coverImg");
      }

      toast.loading("Saving Data...", { id: toastId });

      const updatedData = {
        ...data,
        ...(profileImageUrl ? { profilePic: profileImageUrl } : {}),
        ...(coverImageUrl ? { coverPic: coverImageUrl } : {}),
      };

      setUploadingType(null);
      setUploadingProgress({
        profileImg: 0,
        coverImg: 0,
      });

      await updateProfile(updatedData);
      toast.success("Details Saved Successfully!", { id: toastId });
    } catch (error) {
      console.error("Error updating basic information:", error);
      toast.error("Failed to update basic information. Please try again.", {
        id: toastId,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ImageUpload
          label="Profile Image"
          currentImage={form.getValues("profilePic")}
          onImageChange={setProfileImageFile}
        />
        <ImageUpload
          label="Cover Image"
          currentImage={form.getValues("coverPic")}
          onImageChange={setCoverImageFile}
          isCover
        />
        {uploadingType && (
          <div>
            {uploadingType === "profileImg"
              ? `Profile Image Uploading... ${uploadingProgress.profileImg.toFixed(
                  0
                )}%`
              : `Cover Image Uploading... ${uploadingProgress.coverImg.toFixed(
                  0
                )}%`}
          </div>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Inc."
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input
                  placeholder="+1234567890"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="123 Business St, City, Country"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input
                  placeholder="City, Country"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about your business..."
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>Max 500 characters</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://www.example.com"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}
