"use client";
import React, { useEffect, useState } from "react";
import useLikePost from "@/hooks/useLikePosts";
import { Heart, MessageCircle, Trash2, Edit } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "posts", initialPost.id), (doc) => {
      if (doc.exists()) {
        setPost({ ...doc.data(), id: doc.id });
      } else {
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
      onPostDelete?.(postId);
    } catch (error) {
      console.error("Error deleting post: ", error);
      alert("Failed to delete post. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditPost = async (postId) => {
    if (!title.trim() || !content.trim()) {
      alert("Title and description cannot be empty.");
      return;
    }

    try {
      const postsRef = doc(db, "posts", postId);
      await updateDoc(postsRef, {
        title,
        content,
        lastUpdated: new Date(),
      });

      setPost((prev) => ({
        ...prev,
        title,
        content,
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
    setContent(post.content || "");
    console.log("Post data:", post);
    setIsEditing(true);
  };

  const { isLiked, likes, handleLikePost, isUpdating } = useLikePost(post);

  const handleLike = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isLikeProcessing || isUpdating) {
      return;
    }
    try {
      setIsLikeProcessing(true);
      await handleLikePost();
      setIsLikeProcessing(false);
    } catch (error) {
      console.error("Error handling like:", error);
      setIsLikeProcessing(false);
    }
  };

  return (
    <div key={post.id} className="p-4">
      {/* Post Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={userData?.profilePic || "/avatar.png"}
              alt={userData?.name || "User"}
            />
          </Avatar>
          <div>
            <p className="font-semibold">{userData?.name || "User"}</p>
            <p className="text-sm text-muted-foreground">
              @{userData?.username || "user"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog open={isEditing} onOpenChange={setIsEditing}>
            <AlertDialogTrigger
              className="text-blue-500 hover:text-blue-600"
              onClick={openEditDialog}
            >
              <Edit className="w-5 h-5" />
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
                  value={content}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setIsEditing(false)}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction type="submit">Submit</AlertDialogAction>
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

      {/* Post Content */}
      <div className="space-y-4">
        <p>{post.content || "No description"}</p>
        {/* Image */}
        {post.mediaUrl && (
          <div className="relative rounded-lg overflow-hidden bg-muted">
            <div className="relative aspect-[16/9]">
              <img
                src={post.mediaUrl}
                alt="Post content"
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-4">
          <Button
            variant="ghost"
            size="sm"
            className={`flex gap-2 ${isLiked ? "text-red-500" : ""}`}
            onClick={handleLike}
            disabled={isLikeProcessing || isUpdating}
          >
            <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
            <span>{likes || 0}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex gap-2">
            <MessageCircle className="h-5 w-5" />
            <span>{post.comments?.length || 0}</span>
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date(post.createdAt?.toDate()).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default ProfilePosts;
