import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Heart, MessageCircle, MapPin, Share2, Bookmark, MoreVertical } from "lucide-react";
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
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { CommentsSection } from "./comments-section";

function PostCard({ post, onLike, onView, showDistance, distanceText }) {
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post?.commentsCount || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaveProcessing, setIsSaveProcessing] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const router = useRouter();
  
  // Function to truncate text to 50 words
  const truncateText = (text, maxWords = 50) => {
    if (!text) return "";
    
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    
    const truncatedWords = words.slice(0, maxWords);
    return truncatedWords.join(' ') + '...';
  };
  
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

  // Fetch comments for this post
  const fetchComments = async () => {
    if (!post?.postId || loadingComments) return;

    try {
      setLoadingComments(true);
      const commentsRef = collection(db, "posts", post.postId, "comments");
      const commentsSnapshot = await getDocs(commentsRef);
      
      const allComments = [];
      commentsSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.comments && Array.isArray(userData.comments)) {
          allComments.push(...userData.comments);
        }
      });

      // Sort comments by timestamp (newest first)
      allComments.sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return timeB - timeA;
      });

      setComments(allComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowCommentBox(!showCommentBox);
    
    // Fetch comments when opening comment section
    if (!showCommentBox && comments.length === 0) {
      fetchComments();
    }
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
      toast.success("Comment added successfully");
      
      // Refresh comments after adding new one
      fetchComments();
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
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden max-w-[1000px] w-full flex flex-col md:flex-row mb-6">
        {/* Left side - Image */}
        <div className="relative w-full md:w-[80%] aspect-[4/3] md:aspect-auto md:h-[600px] overflow-hidden rounded-tl-3xl rounded-bl-3xl rounded-br-3xl">
          {post?.mediaUrl ? (
            <>
              {/* Blurred cover background to avoid empty bars when using contain */}
              <div
                className="absolute inset-0 bg-center bg-cover blur-xl scale-110 opacity-60"
                style={{ backgroundImage: `url(${post.mediaUrl})` }}
                aria-hidden
              />
              {/* Actual image shown fully */}
              <Image
                src={post.mediaUrl}
                alt="Post content"
                fill
                className="object-contain cursor-pointer rounded-tl-3xl rounded-bl-3xl rounded-br-3xl"
                onClick={onView}
                sizes="(max-width: 768px) 100vw, 800px"
                priority={false}
              />
            </>
          ) : (
            <div 
              className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center cursor-pointer rounded-tl-3xl rounded-bl-3xl rounded-br-3xl"
              onClick={onView}
            >
              <span className="text-gray-500 dark:text-gray-400">No image</span>
            </div>
          )}
        </div>

        {/* Right side - Content */}
        <div className="w-full md:w-1/2 p-6 flex flex-col">
          {/* Header with avatar and user info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={post?.authorProfileImage || "/placeholder.svg?height=40&width=40"} />
                <AvatarFallback>
                  {post?.authorName?.charAt(0) || post?.authorUsername?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="font-semibold text-lg">{post?.authorName || "Anonymous"}</span>
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

          {/* Post content */}
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-2">{post?.title || post?.caption || ""}</h3>
            <div className="text-gray-700 dark:text-gray-300 mb-2">
              <p className="whitespace-pre-line">
                {showFullDescription 
                  ? (post?.content || post?.description || "No description")
                  : truncateText(post?.content || post?.description || "No description")
                }
              </p>
              {/* Show "read more" button if text is truncated */}
              {(post?.content || post?.description) && 
               (post?.content || post?.description).trim().split(/\s+/).length > 50 && (
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500 mt-2"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                >
                  {showFullDescription ? "Show less" : "Read more"}
                </Button>
              )}
            </div>
            {/* You can add hashtags here if needed */}
            <div className="text-blue-500 dark:text-blue-400 text-sm mb-4">
              {/* Add hashtags from post data if available */}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={handleLike}
                disabled={isLikeProcessing}
              >
                <Heart 
                  className={`w-6 h-6 ${post?.isLiked ? "fill-red-500 text-red-500" : "hover:text-red-500"}`} 
                />
                <span className="sr-only">Like</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={handleCommentClick}
              >
                <MessageCircle className="w-6 h-6 hover:text-blue-500" />
                <span className="sr-only">Comment</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Share2 className="w-6 h-6 hover:text-green-500" />
                <span className="sr-only">Share</span>
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={handleSave}
              disabled={isSaveProcessing}
            >
              <Bookmark 
                className={`w-6 h-6 ${isSaved ? "fill-yellow-500 text-yellow-500" : "hover:text-yellow-500"}`} 
              />
              <span className="sr-only">Save</span>
            </Button>
          </div>

          {/* Likes count */}
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {post?.likes > 0 && (
              <>
                Liked by <span className="font-semibold">{post.likes}</span> {post.likes === 1 ? 'person' : 'people'}
              </>
            )}
          </div>

          {/* View comments button */}
          {commentsCount > 0 && (
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm text-gray-500 dark:text-gray-400 justify-start mb-4"
              onClick={handleCommentClick}
            >
              View all {commentsCount} comments
            </Button>
          )}

          {/* Post timestamp */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {post?.createdAt
              ? new Date(
                  typeof post.createdAt === "object" && post.createdAt.toDate
                    ? post.createdAt.toDate()
                    : post.createdAt
                ).toLocaleDateString()
              : ""}
          </div>

          {/* Comments section */}
          {showCommentBox && (
            <CommentsSection
              comments={comments}
              comment={comment}
              setComment={setComment}
              onSubmitComment={handleSubmitComment}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>

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
