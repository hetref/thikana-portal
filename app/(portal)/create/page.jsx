"use client";
import React, { useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const CreatePost = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !description || !image) {
      alert("All fields are required!");
      return;
    }

    setIsLoading(true);
    const storage = getStorage();
    const fileName = `${Date.now()}-${uuidv4()}`;
    const storageRef = ref(
      storage,
      `${auth.currentUser.uid}/posts/${fileName}`
    );

    try {
      await uploadBytes(storageRef, image);
      const downloadURL = await getDownloadURL(storageRef);

      const postId = uuidv4();
      const createdAt = new Date();
      const userId = auth.currentUser.uid;

      await setDoc(doc(db, "posts", postId), {
        postId: postId,
        businessId: userId, // Assuming the user is the business owner
        mediaUrl: [downloadURL],
        caption: description,
        categories: [], // Placeholder for AI-detected categories or tags
        detectedTags: [], // Placeholder for AI-generated tags
        location: null, // Can be updated with geolocation data if available
        createdAt: createdAt,
        engagement: {
          likes: 0,
          commentsCount: 0,
          shares: 0,
          saves: 0,
        },
        analytics: {
          views: 0,
          timeSpent: 0,
        },
      });

      alert("Post created successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "0 auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center", color: "#333" }}>Create Post</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "15px" }}
      >
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
            required
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
            rows="4"
            required
          ></textarea>
        </div>
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
            required
          />
        </div>
        {preview && (
          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <img
              src={preview}
              alt="Preview"
              style={{ maxWidth: "100%", borderRadius: "10px" }}
            />
          </div>
        )}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007BFF",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {isLoading ? "Creating..." : "Create Post"}
        </button>
      </form>
    </div>
  );
};

export default CreatePost;
