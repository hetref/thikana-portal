"use client";
import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  increment,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Heart,
  MessageCircle,
  MapPin,
  MoreVertical,
  Trash,
} from "lucide-react";
import PostCard from "@/components/PostCard";
import { useRouter, useParams } from "next/navigation";
import Loader from "@/components/Loader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";

export default function PostPage() {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const currentUserId = auth.currentUser?.uid;
  const postId = params?.postId;

  const handleDeleteComment = async (comment) => {
    if (!currentUserId || !postId || currentUserId !== comment.uid) return;

    try {
      // Get current comments array from the user's comments document
      const userCommentsRef = doc(
        db,
        "posts",
        postId,
        "comments",
        currentUserId
      );
      const userCommentsDoc = await getDoc(userCommentsRef);

      if (!userCommentsDoc.exists()) return;

      const currentComments = userCommentsDoc.data().comments || [];

      // Filter out the comment to delete based on comment text and timestamp
      const updatedComments = currentComments.filter(
        (c) =>
          c.comment !== comment.comment ||
          c.timestamp.toDate().toLocaleString() !== comment.timestamp
      );

      // Update the document with filtered comments
      await setDoc(userCommentsRef, {
        comments: updatedComments,
      });

      // Update comment count
      await updateDoc(doc(db, "posts", postId), {
        commentsCount: increment(-1),
      });

      toast.success("Comment deleted successfully");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  useEffect(() => {
    if (!currentUserId) {
      router.push("/login");
      return;
    }

    if (!postId) {
      router.push("/feed");
      return;
    }

    const unsubscribers = [];

    const setupRealtimeListeners = async () => {
      try {
        // Get post data with realtime updates
        const postRef = doc(db, "posts", postId);
        const postUnsubscribe = onSnapshot(postRef, async (postDoc) => {
          if (!postDoc.exists()) {
            console.error("Post not found");
            router.push("/feed");
            return;
          }

          const postData = postDoc.data();

          // Get author data
          const authorDoc = await getDoc(doc(db, "users", postData.uid));
          const authorData = authorDoc.data();

          // Get like status
          const likeDoc = await getDoc(
            doc(db, "users", currentUserId, "likes", postId)
          );

          // Set post data
          setPost({
            ...postData,
            postId: postId,
            authorName: authorData.name,
            authorUsername: authorData.username,
            authorProfileImage: authorData.profilePic,
            isLiked: likeDoc.exists(),
          });
        });

        unsubscribers.push(postUnsubscribe);

        // Set up real-time listener for comments subcollection
        const commentsRef = collection(db, "posts", postId, "comments");
        const commentsUnsubscribe = onSnapshot(
          commentsRef,
          async (snapshot) => {
            try {
              const allComments = [];

              // Get all comment documents
              const commentDocs = snapshot.docs;

              for (const commentDoc of commentDocs) {
                const commentData = commentDoc.data();

                // If this document has a comments array
                if (
                  commentData.comments &&
                  Array.isArray(commentData.comments)
                ) {
                  // Add each comment from the array
                  commentData.comments.forEach((comment) => {
                    if (comment.timestamp) {
                      allComments.push({
                        id: `${commentDoc.id}-${comment.timestamp}`,
                        ...comment,
                        timestamp: comment.timestamp.toDate().toLocaleString(),
                      });
                    }
                  });
                }
              }

              // Sort comments by timestamp, most recent first
              allComments.sort((a, b) => {
                return new Date(b.timestamp) - new Date(a.timestamp);
              });

              setComments(allComments);
            } catch (error) {
              console.error("Error processing comments:", error);
            }
          }
        );

        unsubscribers.push(commentsUnsubscribe);
        setLoading(false);
      } catch (error) {
        console.error("Error setting up realtime listeners:", error);
        setLoading(false);
      }
    };

    setupRealtimeListeners();

    // Cleanup function to unsubscribe from all listeners
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [postId, currentUserId, router]);

  const handleLike = async () => {
    if (!post || !currentUserId) return;

    try {
      const likeRef = doc(db, "users", currentUserId, "likes", post.postId);
      const postRef = doc(db, "posts", post.postId);

      if (post.isLiked) {
        // Unlike
        await updateDoc(postRef, {
          likes: increment(-1),
        });
        await deleteDoc(likeRef);
      } else {
        // Like
        await updateDoc(postRef, {
          likes: increment(1),
        });
        await setDoc(likeRef, {
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error handling like:", error);
      toast.error("Failed to update like");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Post not found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push("/feed")}
      >
        ← Back to Feed
      </Button>

      <div className="space-y-6">
        <PostCard
          post={post}
          onLike={handleLike}
          onView={() => {}}
          showDistance={post.distance !== undefined}
          distanceText={post.distanceText}
        />

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Comments ({comments.length})
          </h2>
          {comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="py-4">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={comment.profilePic || "/default-avatar.png"}
                      alt={comment.name}
                    />
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{comment.name}</p>
                        <p className="text-sm text-muted-foreground">
                          @{comment.username}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {comment.timestamp}
                        </span>
                        {currentUserId === comment.uid && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-red-600 cursor-pointer"
                                onClick={() => handleDeleteComment(comment)}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <p className="mt-2">{comment.comment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
