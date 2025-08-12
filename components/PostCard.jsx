import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Heart,
  MessageCircle,
  MapPin,
  Send,
  Bookmark,
  MoreVertical,
  Paperclip,
  Smile,
  ThumbsUp,
  Share2,
} from "lucide-react";
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
  limit,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import useLikePost from "@/hooks/useLikePosts";

function PostCard({ post, onView, showDistance, distanceText }) {
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post?.commentsCount || 0);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaveProcessing, setIsSaveProcessing] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const router = useRouter();

  // Normalize post data to ensure compatibility with useLikePost hook
  const normalizedPost = {
    ...post,
    id: post?.postId || post?.id, // Ensure post has 'id' field
    likes: post?.likes || 0,
    isLiked: post?.isLiked || false
  };

  // Use the like hook with normalized post
  const { isLiked, likes, handleLikePost, isUpdating } = useLikePost(normalizedPost);

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

  // Fetch current user's profile data
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (!auth.currentUser?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setCurrentUserProfile(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching current user profile:", error);
      }
    };

    fetchCurrentUserProfile();
  }, []);

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
      setIsPostOwner(
        currentUser.uid === post.uid || currentUser.uid === post.authorId
      );
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

  // Load comments when comment box is shown
  const loadComments = async () => {
    const postId = post?.postId || post?.id;
    if (!postId || loadingComments) return;

    setLoadingComments(true);
    try {
      const commentsRef = collection(db, "posts", postId, "comments");
      const commentsSnapshot = await getDocs(commentsRef);
      
      const allComments = [];
      commentsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.comments && Array.isArray(data.comments)) {
          allComments.push(...data.comments);
        }
      });

      // Sort comments by timestamp (newest first)
      allComments.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return bTime - aTime;
      });

      setComments(allComments);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "now";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (isLikeProcessing) return;

    try {
      setIsLikeProcessing(true);
      await handleLikePost();
      setIsLikeProcessing(false);
    } catch (error) {
      console.error("Error handling like:", error);
      setIsLikeProcessing(false);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    // Get the correct post ID (handle both post.postId and post.id)
    const postId = post?.postId || post?.id;

    if (isSaveProcessing || !auth.currentUser?.uid || !postId) {
      return;
    }

    try {
      setIsSaveProcessing(true);
      const savedPostRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "savedPosts",
        postId
      );

      if (isSaved) {
        await deleteDoc(savedPostRef);
        setIsSaved(false);
        toast.success("Post removed from saved items");
      } else {
        const savedPostData = {
          timestamp: serverTimestamp(),
          postId: postId,
          authorName: post.authorName,
          authorUsername: post.authorUsername,
          authorProfileImage: post.authorProfileImage,
          mediaUrl: post.mediaUrl,
          caption: post.caption || post.content || post.description,
        };
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
    const newShowState = !showCommentBox;
    setShowCommentBox(newShowState);
    
    if (newShowState) {
      loadComments();
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

      const userCommentsRef = doc(
        db,
        "posts",
        post.postId,
        "comments",
        currentUser.uid
      );

      const userCommentsDoc = await getDoc(userCommentsRef);
      const currentComments = userCommentsDoc.exists()
        ? userCommentsDoc.data().comments || []
        : [];

      const updatedComments = [...currentComments, commentData];

      await setDoc(userCommentsRef, {
        comments: updatedComments,
      });

      await updateDoc(doc(db, "posts", post.postId), {
        commentsCount: increment(1),
      });

      // Add the new comment to the local state
      setComments(prev => [commentData, ...prev]);
      setComment("");
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
      router.refresh();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

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
        className="cursor-pointer rounded-3xl border-2 border-gray-200 shadow-md bg-white/80 backdrop-blur-sm"
        onClick={onView}
      >
        <CardContent className="pt-8 pb-6 px-8">
          {/* Post Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-blue-100 transition-all duration-300 hover:ring-blue-300">
                <AvatarImage
                  src={post?.authorProfileImage || "/default-avatar.png"}
                  alt={post?.authorName || "User"}
                    className="transition-transform duration-300 hover:scale-105"
                />
                  <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                  {(post?.authorName || "U").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-white rounded-full animate-pulse"></div>
              </div>
              <div>
                <p className="font-bold text-lg text-gray-800">
                  {post?.authorName || "Anonymous"}
                </p>
                <p className="text-sm text-gray-600 font-medium">
                  Product Designer, slothUI
                </p>
                {isPostOwner && (
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full font-semibold">
                    Your Post
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600 font-medium px-3 py-1 bg-gray-100 rounded-full">
                {post?.createdAt
                  ? new Date(
                      typeof post.createdAt === "object" && post.createdAt.toDate
                        ? post.createdAt.toDate()
                        : post.createdAt
                    ).toLocaleDateString()
                  : ""}
              </div>
              
              {showDistance && distanceText && (
                <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-medium">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{distanceText}</span>
                </div>
              )}

              {isPostOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 border-2 border-gray-200 hover:border-gray-400 transition-colors duration-200 rounded-xl"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={openEditDialog} className="text-base py-3">
                      Edit Post
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={openDeleteDialog}
                      className="text-red-500 focus:text-red-500 text-base py-3"
                    >
                      Delete Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Post Content */}
          <div className="space-y-6">
            <h3 className="font-bold text-xl text-gray-800 leading-relaxed">
              {post?.title || post?.caption || ""}
            </h3>
            {(() => {
              const text =
                post?.content || post?.description || "No description";
              const WORD_LIMIT = 30;
              const words = text.split(/\s+/);
              const isLong = words.length > WORD_LIMIT;
              const excerpt = isLong
                ? words.slice(0, WORD_LIMIT).join(" ") + "..."
                : text;
              const [showFull, setShowFull] = React.useState(false);

              if (!isLong) {
                return <p className="text-base text-gray-700 leading-relaxed">{text}</p>;
              }

              return (
                <p className="text-base text-gray-700 leading-relaxed">
                  {showFull ? text : excerpt}{" "}
                  {!showFull ? (
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800 text-base font-semibold hover:underline transition-colors duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFull(true);
                      }}
                    >
                      Read more...
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800 text-base font-semibold hover:underline transition-colors duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFull(false);
                      }}
                    >
                      Show less
                    </button>
                  )}
                </p>
              );
            })()}
            {/* Image */}
            {post?.mediaUrl && (
              <div className="relative rounded-2xl overflow-hidden bg-muted mx-0 my-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="relative aspect-[4/3]">
                  <img
                    src={post?.mediaUrl}
                    alt="Post content"
                    className="object-cover w-full h-full transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </div>
            )}
          </div>

          {/* Post Stats */}
          <div className="flex items-center justify-between mt-8 text-base">
              <Button
                variant="ghost"
              size="lg"
              className="group hover:bg-red-50 transition-all duration-300 rounded-2xl px-6 py-3"
                onClick={handleLike}
                disabled={isUpdating}
              >
              <div className="flex items-center gap-3">
                <Heart 
                  className={`w-6 h-6 transition-all duration-300 group-hover:scale-110 ${
                    isLiked 
                      ? "fill-current text-red-500" 
                      : "text-gray-600 group-hover:text-red-500"
                  }`} 
                />
                <span className={`font-semibold ${isLiked ? "text-red-500" : "text-gray-700 group-hover:text-red-500"}`}>
                  {likes || 0} Likes
                </span>
                </div>
              </Button>
            
            <Button
              variant="ghost"
              size="lg"
              className="group hover:bg-blue-50 transition-all duration-300 rounded-2xl px-6 py-3"
              onClick={handleCommentClick}
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-gray-600 group-hover:text-blue-500 transition-all duration-300 group-hover:scale-110" />
                <span className="font-semibold text-gray-700 group-hover:text-blue-500">
                  {commentsCount} Comments
                </span>
              </div>
            </Button>
            
            <Button
              variant="ghost"
              size="lg"
              className="group hover:bg-green-50 transition-all duration-300 rounded-2xl px-6 py-3"
            >
              <div className="flex items-center gap-3">
                <Share2 className="w-6 h-6 text-gray-600 group-hover:text-green-500 transition-all duration-300 group-hover:scale-110" />
                <span className="font-semibold text-gray-700 group-hover:text-green-500">
                  187 Share
                </span>
            </div>
            </Button>
            
            <Button
              variant="ghost"
              size="lg"
              className="group hover:bg-yellow-50 transition-all duration-300 rounded-2xl px-6 py-3"
              onClick={handleSave}
              disabled={isSaveProcessing}
            >
              <div className="flex items-center gap-3">
                <Bookmark 
                  className={`w-6 h-6 transition-all duration-300 group-hover:scale-110 ${
                    isSaved 
                      ? "fill-current text-yellow-500" 
                      : "text-gray-600 group-hover:text-yellow-500"
                  }`} 
                />
                <span className={`font-semibold ${isSaved ? "text-yellow-500" : "text-gray-700 group-hover:text-yellow-500"}`}>
                  {isSaved ? "Saved" : "Save"}
                </span>
              </div>
            </Button>
          </div>

          {/* Comment Input */}
          <div className="flex items-center gap-4 mt-8 pt-6 border-t-2 border-gray-100">
            <Avatar className="w-12 h-12 ring-2 ring-gray-200">
              <AvatarImage 
                src={currentUserProfile?.profilePic || currentUserProfile?.profileImage || auth.currentUser?.photoURL || "/default-avatar.png"} 
                alt={currentUserProfile?.name || currentUserProfile?.username || "User"}
              />
              <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white font-semibold">
                {(currentUserProfile?.name || currentUserProfile?.username || "U").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <form onSubmit={handleSubmitComment} className="flex gap-3 flex-1">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your comment..."
                className="flex-1 rounded-2xl px-6 py-4 border-2 border-gray-200 focus:border-blue-400 text-base transition-all duration-300 bg-gray-50 focus:bg-white"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-12 h-12 hover:bg-gray-100 rounded-2xl transition-all duration-300 hover:scale-105" 
                type="button"
              >
                <Paperclip className="w-6 h-6 text-gray-500 hover:text-gray-700" />
                <span className="sr-only">Attach file</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-12 h-12 hover:bg-yellow-100 rounded-2xl transition-all duration-300 hover:scale-105" 
                type="button"
              >
                <Smile className="w-6 h-6 text-gray-500 hover:text-yellow-500" />
                <span className="sr-only">Add emoji</span>
              </Button>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="w-12 h-12 hover:bg-blue-100 rounded-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50"
                disabled={!comment.trim() || isSubmitting}
              >
                <Send className={`w-6 h-6 transition-colors duration-300 ${comment.trim() ? "text-blue-500" : "text-gray-400"}`} />
                <span className="sr-only">Send comment</span>
              </Button>
            </form>
          </div>

          {/* Enhanced Comments Section */}
          {showCommentBox && (
            <div className="mt-6 pt-6 border-t-2 border-gray-100 animate-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col gap-4">
                {/* Scrollable comments list */}
                {comments.length > 0 && (
                  <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4">
                    {comments.map((comment, index) => (
                      <div key={`${comment.uid}-${index}`} className="flex items-start gap-3 py-3 hover:bg-gray-50 rounded-2xl px-3 transition-colors duration-200">
                        <Avatar className="w-10 h-10 ring-2 ring-gray-200">
                          <AvatarImage src={comment.profilePic || "/default-avatar.png"} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white text-sm font-semibold">
                            {(comment.name || comment.username || "U").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid gap-2 text-sm flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-800">{comment.name || comment.username}</span>
                            <span className="text-gray-500 text-xs bg-gray-200 px-2 py-1 rounded-full">
                              {formatTimeAgo(comment.timestamp)}
                            </span>
                          </div>
                          <p className="text-gray-700 leading-relaxed">{comment.comment}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="bg-gray-100 px-2 py-1 rounded-full">0 like</span>
                            <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs hover:bg-blue-100 rounded-full transition-colors duration-200">
                              reply
                            </Button>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-red-100 rounded-2xl transition-all duration-300 hover:scale-110">
                          <Heart className="w-5 h-5 text-gray-400 hover:text-red-500" />
                          <span className="sr-only">Like comment</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {loadingComments && (
                  <div className="text-center text-base text-gray-500 py-8 bg-gray-50 rounded-2xl">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    Loading comments...
                  </div>
                )}

                {!loadingComments && comments.length === 0 && (
                  <div className="text-center text-base text-gray-500 py-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
                    💬 No comments yet. Be the first to comment!
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Edit Post</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-3">
              <Label htmlFor="edit-title" className="text-base font-semibold">Title</Label>
              <Input
                id="edit-title"
                value={editData.title}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter post title"
                className="text-base py-3 px-4 rounded-xl"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-description" className="text-base font-semibold">Description</Label>
              <Textarea
                id="edit-description"
                value={editData.description}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter post description"
                rows={5}
                className="resize-none text-base py-3 px-4 rounded-xl"
              />
            </div>
          </div>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel 
              disabled={isEditing}
              className="px-6 py-3 rounded-xl text-base font-semibold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEditPost} 
              disabled={isEditing}
              className="px-6 py-3 rounded-xl text-base font-semibold bg-blue-500 hover:bg-blue-600"
            >
              {isEditing ? "Saving..." : "Save Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-red-600">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-600 leading-relaxed">
              This action cannot be undone. This will permanently delete your
              post and all its comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel 
              disabled={isDeleting}
              className="px-6 py-3 rounded-xl text-base font-semibold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="px-6 py-3 rounded-xl text-base font-semibold bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete Post"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PostCard;