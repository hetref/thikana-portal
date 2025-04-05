import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Heart, MessageCircle, MapPin, Send, Bookmark, MoreVertical } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

function PostCard({ post, onLike, onView, showDistance, distanceText }) {
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post?.commentsCount || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaveProcessing, setIsSaveProcessing] = useState(false);
  const router = useRouter();
  
  // Edit and delete states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [editData, setEditData] = useState({
    title: post?.title || post?.caption || "",
    description: post?.content || post?.description || "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPostOwner, setIsPostOwner] = useState(false);

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
    
    // Check if current user is the post owner
    const currentUser = auth.currentUser;
    if (currentUser && post) {
      // Check both uid (from creation) and authorId (might be used in some posts)
      setIsPostOwner(
        currentUser.uid === post.uid || 
        currentUser.uid === post.authorId
      );
      console.log("Post ownership:", {
        currentUserId: currentUser.uid,
        postUid: post.uid,
        postAuthorId: post.authorId,
        isOwner: currentUser.uid === post.uid || currentUser.uid === post.authorId
      });
    }
  }, [post?.postId, post?.uid, post?.authorId]);

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

  // Handle edit post
  const handleEditPost = async (e) => {
    if (e) e.preventDefault();
    
    if (!editData.title.trim() || !editData.description.trim()) {
      toast.error("Title and description cannot be empty.");
      return;
    }

    setIsEditing(true);
    try {
      const postRef = doc(db, "posts", post.postId);
      await updateDoc(postRef, {
        title: editData.title,
        content: editData.description,
        description: editData.description,
        lastUpdated: serverTimestamp(),
      });

      toast.success("Post updated successfully!");
      setShowEditDialog(false);
      
      // Update the local post state
      post.title = editData.title;
      post.content = editData.description;
      post.description = editData.description;
      
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Failed to update post. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  // Handle delete post
  const handleDeletePost = async () => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "posts", post.postId));
      toast.success("Post deleted successfully!");
      setShowDeleteAlert(false);
      // Redirect to home or refresh the page
      router.refresh();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    setEditData({
      title: post.title || post.caption || "",
      description: post.content || post.description || "",
    });
    setShowEditDialog(true);
  };

  // Open delete dialog
  const openDeleteDialog = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    setShowDeleteAlert(true);
  };

  return (
    <>
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
                {isPostOwner && (
                  <span className="text-xs text-blue-500">You are the author</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {showDistance && distanceText && (
                <div className="flex items-center text-sm text-blue-600">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{distanceText}</span>
                </div>
              )}
              
              {isPostOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="icon" className="h-8 w-8 border border-gray-200">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={openEditDialog}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={openDeleteDialog}
                      className="text-red-500 focus:text-red-500">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Post Content */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{post?.title || post?.caption || ""}</h3>
            <p>{post?.content || post?.description || "No description"}</p>
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
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center gap-1 ${
                  post?.isLiked ? "text-red-500" : ""
                }`}
                onClick={handleLike}
                disabled={isLikeProcessing}
              >
                <Heart
                  className={`h-5 w-5 ${post?.isLiked ? "fill-current" : ""}`}
                />
                <span>{post?.likes}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
                onClick={handleCommentClick}
              >
                <MessageCircle className="h-5 w-5" />
                <span>{commentsCount}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center gap-1 ${isSaved ? "text-yellow-500" : ""}`}
                onClick={handleSave}
                disabled={isSaveProcessing}
              >
                <Bookmark
                  className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`}
                />
                <span>Save</span>
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {post?.createdAt
                ? new Date(
                    typeof post.createdAt === "object" && post.createdAt.toDate
                      ? post.createdAt.toDate()
                      : post.createdAt
                  ).toLocaleDateString()
                : ""}
            </div>
          </div>

          {/* Comment box */}
          {showCommentBox && (
            <div className="mt-4 pt-4 border-t">
              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  disabled={!comment.trim() || isSubmitting}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Post</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editData.title}
                onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter post title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter post description"
                rows={5}
                className="resize-none"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEditing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditPost}
              disabled={isEditing}
            >
              {isEditing ? "Saving..." : "Save Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PostCard;
