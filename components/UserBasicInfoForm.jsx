"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import ImageUpload from "./ImageUpload";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { Loader2, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const userInfoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
});

export default function UserBasicInfoForm({ userData = null }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [bannerImagePreview, setBannerImagePreview] = useState(null);
  const [uploadingProgress, setUploadingProgress] = useState({
    profileImg: 0,
    bannerImg: 0,
  });
  const [uploadingType, setUploadingType] = useState(null);
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [daysUntilUsernameChange, setDaysUntilUsernameChange] = useState(0);
  const [businessData, setBusinessData] = useState(null);
  const [localUserData, setLocalUserData] = useState(userData);

  const user = auth.currentUser;
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
  } = useForm({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      name: "",
      username: "",
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
          const data = userDocSnap.data();
          setLocalUserData(data);

          // If user is a member, fetch the business data
          if (data.role === "member" && data.businessId) {
            try {
              const businessDocRef = doc(db, "users", data.businessId);
              const businessDocSnap = await getDoc(businessDocRef);

              if (businessDocSnap.exists()) {
                const businessData = businessDocSnap.data();
                setBusinessData(businessData);

                // For members, we want to show the business name but keep their personal name
                setValue("name", data.name || "");
                setValue(
                  "username",
                  data.username || businessData.username || ""
                );

                // Use business profile picture and banner if member doesn't have one
                if (!data.profilePic && businessData.profilePic) {
                  setProfileImagePreview(businessData.profilePic);
                } else if (data.profilePic) {
                  setProfileImagePreview(data.profilePic);
                }

                if (!data.bannerImage && businessData.bannerImage) {
                  setBannerImagePreview(businessData.bannerImage);
                } else if (data.bannerImage) {
                  setBannerImagePreview(data.bannerImage);
                }
              }
            } catch (error) {
              console.error("Error fetching business data:", error);
            }
          } else {
            // Set form values for non-member users
            setValue("name", data.name || "");
            setValue("username", data.username || "");

            // Set profile image preview
            if (data.profilePic) {
              setProfileImagePreview(data.profilePic);
            }

            // Set banner image preview
            if (data.bannerImage) {
              setBannerImagePreview(data.bannerImage);
            }
          }

          // Check if username can be changed
          if (data.lastUsernameChange) {
            const lastChange = new Date(data.lastUsernameChange.toDate());
            const now = new Date();
            const twoMonthsInMs = 60 * 24 * 60 * 60 * 1000; // 60 days
            const diffTime = now - lastChange;

            if (diffTime < twoMonthsInMs) {
              setCanChangeUsername(false);
              const remainingDays = Math.ceil(
                (twoMonthsInMs - diffTime) / (1000 * 60 * 60 * 24)
              );
              setDaysUntilUsernameChange(remainingDays);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, setValue]);

  async function updateProfile(updateData) {
    try {
      // Update user document
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, updateData, { merge: true });

      console.log("Profile updated successfully");
    } catch (error) {
      console.error("Error in updateProfile function:", error);
      throw error; // Re-throw to be caught by the calling function
    }
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

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      if (!user) return;

      let updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      // Upload profile image if changed
      if (profileImageFile) {
        const profileImageUrl = await uploadImage(
          profileImageFile,
          "profileImg"
        );
        if (profileImageUrl) {
          updateData.profilePic = profileImageUrl;
        }
      }

      // Upload banner image if changed
      if (bannerImageFile) {
        const bannerImageUrl = await uploadImage(bannerImageFile, "bannerImg");
        if (bannerImageUrl) {
          updateData.bannerImage = bannerImageUrl;
        }
      }

      // Determine where to save data based on user role
      const isMember = localUserData?.role === "member";
      const businessId = localUserData?.businessId;

      // If user is a member, we need to update in different places
      if (isMember && businessId) {
        // Update in the businesses/{businessId}/members/{memberId} collection
        const memberRef = doc(
          db,
          `businesses/${businessId}/members/${user.uid}`
        );
        await updateDoc(memberRef, {
          name: data.name,
          phone: localUserData?.phone || "",
          updatedAt: serverTimestamp(),
        });

        // Special handling for the business relationship
        toast.success(
          "Profile updated successfully for both your account and the business!"
        );
      } else {
        toast.success("Profile updated successfully!");
      }

      // Always update the users/{userId} document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, updateData);

      // Update local state
      if (localUserData?.username !== data.username && canChangeUsername) {
        setCanChangeUsername(false);
        setDaysUntilUsernameChange(60);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
      setUploadingType(null);
    }
  };

  const handleProfileImageChange = (file) => {
    setProfileImageFile(file);

    // Create preview
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerImageChange = (file) => {
    setBannerImageFile(file);

    // Create preview
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Format date for display
  const createdAt = localUserData?.createdAt?.toDate
    ? new Date(localUserData.createdAt.toDate()).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : user?.metadata?.creationTime
      ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "N/A";

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Profile Information</h2>
        {localUserData?.role === "member" && businessData && (
          <div className="bg-violet-50 border border-violet-200 rounded-md p-4">
            <p className="text-violet-800">
              You are a member of{" "}
              <span className="font-semibold">{businessData.businessName}</span>
            </p>
            <p className="text-sm text-violet-600 mt-1">
              Your profile is connected to this business account
            </p>
          </div>
        )}
        <p className="text-gray-600">Update your personal information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="flex flex-col items-center space-y-8">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-white shadow-md">
                <AvatarImage
                  src={
                    profileImagePreview ||
                    localUserData?.profilePic ||
                    "/avatar.png"
                  }
                  alt={localUserData?.name || "User"}
                />
                <AvatarFallback className="text-2xl font-semibold">
                  {localUserData?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="w-full">
              <ImageUpload
                title="Profile Picture"
                description="Upload a profile picture"
                defaultValue={localUserData?.profilePic}
                onChange={handleProfileImageChange}
                uploading={uploadingType === "profileImg"}
                progress={uploadingProgress.profileImg}
              />
            </div>

            <div className="w-full">
              <h3 className="text-lg font-medium mb-2">Banner Image</h3>
              {bannerImagePreview && (
                <div className="mb-4 rounded-lg overflow-hidden border">
                  <img
                    src={bannerImagePreview}
                    alt="Banner preview"
                    className="w-full h-32 object-cover"
                  />
                </div>
              )}
              <ImageUpload
                title="Banner Image"
                description="Upload a banner image"
                defaultValue={localUserData?.bannerImage}
                onChange={handleBannerImageChange}
                uploading={uploadingType === "bannerImg"}
                progress={uploadingProgress.bannerImg}
                aspectRatio={16 / 9}
              />
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-gray-700"
                >
                  Full Name
                </label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  {...register("name")}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="username"
                    className="text-sm font-medium text-gray-700"
                  >
                    Username
                  </label>
                  {!canChangeUsername && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-amber-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            You can change your username only once every 2
                            months.
                          </p>
                          <p>
                            {daysUntilUsernameChange} days until you can change
                            it again.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <Input
                  id="username"
                  placeholder="Your username"
                  {...register("username")}
                  disabled={!canChangeUsername}
                  className={errors.username ? "border-red-500" : ""}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {canChangeUsername
                    ? "You can change your username only once every 2 months."
                    : `You'll be able to change your username in ${daysUntilUsernameChange} days.`}
                </p>
                {errors.username && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.username.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email (Read-only)
                </label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-gray-50"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your primary email address
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-gray-700"
                >
                  Phone (Read-only)
                </label>
                <Input
                  id="phone"
                  value={localUserData?.phone || "Not provided"}
                  disabled
                  className="bg-gray-50"
                  readOnly
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="createdAt"
                className="text-sm font-medium text-gray-700"
              >
                Account Created
              </label>
              <Input
                id="createdAt"
                value={createdAt}
                disabled
                className="bg-gray-50"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">
                Your account creation date
              </p>
            </div>

            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
