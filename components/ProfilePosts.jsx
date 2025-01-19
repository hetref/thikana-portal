"use client";
import React, { useEffect, useState } from "react";
import { Card } from "./ui/card";
import useLikePost from "@/hooks/useLikePosts";
import { HeartIcon, MessageCircle, Trash2 } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { doc, updateDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ProfilePosts = ({ post: initialPost, userData, onPostDelete }) => {
  const [post, setPost] = useState(initialPost);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "posts", initialPost.id), (doc) => {
      if (doc.exists()) {
        setPost({ ...doc.data(), id: doc.id });
      } else {
        // If the document doesn't exist anymore, notify parent component
        onPostDelete?.(initialPost.id);
      }
    });

    return () => unsubscribe();
  }, [initialPost.id, onPostDelete]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      setIsDeleting(true);
      const postsRef = doc(db, "posts", postId);
      await deleteDoc(postsRef);
      // The onSnapshot listener will handle the UI update
      onPostDelete?.(postId);
    } catch (error) {
      console.error("Error deleting post: ", error);
      alert("Failed to delete post. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditPost = async (postId) => {
    if (!title.trim() || !description.trim()) {
      alert("Title and description cannot be empty.");
      return;
    }

    try {
      const postsRef = doc(db, "posts", postId);
      await updateDoc(postsRef, {
        title,
        description,
        lastUpdated: new Date(),
      });

      setPost((prev) => ({
        ...prev,
        title,
        description,
        lastUpdated: new Date(),
      }));

      setIsEditing(false);
    } catch (error) {
      console.error("Error updating post: ", error);
      alert("Failed to update post. Please try again.");
    }
  };

  const openEditDialog = () => {
    setTitle(post.title || "");
    setDescription(post.description || "");
    setIsEditing(true);
  };

  const { isLiked, likes, handleLikePost, isUpdating } = useLikePost(post);

  return (
    <div key={post.id} className="p-4">
      <div className="flex gap-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src={userData?.profilePic || "/avatar.png"} />
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {userData?.fullname || "User"}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(post.createdAt?.toDate()).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertDialog open={isEditing} onOpenChange={setIsEditing}>
                <AlertDialogTrigger
                  className="text-blue-500 hover:text-blue-600"
                  onClick={openEditDialog}
                >
                  Edit
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Edit Post</AlertDialogTitle>
                  </AlertDialogHeader>
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleEditPost(post.id);
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Title"
                      className="border border-black w-full p-2 rounded"
                      onChange={(e) => setTitle(e.target.value)}
                      value={title}
                    />
                    <textarea
                      placeholder="Description"
                      className="border border-black w-full p-2 rounded"
                      onChange={(e) => setDescription(e.target.value)}
                      value={description}
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setIsEditing(false)}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction type="submit">
                        Submit
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </form>
                </AlertDialogContent>
              </AlertDialog>
              <button
                onClick={() => handleDeletePost(post.id)}
                disabled={isDeleting}
                className="text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="mt-2">{post.description || "No description"}</p>
          <div onDoubleClick={handleLikePost} className="cursor-pointer">
            {post.image && (
              <img
                src={post.image}
                alt="Post image"
                className="mt-2 rounded-lg max-h-96 object-cover"
              />
            )}
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleLikePost}
                disabled={isUpdating}
                className={`flex items-center gap-1 ${
                  isLiked ? "text-red-500" : "text-gray-500"
                }`}
              >
                <HeartIcon
                  className={`w-6 h-6 ${isLiked ? "fill-red-500" : ""}`}
                />
                <span className="text-sm">{likes}</span>
              </button>
              <span className="text-sm text-muted-foreground">Likes</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              <span className="text-sm text-muted-foreground">
                {post.comments?.length || 0}
              </span>
              <span className="text-sm text-muted-foreground">Comments</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePosts;
