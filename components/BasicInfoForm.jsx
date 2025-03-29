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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

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
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full shadow-md border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold">Business Profile</CardTitle>
        <p className="text-muted-foreground">
          Update your business information and profile images
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="images" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="info">Business Information</TabsTrigger>
              </TabsList>

              <TabsContent value="images" className="space-y-6">
                <div className="flex flex-col gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Profile Image</h3>
                    <ImageUpload
                      label="Profile Image"
                      currentImage={form.getValues("profilePic")}
                      onImageChange={setProfileImageFile}
                      className="aspect-square rounded-full"
                    />
                    {uploadingType === "profileImg" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading...</span>
                          <span>
                            {uploadingProgress.profileImg.toFixed(0)}%
                          </span>
                        </div>
                        <Progress
                          value={uploadingProgress.profileImg}
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Cover Image</h3>
                    <ImageUpload
                      label="Cover Image"
                      currentImage={form.getValues("coverPic")}
                      onImageChange={setCoverImageFile}
                      isCover
                      className="aspect-[3/1] rounded-md"
                    />
                    {uploadingType === "coverImg" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading...</span>
                          <span>{uploadingProgress.coverImg.toFixed(0)}%</span>
                        </div>
                        <Progress
                          value={uploadingProgress.coverImg}
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="info" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Personal Details</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Doe"
                              {...field}
                              disabled={isSubmitting}
                              className="border-input hover:border-primary focus:border-primary transition-colors"
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
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+1234567890"
                              {...field}
                              disabled={isSubmitting}
                              className="border-input hover:border-primary focus:border-primary transition-colors"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Business Details</h3>
                  <div className="grid md:grid-cols-2 gap-4">
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
                              className="border-input hover:border-primary focus:border-primary transition-colors"
                            />
                          </FormControl>
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
                              className="border-input hover:border-primary focus:border-primary transition-colors"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123 Business St, City, Country"
                              {...field}
                              disabled={isSubmitting}
                              className="border-input hover:border-primary focus:border-primary transition-colors"
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
                              className="border-input hover:border-primary focus:border-primary transition-colors"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about your business..."
                            {...field}
                            disabled={isSubmitting}
                            className="min-h-[120px] resize-y border-input hover:border-primary focus:border-primary transition-colors"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Write a short description about your business. Max 500
                          characters.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px] transition-all"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
