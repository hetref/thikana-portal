"use client";

import React, { useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { AiOutlineRobot } from "react-icons/ai";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import axios from "axios";

const CreatePost = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const router = useRouter();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file?.type.startsWith("image/")) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    } else {
      alert("Please upload a valid image file (jpg, png, etc.)");
      setImage(null);
      setPreview(null);
    }
  };

  const toggleDialog = () => setDialogOpen((prev) => !prev);

  const handleGenerateDescription = async (option) => {
    if (!image) {
      alert("Please upload an image before generating a description.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", image);

      // Call the backend API to analyze the image
      const visionResponse = await axios.post(
        "http://localhost:5000/analyze-image",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const visionAnalysis = visionResponse.data.labels;
      const userPrompt = option === "prompt" ? inputValue : "";

      // Call the backend API to generate the description
      const descriptionResponse = await axios.post(
        "http://localhost:5000/generate-description",
        {
          prompt: `Image analysis: ${visionAnalysis}. User's additional input: ${userPrompt}`,
        }
      );

      setDescription(descriptionResponse.data.description);
      alert("Description generated successfully!");
    } catch (error) {
      console.error("Error generating description:", error);
      alert("Failed to generate description. Please try again.");
    } finally {
      setIsLoading(false);
      toggleDialog();
    }
  };
  // Submit the post
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
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          marginTop: "20px",
        }}
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
        <div
          style={{
            display: "flex",
            justifyContent: "inherit",
            alignItems: "center",
          }}
        >
          <button
            onClick={handleSubmit}
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
          <button
            type="button"
            onClick={toggleDialog}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "24px",
              marginLeft: "10px",
            }}
          >
            <AiOutlineRobot />
          </button>
        </div>
      </form>
      <Dialog open={dialogOpen} onClose={toggleDialog}>
        <DialogTitle>Generate Description</DialogTitle>
        <DialogContent>
          <p>Select an option to generate a description:</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleGenerateDescription("image")}>
            Based on Image
          </Button>
          <Button onClick={() => handleGenerateDescription("prompt")}>
            Based on Prompt
          </Button>
          <Button onClick={toggleDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default CreatePost;
