"use client";
import React, { useEffect, useState, useRef } from "react";
import { Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { toast } from "react-hot-toast";

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
          width: 90,
          height: 90,
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
      const requestFormData = new FormData();
      requestFormData.append("type", type);
      
      // For title generation, send only the image
      if (type === "title") {
        if (!formData.image) {
          throw new Error("Please upload an image first");
        }
        requestFormData.append("image", formData.image);
      }
      
      // For description generation, send both title and image
      if (type === "description") {
        if (!formData.title) {
          throw new Error("Please provide a title first");
        }
        requestFormData.append("prompt", formData.title);
        if (formData.image) {
          requestFormData.append("image", formData.image);
        }
      }

      const response = await fetch("/api/generate-content", {
        method: "POST",
        body: requestFormData,
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

  return (
    <Card className="max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle className="text-center">Create Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="image">Image</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required
            />
            {showCropper && imgSrc && (
              <div className="mt-4">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  aspect={16 / 9}
                  className="max-w-full"
                >
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    onLoad={onImageLoad}
                    alt="Crop me"
                    className="max-w-full"
                  />
                </ReactCrop>
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleCropComplete}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Apply Crop
                  </Button>
                </div>
              </div>
            )}
            {formData.preview && !showCropper && (
              <div className="mt-4">
                <img
                  src={formData.preview}
                  alt="Preview"
                  className="max-w-full rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="title">Title</Label>
              {formData.preview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => generateContent("title")}
                  disabled={loading.isGenerating}
                  className="h-8 w-8"
                >
                  <Wand2 className="h-4 w-4" />
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
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="description">Description</Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => generateContent("description")}
                disabled={
                  loading.isGenerating || (!formData.title && !formData.preview)
                }
                className="h-8 w-8"
              >
                <Wand2 className="h-4 w-4" />
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
              rows={4}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading.isSubmitting || loading.isGenerating}
          >
            {loading.isSubmitting ? "Creating..." : "Create Post"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreatePost;
