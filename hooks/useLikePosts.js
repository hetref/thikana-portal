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
  const [likes, setLikes] = useState(post.likes); // Assuming likes is a number in the post document
  const [isLiked, setIsLiked] = useState(false);

  // Get the current user from Firebase Auth
  const auth = getAuth();
  const authUser = auth.currentUser;

  // Initialize isLiked state based on the post's likes and current user
  useEffect(() => {
    if (authUser) {
      // Check if the user has already liked this post in their postlikes sub-collection
      const userPostLikesRef = doc(
        db,
        "users",
        authUser.uid,
        "postlikes",
        post.id
      );
      getDoc(userPostLikesRef).then((docSnapshot) => {
        if (docSnapshot.exists()) {
          setIsLiked(docSnapshot.data().liked); // Get the 'liked' field in the document
        }
      });
    }
  }, [post.likes, authUser]);

  const handleLikePost = async () => {
    if (isUpdating) return;

    if (!authUser) {
      console.error("You must be logged in to like a post.");
      return;
    }

    setIsUpdating(true);

    try {
      const postRef = doc(db, "posts", post.id);

      // Add or remove the like from the post's like count (likes is a number)
      await updateDoc(postRef, {
        likes: isLiked ? increment(-1) : increment(1), // Increment or decrement the like count
      });

      // Update or remove the user's postlikes sub-collection
      const userPostLikesRef = doc(
        db,
        "users",
        authUser.uid,
        "postlikes",
        post.id
      );
      if (isLiked) {
        // If the post was previously liked, we remove the like from the user's postlikes
        await deleteDoc(userPostLikesRef); // Delete the document
      } else {
        // If the post was not liked, we add it to the user's postlikes sub-collection
        await setDoc(userPostLikesRef, {
          liked: true,
          postId: post.id,
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
