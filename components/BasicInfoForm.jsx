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
import { Plus, X, Edit2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Loader from "@/components/Loader";


const basicInfoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  bio: z.string().max(500, "Bio must not exceed 500 characters"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  about: z.string().min(10, "About must be at least 10 characters"),
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
  const [businessTags, setBusinessTags] = useState([]);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [editingTagIndex, setEditingTagIndex] = useState(-1);
  const [editingTagValue, setEditingTagValue] = useState("");
  const [isAddingCustomTag, setIsAddingCustomTag] = useState(false);
  const [customTagValue, setCustomTagValue] = useState("");
  const [businessCategories, setBusinessCategories] = useState([]);

  const user = auth.currentUser;
  const form = useForm({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: "",
      businessName: "",
      phone: "",
      address: "",
      bio: "",
      website: "",
      about: "",
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
          setBusinessTags(userData.businessTags || []);
          setBusinessCategories(userData.business_categories || []);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, form]);

  const formatTag = (tag) => {
    return tag
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  const handleGenerateTags = async () => {
    const about = form.getValues("about");
    if (!about) {
      toast.error("Please fill in the about section first");
      return;
    }

    setIsGeneratingTags(true);
    try {
      const response = await fetch("/api/generate-ai-tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: about }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setBusinessTags(data.tags);
      toast.success("Tags generated successfully!");
    } catch (error) {
      console.error("Error generating tags:", error);
      toast.error("Failed to generate tags");
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleDeleteTag = (index) => {
    setBusinessTags((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditTag = (index) => {
    setEditingTagIndex(index);
    setEditingTagValue(businessTags[index]);
  };

  const handleSaveEdit = (index) => {
    const formattedTag = formatTag(editingTagValue);
    if (formattedTag) {
      setBusinessTags((prev) =>
        prev.map((tag, i) => (i === index ? formattedTag : tag))
      );
    }
    setEditingTagIndex(-1);
    setEditingTagValue("");
  };

  const handleAddCustomTag = () => {
    const formattedTag = formatTag(customTagValue);
    if (formattedTag) {
      setBusinessTags((prev) => [...prev, formattedTag]);
      setCustomTagValue("");
      setIsAddingCustomTag(false);
    }
  };

  const handleBusinessCategoryChange = (category) => {
    setBusinessCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((item) => item !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  async function updateProfile(userData) {
    try {
      // Update user document
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          ...userData,
          businessTags,
          business_categories: businessCategories,
        },
        { merge: true }
      );

      // Also update the business document
      const businessRef = doc(db, "businesses", user.uid);

      // Create an object with only the fields that have values
      const businessData = {
        business_categories: businessCategories,
        businessTags: businessTags,
      };

      // Only add these fields if they exist in userData
      if (userData.businessName) {
        businessData.businessName = userData.businessName;
      }

      if (userData.profilePic) {
        businessData.profilePic = userData.profilePic;
      }

      if (userData.coverPic) {
        businessData.coverPic = userData.coverPic;
      }

      await setDoc(businessRef, businessData, { merge: true });

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

  async function onSubmit(data) {
    setIsSubmitting(true);
    const toastId = toast.loading("Saving changes...");

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      let profileImageUrl = null;
      let coverImageUrl = null;

      // Upload profile image if it exists
      if (profileImageFile) {
        try {
          toast.loading("Uploading Profile Image...", { id: toastId });
          profileImageUrl = await uploadImage(profileImageFile, "profileImg");
        } catch (uploadError) {
          console.error("Profile image upload failed:", uploadError);
          toast.error("Failed to upload profile image", { id: toastId });
          throw uploadError;
        }
      }

      // Upload cover image if it exists
      if (coverImageFile) {
        try {
          toast.loading("Uploading Cover Image...", { id: toastId });
          coverImageUrl = await uploadImage(coverImageFile, "coverImg");
        } catch (uploadError) {
          console.error("Cover image upload failed:", uploadError);
          toast.error("Failed to upload cover image", { id: toastId });
          throw uploadError;
        }
      }

      toast.loading("Saving Data...", { id: toastId });

      const updatedData = {
        ...data,
      };

      // Only add image URLs if they were successfully uploaded
      if (profileImageUrl) {
        updatedData.profilePic = profileImageUrl;
      }

      if (coverImageUrl) {
        updatedData.coverPic = coverImageUrl;
      }

      setUploadingType(null);
      setUploadingProgress({
        profileImg: 0,
        coverImg: 0,
      });

      // Save to Firestore
      try {
        await updateProfile(updatedData);
        toast.success("Details Saved Successfully!", { id: toastId });
      } catch (updateError) {
        console.error("Failed to save data to Firestore:", updateError);
        toast.error("Failed to update basic information. Please try again.", {
          id: toastId,
        });
        throw updateError;
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      // Toast error is handled in the nested try-catch blocks
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader/>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-semibold mb-6">Business Profile</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <ImageUpload
                label="Profile Image"
                currentImage={form.getValues("profilePic") || ""}
                onImageChange={setProfileImageFile}
                isSubmitting={isSubmitting}
              />
            </div>
            <div className="md:col-span-2">
              <ImageUpload
                label="Cover Image"
                currentImage={form.getValues("coverPic") || ""}
                onImageChange={setCoverImageFile}
                isCover
                isSubmitting={isSubmitting}
              />
            </div>

            {uploadingType && (
              <div className="md:col-span-2 bg-blue-50 p-3 rounded-md">
                <div className="flex items-center gap-2">
                  <Loader/>
                  <span>
                    {uploadingType === "profileImg"
                      ? `Profile Image Uploading... ${uploadingProgress.profileImg.toFixed(0)}%`
                      : `Cover Image Uploading... ${uploadingProgress.coverImg.toFixed(0)}%`}
                  </span>
                </div>
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
                      className="bg-gray-50"
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
                      className="bg-gray-50"
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
                      className="bg-gray-50"
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
                      className="bg-gray-50"
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
                <FormItem className="md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Business St, City, Country"
                      {...field}
                      disabled={isSubmitting}
                      className="bg-gray-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2">
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
                        className="bg-gray-50 min-h-[100px]"
                      />
                    </FormControl>
                    <FormDescription>Max 500 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="about"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About Your Business</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Tell us about your business in detail..."
                          {...field}
                          disabled={isSubmitting}
                          className="bg-gray-50 min-h-[150px]"
                        />
                        <Button
                          type="button"
                          onClick={handleGenerateTags}
                          disabled={isGeneratingTags || !field.value}
                          variant="secondary"
                          className="mt-2"
                        >
                          {isGeneratingTags ? (
                            <>
                              <Loader/>
                              Generating...
                            </>
                          ) : (
                            <>Generate Tags</>
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Business Tags</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingCustomTag(true)}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Custom Tag
                </Button>
              </div>

              <div className="p-4 bg-gray-50 rounded-md">
                <div className="flex flex-wrap gap-2">
                  {businessTags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      {editingTagIndex === index ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editingTagValue}
                            onChange={(e) => setEditingTagValue(e.target.value)}
                            className="h-6 w-24 text-xs"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveEdit(index)}
                            className="h-6 w-6 p-0"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span>{tag}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTag(index)}
                            className="h-4 w-4 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTag(index)}
                            className="h-4 w-4 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </Badge>
                  ))}

                  {businessTags.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No tags yet. Generate tags from your business description
                      or add custom tags.
                    </p>
                  )}

                  {isAddingCustomTag && (
                    <div className="flex items-center gap-2 w-full mt-2">
                      <Input
                        value={customTagValue}
                        onChange={(e) => setCustomTagValue(e.target.value)}
                        placeholder="Enter custom tag"
                        className="h-8"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddCustomTag}
                        disabled={!customTagValue.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAddingCustomTag(false);
                          setCustomTagValue("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <FormLabel>Business Category</FormLabel>
              <div className="mt-2 space-y-2 p-4 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="serviceBasedBusiness"
                    checked={businessCategories.includes("service")}
                    onCheckedChange={() =>
                      handleBusinessCategoryChange("service")
                    }
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor="serviceBasedBusiness"
                    className="text-sm cursor-pointer"
                  >
                    Service-Based Business
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="productBasedBusiness"
                    checked={businessCategories.includes("product")}
                    onCheckedChange={() =>
                      handleBusinessCategoryChange("product")
                    }
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor="productBasedBusiness"
                    className="text-sm cursor-pointer"
                  >
                    Product-Based Business
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader/>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
