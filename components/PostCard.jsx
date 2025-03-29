import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Heart, MessageCircle, MapPin, Send, Bookmark } from "lucide-react";
import { Input } from "./ui/input";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  updateDoc,
  increment,
  getDoc,
  serverTimestamp,
  arrayUnion,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";

function PostCard({ post, onLike, onView, showDistance, distanceText }) {
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post?.commentsCount || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaveProcessing, setIsSaveProcessing] = useState(false);
  const router = useRouter();

  const isLikedRef = useRef(post?.isLiked);
  const likesCountRef = useRef(post?.likes);

  useEffect(() => {
    isLikedRef.current = post?.isLiked;
    likesCountRef.current = post?.likes;
  }, [post?.isLiked, post?.likes]);

  // Check if post is saved when component mounts
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!auth.currentUser?.uid || !post?.postId) return;

      try {
        const savedPostRef = doc(
          db,
          "users",
          auth.currentUser.uid,
          "savedPosts",
          post.postId
        );
        const savedPostDoc = await getDoc(savedPostRef);
        setIsSaved(savedPostDoc.exists());
      } catch (error) {
        console.error("Error checking saved status:", error);
      }
    };

    checkIfSaved();
  }, [post?.postId]);

  // Set up realtime listener for comment count
  useEffect(() => {
    if (!post?.postId) return;

    const postRef = doc(db, "posts", post.postId);
    const unsubscribe = onSnapshot(postRef, (doc) => {
      if (doc.exists()) {
        setCommentsCount(doc.data().commentsCount || 0);
      }
    });

    return () => unsubscribe();
  }, [post?.postId]);

  const handleLike = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (isLikeProcessing) return;

    try {
      setIsLikeProcessing(true);
      await onLike();
      setIsLikeProcessing(false);
    } catch (error) {
      console.error("Error handling like:", error);
      setIsLikeProcessing(false);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (isSaveProcessing || !auth.currentUser?.uid || !post?.postId) {
      console.log("Save conditions not met:", {
        isSaveProcessing,
        userId: auth.currentUser?.uid,
        postId: post?.postId,
      });
      return;
    }

    try {
      setIsSaveProcessing(true);
      const savedPostRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "savedPosts",
        post.postId
      );

      if (isSaved) {
        // Remove from saved posts
        console.log("Removing post from saved:", post.postId);
        await deleteDoc(savedPostRef);
        setIsSaved(false);
        toast.success("Post removed from saved items");
      } else {
        // Add to saved posts
        console.log("Adding post to saved:", post.postId);
        const savedPostData = {
          timestamp: serverTimestamp(),
          postId: post.postId,
          authorName: post.authorName,
          authorUsername: post.authorUsername,
          authorProfileImage: post.authorProfileImage,
          mediaUrl: post.mediaUrl,
          caption: post.caption || post.content || post.description,
        };
        console.log("Saving post data:", savedPostData);
        await setDoc(savedPostRef, savedPostData);
        setIsSaved(true);
        toast.success("Post saved successfully");
      }
    } catch (error) {
      console.error("Error handling save:", error);
      toast.error("Failed to update save status");
    } finally {
      setIsSaveProcessing(false);
    }
  };

  const handleCommentClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowCommentBox(!showCommentBox);
  };

  const handleViewComments = (e) => {
    e.stopPropagation();
    e.preventDefault();
    router.push(`/feed/${post.postId}`);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim() || isSubmitting) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("No user logged in");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user data
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userData = userDoc.data();

      const now = new Date();
      const commentData = {
        comment: comment.trim(),
        timestamp: now,
        username: userData.username,
        name: userData.name,
        profilePic: userData.profilePic,
        uid: currentUser.uid,
      };

      // Reference to the user's comments document in the post
      const userCommentsRef = doc(
        db,
        "posts",
        post.postId,
        "comments",
        currentUser.uid
      );

      // Get current comments array or initialize it
      const userCommentsDoc = await getDoc(userCommentsRef);
      const currentComments = userCommentsDoc.exists()
        ? userCommentsDoc.data().comments || []
        : [];

      // Add new comment to array
      const updatedComments = [...currentComments, commentData];

      // Update the document with filtered comments
      await setDoc(userCommentsRef, {
        comments: updatedComments,
      });

      // Update comment count
      await updateDoc(doc(db, "posts", post.postId), {
        commentsCount: increment(1),
      });

      setComment("");
      setShowCommentBox(false);
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onView}
    >
      <CardContent className="pt-6">
        {/* Post Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={post?.authorProfileImage || "/default-avatar.png"}
                alt={post?.authorName || "User"}
              />
            </Avatar>
            <div>
              <p className="font-semibold">{post?.authorName || "Anonymous"}</p>
              <p className="text-sm text-muted-foreground">
                @{post?.authorUsername || "user"}
              </p>
            </div>
          </div>

          {showDistance && distanceText && (
            <div className="flex items-center text-sm text-blue-600">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{distanceText}</span>
            </div>
          )}
        </div>

        {/* Post Content */}
        <div className="space-y-4">
          <p>{post?.caption || post?.content || post?.description}</p>

          {/* Image */}
          {post?.mediaUrl && (
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <div className="relative aspect-[16/9]">
                <img
                  src={post?.mediaUrl}
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
              className={`flex gap-2 ${post?.isLiked ? "text-red-500" : ""}`}
              onClick={handleLike}
              disabled={isLikeProcessing}
            >
              <Heart
                className={`h-5 w-5 ${post?.isLiked ? "fill-current" : ""}`}
              />
              <span>{post?.likes || 0}</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCommentClick}
                className="p-2"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewComments}
                className="p-2"
              >
                <span>{commentsCount}</span>
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={isSaveProcessing}
            className={`p-2 ${isSaved ? "text-blue-500" : ""}`}
          >
            <Bookmark className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
          </Button>
        </div>

        {/* Comment Box */}
        {showCommentBox && (
          <div className="mt-4" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <Input
                placeholder="Write a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isSubmitting || !comment.trim()}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PostCard;
