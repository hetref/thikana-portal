"use client";
import React, { useEffect, useState, useRef } from "react";
import { Wand2, Upload, FileImage, Edit3, Trash2, X, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { toast } from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CreatePost = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: null,
    preview: null,
  });
  const [loading, setLoading] = useState({
    isSubmitting: false,
    isGenerating: false,
  });
  const [businessType, setBusinessType] = useState("");
  const router = useRouter();

  // Edit and delete states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [editData, setEditData] = useState({
    postId: "",
    title: "",
    description: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Image crop states
  const [crop, setCrop] = useState(null);
  const [imgSrc, setImgSrc] = useState("");
  const [showCropper, setShowCropper] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const fetchBusinessType = async () => {
      if (!auth.currentUser?.uid) return;

      try {
        const businessRef = doc(db, "businesses", auth.currentUser.uid);
        const businessDoc = await getDoc(businessRef);
        if (businessDoc.exists()) {
          setBusinessType(businessDoc.data().business_type);
        }
      } catch (error) {
        console.error("Error fetching business type:", error);
      }
    };

    fetchBusinessType();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImgSrc(reader.result?.toString() || "");
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a valid image file (jpg, png, etc.)");
      setFormData((prev) => ({
        ...prev,
        image: null,
        preview: null,
      }));
    }
  };

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    const crop = makeAspectCrop(
      centerCrop(
        {
          unit: "%",
          width: 100,
          height: 65,
        },
        width,
        height
      ),
      16 / 9,
      width,
      height
    );
    setCrop(crop);
  };

  const getCroppedImg = (image, crop) => {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg");
    });
  };

  const handleCropComplete = async () => {
    if (imgRef.current && crop) {
      const croppedImageBlob = await getCroppedImg(imgRef.current, crop);
      setFormData((prev) => ({
        ...prev,
        image: croppedImageBlob,
        preview: URL.createObjectURL(croppedImageBlob),
      }));
      setShowCropper(false);
    }
  };

  const generateContent = async (type) => {
    setLoading((prev) => ({ ...prev, isGenerating: true }));

    try {
      const contentFormData = new FormData();
      contentFormData.append("type", type);
      contentFormData.append("prompt", type === "description" ? formData.title : "");
      if (formData.image) {
        contentFormData.append("image", formData.image);
      }

      const response = await fetch("/api/generate-content", {
        method: "POST",
        body: contentFormData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to generate content");
      }

      const data = await response.json();

      setFormData((prev) => ({
        ...prev,
        [type]: data.generated,
      }));
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate content. Please try again.");
    } finally {
      setLoading((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { title, description, image } = formData;

    if (!title || !description || !image) {
      alert("All fields are required!");
      return;
    }

    setLoading((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const storage = getStorage();
      const fileName = `${Date.now()}-${encodeURIComponent(title)}`;
      const storageRef = ref(
        storage,
        `${auth.currentUser.uid}/posts/${fileName}`
      );

      await uploadBytes(storageRef, image);
      const downloadURL = await getDownloadURL(storageRef);

      const postId = uuidv4();
      await setDoc(doc(db, "posts", postId), {
        uid: auth.currentUser.uid,
        title,
        content: description,
        mediaUrl: downloadURL,
        businessType,
        createdAt: serverTimestamp(),
        interactions: {
          likeCount: 0,
          viewCount: 0,
          shareCount: 0,
          lastWeekLikes: 0,
          lastWeekViews: 0,
        },
      });

      router.push("/");
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create the post. Please try again.");
    } finally {
      setLoading((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Edit post function
  const handleEditPost = async () => {
    if (!editData.title.trim() || !editData.description.trim()) {
      toast.error("Title and description cannot be empty.");
      return;
    }

    setIsEditing(true);
    try {
      const postRef = doc(db, "posts", editData.postId);
      await updateDoc(postRef, {
        title: editData.title,
        content: editData.description,
        lastUpdated: serverTimestamp(),
      });

      toast.success("Post updated successfully!");
      setShowEditDialog(false);
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Failed to update post. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  // Delete post function
  const handleDeletePost = async () => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "posts", editData.postId));
      toast.success("Post deleted successfully!");
      setShowDeleteAlert(false);
      // Optionally redirect or refresh posts
      router.refresh();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Open edit dialog with post data
  const openEditDialog = (post) => {
    setEditData({
      postId: post.id,
      title: post.title,
      description: post.content || post.description,
    });
    setShowEditDialog(true);
  };

  // Open delete confirmation
  const openDeleteDialog = (post) => {
    setEditData({
      postId: post.id,
      title: post.title,
      description: post.content || post.description,
    });
    setShowDeleteAlert(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Create Post</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Share your story with the world. Upload an image and craft compelling content that engages your audience.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Image Upload Section - Left */}
          <div className="lg:col-span-3">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload Image</h2>
                <p className="text-gray-600">Choose a high-quality image that represents your content</p>
              </div>

              {/* File Upload Area - Only show if no preview */}
              {!formData.preview && !showCropper && (
                <div className="relative group">
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 bg-gradient-to-br from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 hover:border-orange-300 transition-all duration-300 group-hover:scale-[1.02]">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="p-4 bg-white rounded-full shadow-sm border-2 border-orange-100">
                        <Upload className="w-8 h-8 text-orange-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium text-gray-900">Click to upload</p>
                        <p className="text-sm text-orange-600 mt-1">PNG, JPG up to 10MB</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Cropper */}
              {showCropper && imgSrc && (
                <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg">
                        <Edit3 className="w-4 h-4 text-white" />
                      </div>
                      Crop Image
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCropper(false)}
                      className="text-gray-500 hover:text-red-500 hover:bg-red-50"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      aspect={16 / 9}
                      className="max-w-full rounded-lg overflow-hidden"
                    >
                      <img
                        ref={imgRef}
                        src={imgSrc}
                        onLoad={onImageLoad}
                        alt="Crop preview"
                        className="max-w-full"
                      />
                    </ReactCrop>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={handleCropComplete}
                        className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                      >
                        Apply Crop
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Preview */}
              {formData.preview && !showCropper && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                        <FileImage className="w-4 h-4 text-white" />
                      </div>
                      Image Preview
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, image: null, preview: null }));
                        setImgSrc("");
                      }}
                      className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50 hover:border-amber-300"
                    >
                      <Upload className="w-4 h-4" />
                      Change Image
                    </Button>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl shadow-xl ring-4 ring-orange-100">
                    <img
                      src={formData.preview}
                      alt="Preview"
                      className="w-full object-cover aspect-[16/9] transition-transform duration-300 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-orange-900/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
              )}

              {!formData.preview && !showCropper && (
                <div className="aspect-[16/9] flex items-center justify-center border-2 border-dashed border-orange-200 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50">
                  <div className="text-center space-y-3">
                    <div className="p-4 bg-white rounded-full shadow-sm border-2 border-orange-100">
                      <FileImage className="w-16 h-16 text-orange-400 mx-auto" />
                    </div>
                    <p className="text-orange-600 font-medium">Image preview will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Section - Right */}
          <div className="lg:col-span-2">
            <div className="sticky top-8 space-y-8">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Content Details</h2>
                <p className="text-gray-600">Add engaging title and description for your post</p>
              </div>

              <div className="space-y-6">
                {/* Title Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="title" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Post Title
                    </Label>
                    {formData.preview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => generateContent("title")}
                        disabled={loading.isGenerating}
                        className="gap-2 border-amber-200 text-amber-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:border-amber-300 transition-all duration-200"
                      >
                        <div className={`${loading.isGenerating ? 'animate-spin' : ''}`}>
                          <Wand2 className="h-4 w-4" />
                        </div>
                        {loading.isGenerating ? "Generating..." : "AI Generate"}
                      </Button>
                    )}
                  </div>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                    placeholder="Enter an engaging title..."
                    className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl"
                  />
                </div>

                {/* Description Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Description
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateContent("description")}
                      disabled={
                        loading.isGenerating || (!formData.title && !formData.preview)
                      }
                      className="gap-2 border-amber-200 text-amber-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:border-amber-300 transition-all duration-200"
                    >
                      <div className={`${loading.isGenerating ? 'animate-spin' : ''}`}>
                        <Wand2 className="h-4 w-4" />
                      </div>
                      {loading.isGenerating ? "Generating..." : "AI Generate"}
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={8}
                    required
                    placeholder="Share your story... What makes this post special?"
                    className="resize-none border-gray-200 focus:border-orange-500 focus:ring-orange-500 text-base rounded-xl"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  className="w-full h-14 text-base font-semibold bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 hover:from-orange-600 hover:via-red-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  disabled={loading.isSubmitting || loading.isGenerating}
                >
                  {loading.isSubmitting ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating Post...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Create Post
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent className="max-w-2xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold flex items-center gap-2">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
                <Edit3 className="w-5 h-5 text-white" />
              </div>
              Edit Post
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="edit-title" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Title</Label>
              <Input
                id="edit-title"
                value={editData.title}
                onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter post title"
                className="h-11 rounded-xl border-gray-200 focus:border-black focus:ring-black"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-description" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Description</Label>
              <Textarea
                id="edit-description"
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter post description"
                rows={6}
                className="resize-none rounded-xl border-gray-200 focus:border-black focus:ring-black"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEditing} className="rounded-xl border-gray-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditPost}
              disabled={isEditing}
              className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 rounded-xl"
            >
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold flex items-center gap-2">
              <div className="p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              Delete Post
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-600">
              This action cannot be undone. This will permanently delete your post and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl border-gray-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Deleting...
                </div>
              ) : (
                "Delete Post"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreatePost;