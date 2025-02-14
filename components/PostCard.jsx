import React, { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Bookmark, Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import Image from "next/image";

function PostCard({ post, onLike, onView }) {
  const [hasLiked, setHasLiked] = useState(post?.isLiked || false);
  const [likeCount, setLikeCount] = useState(post?.likes || 0);

  useEffect(() => {
    setHasLiked(post?.isLiked || false);
    setLikeCount(post?.likes || 0);
  }, [post?.isLiked, post?.likes]);

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const newLikedState = !hasLiked;
      setHasLiked(newLikedState);
      setLikeCount((prev) => prev + (newLikedState ? 1 : -1));
      await onLike();
    } catch (error) {
      setHasLiked((prev) => !prev);
      setLikeCount((prev) => prev + (hasLiked ? 1 : -1));
      console.error("Error handling like:", error);
    }
  };

  return (
    <Card className="max-w-md mx-auto" onClick={onView}>
      <CardHeader className="flex flex-row items-center space-x-4 p-4">
        <Avatar>
          <AvatarImage src={author?.profilePic} alt={"yash"} />
          <AvatarFallback>{"yash".charAt(0)}</AvatarFallback>
          <AvatarImage
            src={post?.authorProfileImage || "/default-avatar.png"}
            alt={post?.authorName || "User"}
          />
          <AvatarFallback>{(post?.authorName || "U").charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium leading-none">{"yash"}</p>
          <p className="text-sm text-muted-foreground">@{author?.username}</p>
          <p className="text-sm font-medium leading-none">
            {post?.authorName || "Anonymous"}
          </p>
          <p className="text-sm text-muted-foreground">
            @{post?.authorUsername || "user"}
          </p>
        </div>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-[4/5] w-full">
          <Image
            src={post?.mediaUrl || "/default-post.png"}
            alt={post?.caption || "Post image"}
            fill
            className="object-cover"
            priority={true}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 p-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLike}
              className="flex items-center gap-2"
            >
              <Heart
                className={`h-5 w-5 transition-colors ${
                  hasLiked ? "fill-red-500 stroke-red-500" : ""
                }`}
              />
              <span>{likeCount}</span>
            </Button>
            <Button variant="ghost" size="icon">
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>
          <Button variant="ghost" size="icon">
            <Bookmark className="h-5 w-5" />
          </Button>
        </div>
        <div className="text-sm">
          <span className="font-medium">{post?.authorName || "Anonymous"}</span>{" "}
          {post?.caption}
        </div>
        {post?.comments > 0 && (
          <Button variant="link" className="p-0 h-auto text-muted-foreground">
            View all {post.comments} comments
          </Button>
        )}
        {post?.businessType && (
          <Button variant="link" className="p-0 h-auto text-muted-foreground">
            {post.businessType}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default PostCard;
