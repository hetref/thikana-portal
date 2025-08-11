import { useState, useEffect } from "react";
import {
  arrayRemove,
  arrayUnion,
  doc,
  updateDoc,
  increment,
  getDoc,
  setDoc,
  deleteDoc, // Import deleteDoc
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";

const useLikePost = (post) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [likes, setLikes] = useState(post?.likes || 0); // Add null check
  const [isLiked, setIsLiked] = useState(false);

  // Get the current user from Firebase Auth
  const auth = getAuth();
  const authUser = auth.currentUser;

  // Get the correct post ID (handle both post.id and post.postId)
  const postId = post?.id || post?.postId;

  // Initialize isLiked state based on the post's likes and current user
  useEffect(() => {
    if (authUser && postId) {
      // Check if the user has already liked this post in their postlikes sub-collection
      const userPostLikesRef = doc(
        db,
        "users",
        authUser.uid,
        "postlikes",
        postId
      );
      getDoc(userPostLikesRef).then((docSnapshot) => {
        if (docSnapshot.exists()) {
          setIsLiked(docSnapshot.data().liked); // Get the 'liked' field in the document
        }
      }).catch(error => {
        console.error("Error checking like status:", error);
      });
    }
  }, [postId, authUser]);
  //comment
  const handleLikePost = async () => {
    if (isUpdating) return;

    if (!authUser) {
      console.error("You must be logged in to like a post.");
      return;
    }

    if (!postId) {
      console.error("Post ID is missing:", post);
      return;
    }

    setIsUpdating(true);

    try {
      const postRef = doc(db, "posts", postId);

      // Check if the post has the new 'likes' field or the old 'interactions.likeCount' field
      const postDoc = await getDoc(postRef);
      if (!postDoc.exists()) {
        throw new Error("Post not found");
      }

      const postData = postDoc.data();
      const hasNewLikesField = 'likes' in postData;
      const hasOldLikeCountField = postData.interactions?.likeCount !== undefined;

      // Update the appropriate field based on what exists
      if (hasNewLikesField) {
        // Use the new 'likes' field
        await updateDoc(postRef, {
          likes: isLiked ? increment(-1) : increment(1),
        });
      } else if (hasOldLikeCountField) {
        // Use the old 'interactions.likeCount' field
        await updateDoc(postRef, {
          "interactions.likeCount": isLiked ? increment(-1) : increment(1),
        });
      } else {
        // Create the new 'likes' field if neither exists
        await updateDoc(postRef, {
          likes: isLiked ? 0 : 1,
        });
      }

      // Update or remove the user's postlikes sub-collection
      const userPostLikesRef = doc(
        db,
        "users",
        authUser.uid,
        "postlikes",
        postId
      );
      if (isLiked) {
        // If the post was previously liked, we remove the like from the user's postlikes
        await deleteDoc(userPostLikesRef); // Delete the document
      } else {
        // If the post was not liked, we add it to the user's postlikes sub-collection
        await setDoc(userPostLikesRef, {
          liked: true,
          postId: postId,
        });
      }

      // Update local state
      setIsLiked(!isLiked);
      isLiked ? setLikes(likes - 1) : setLikes(likes + 1);
    } catch (error) {
      console.error("Error liking/unliking post:", error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return { isLiked, likes, handleLikePost, isUpdating };
};

export default useLikePost;
