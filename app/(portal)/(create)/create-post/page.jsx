"use client";
import React, { useState } from "react";
import { Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";

const CreatePost = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    } else {
      alert("Please upload a valid image file (jpg, png, etc.)");
      setImage(null);
      setPreview(null);
    }
  };

  const generateContent = async (type) => {
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("prompt", type === "description" ? title : "");
      if (image) {
        formData.append("image", image);
      }

      const response = await fetch("/api/generate-content", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      if (type === "title") {
        setTitle(data.generated);
      } else {
        setDescription(data.generated);
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !description || !image) {
      alert("All fields are required!");
      return;
    }

    setIsLoading(true);

    const storage = getStorage();
    const fileName = `${Date.now()}-${title}`;
    const storageRef = ref(
      storage,
      `${auth.currentUser.uid}/posts/${fileName}`
    );

    try {
      // Upload the image to Firebase Storage
      await uploadBytes(storageRef, image);
      const downloadURL = await getDownloadURL(storageRef);

      // Save the post data to Firestore
      await setDoc(doc(db, "posts", uuidv4()), {
        title,
        description,
        image: downloadURL,
        uid: auth.currentUser.uid,
        createdAt: new Date(),
        likes: 0,
        comments: [],
        imageRef: fileName,
        user: `/users/${auth.currentUser.uid}`,
      });

      alert("Post created successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create the post. Please try again.");
    } finally {
      setIsLoading(false);
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
            {preview && (
              <div className="mt-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-w-full rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="title">Title</Label>
              {preview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => generateContent("title")}
                  disabled={isGenerating}
                  className="h-8 w-8"
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
                disabled={isGenerating || (!title && !preview)}
                className="h-8 w-8"
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || isGenerating}
          >
            {isLoading ? "Creating..." : "Create Post"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreatePost;
