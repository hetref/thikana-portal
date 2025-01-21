import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Bookmark, Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import Image from "next/image";

function PostCard({ post, author }) {
  const [hasLiked, setHasLiked] = useState(post.isLiked);
  const [optimisticLikes, setOptimisticLikes] = useState(post.likes || 0);

  const toggleLike = async () => {
    try {
      const likeDocRef = doc(
        db,
        "users",
        auth.currentUser?.uid,
        "likes",
        post.postId
      );

      if (hasLiked) {
        // Remove like
        await deleteDoc(likeDocRef);
        setOptimisticLikes((prev) => prev - 1);
      } else {
        // Add like
        await setDoc(likeDocRef, { likedAt: new Date() });
        setOptimisticLikes((prev) => prev + 1);
      }

      setHasLiked((prev) => !prev);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center space-x-4 p-4">
        <Avatar>
          <AvatarImage src={author.profilePic} alt={author.name} />
          <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium leading-none">{author.name}</p>
          <p className="text-sm text-muted-foreground">@{author.username}</p>
        </div>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-[4/5] w-full">
          <Image
            src={post.image || "/placeholder.svg"}
            alt={post.caption}
            fill
            className="object-cover"
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 p-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex space-x-4">
            <Button variant="ghost" size="icon" onClick={toggleLike}>
              <Heart className="h-5 w-5" /> {optimisticLikes}
            </Button>
            <Button variant="ghost" size="icon">
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>
          <Button variant="ghost" size="icon">
            <Bookmark className="h-5 w-5" />
          </Button>
        </div>
        <div className="text-sm font-medium">{post.likes} likes</div>
        <div className="text-sm">
          <span className="font-medium">{author.username}</span> {post.caption}
        </div>
        <Button variant="link" className="p-0 h-auto text-muted-foreground">
          View all {post.comments} comments
        </Button>
      </CardFooter>
    </Card>
  );
}

export default PostCard;
