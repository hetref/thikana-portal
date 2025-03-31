"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { auth, db, storage } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { Loader2, Info } from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

// Simple schema for validation
const userInfoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
});

export default function UserSettings() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [daysUntilUsernameChange, setDaysUntilUsernameChange] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      name: "",
      username: "",
    },
  });

  // Load user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!auth.currentUser) {
          setIsLoading(false);
          return;
        }

        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserData(data);

          // Set form values
          setValue("name", data.name || "");
          setValue("username", data.username || "");

          // Set image previews
          if (data.profilePic) {
            setProfilePicPreview(data.profilePic);
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
        toast.error("Could not load user data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [setValue]);

  // Handle profile pic file change
  const handleProfilePicChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to Firebase Storage
  const uploadImage = async (file, type) => {
    if (!auth.currentUser) return null;

    const storageRef = ref(storage, `${auth.currentUser.uid}/${type}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    if (type === "profileImg") {
      setUploadingProfilePic(true);
    }

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Progress handling if needed
        },
        (error) => {
          if (type === "profileImg") {
            setUploadingProfilePic(false);
          }
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          if (type === "profileImg") {
            setUploadingProfilePic(false);
          }
          resolve(downloadURL);
        }
      );
    });
  };

  // Form submission handler
  const onSubmit = async (data) => {
    if (!auth.currentUser) {
      toast.error("You must be logged in");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if username is being changed
      const isUsernameChanged = userData?.username !== data.username;

      // Prepare update data
      const updateData = {
        name: data.name,
      };

      // Handle username change
      if (isUsernameChanged) {
        if (!canChangeUsername) {
          toast.error(
            `You can change your username only once every 2 months. ${daysUntilUsernameChange} days remaining.`
          );
          setIsSubmitting(false);
          return;
        }

        updateData.username = data.username;
        updateData.lastUsernameChange = new Date();
      }

      // Upload profile pic if changed
      if (profilePicFile) {
        const profilePicURL = await uploadImage(profilePicFile, "profileImg");
        updateData.profilePic = profilePicURL;
      }

      // Update user document
      await setDoc(doc(db, "users", auth.currentUser.uid), updateData, {
        merge: true,
      });

      // Update local state if username changed
      if (isUsernameChanged && canChangeUsername) {
        setCanChangeUsername(false);
        setDaysUntilUsernameChange(60);
      }

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get formatted creation date
  const createdAt = userData?.createdAt?.toDate
    ? new Date(userData.createdAt.toDate()).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : auth.currentUser?.metadata?.creationTime
      ? new Date(auth.currentUser.metadata.creationTime).toLocaleDateString(
          "en-US",
          {
            month: "long",
            day: "numeric",
            year: "numeric",
          }
        )
      : "N/A";

  if (isLoading) {
    return (
      <div className="container mx-auto py-[30px] flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-[30px]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">User Profile Settings</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Profile Information</h2>
              <p className="text-gray-600">Update your personal information</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Profile Image and Banner Section */}
              <div className="md:col-span-1">
                <div className="flex flex-col items-center space-y-8">
                  {/* Profile Picture */}
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md mx-auto">
                        <Image
                          src={
                            profilePicPreview ||
                            userData?.profilePic ||
                            "/avatar.png"
                          }
                          alt="Profile"
                          width={128}
                          height={128}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="profile-pic"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Profile Picture
                      </label>
                      <input
                        type="file"
                        id="profile-pic"
                        accept="image/*"
                        onChange={handleProfilePicChange}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-primary file:text-white
                          hover:file:bg-primary/90"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="md:col-span-2">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Name and Username */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Full Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        placeholder="Your full name"
                        {...register("name")}
                        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border ${errors.name ? "border-red-500" : ""}`}
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
                          className="block text-sm font-medium text-gray-700"
                        >
                          Username
                        </label>
                        {!canChangeUsername && (
                          <div className="text-amber-500 text-xs flex items-center">
                            <Info className="h-4 w-4 mr-1" />
                            <span>
                              {daysUntilUsernameChange} days until change
                            </span>
                          </div>
                        )}
                      </div>
                      <input
                        id="username"
                        type="text"
                        placeholder="Your username"
                        {...register("username")}
                        disabled={!canChangeUsername}
                        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border ${errors.username ? "border-red-500" : ""} ${!canChangeUsername ? "bg-gray-100" : ""}`}
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

                  {/* Email and Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Email (Read-only)
                      </label>
                      <input
                        id="email"
                        type="text"
                        value={auth.currentUser?.email || ""}
                        disabled
                        className="block w-full rounded-md bg-gray-50 border-gray-300 shadow-sm sm:text-sm p-2 border"
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Your primary email address
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Phone (Read-only)
                      </label>
                      <input
                        id="phone"
                        type="text"
                        value={userData?.phone || "Not provided"}
                        disabled
                        className="block w-full rounded-md bg-gray-50 border-gray-300 shadow-sm sm:text-sm p-2 border"
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Created At */}
                  <div className="space-y-2">
                    <label
                      htmlFor="createdAt"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Account Created
                    </label>
                    <input
                      id="createdAt"
                      type="text"
                      value={createdAt}
                      disabled
                      className="block w-full rounded-md bg-gray-50 border-gray-300 shadow-sm sm:text-sm p-2 border"
                      readOnly
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Your account creation date
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || uploadingProfilePic}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting || uploadingProfilePic ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
