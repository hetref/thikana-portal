import React, { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Heart, MessageCircle, Link2, MapPin } from "lucide-react";

function EnhancedPostCard({ post, onLike, onView }) {
  const [hasLiked, setHasLiked] = useState(post?.isLiked || false);
  const [optimisticLikes, setOptimisticLikes] = useState(post?.likes || 0);

  useEffect(() => {
    setHasLiked(post?.isLiked || false);
    setOptimisticLikes(post?.likes || 0);
  }, [post?.isLiked, post?.likes]);

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const newLikedState = !hasLiked;
      setHasLiked(newLikedState);
      setOptimisticLikes((prev) => prev + (newLikedState ? 1 : -1));
      await onLike();
    } catch (error) {
      setHasLiked((prev) => !prev);
      setOptimisticLikes((prev) => prev + (hasLiked ? 1 : -1));
      console.error("Error handling like:", error);
    }
  };
  console.log("EnhancedPostCard post:", post);
  return (
    <Card onClick={onView}>
      <CardContent className="pt-6">
        {/* Post Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post?.author?.image || "/default-avatar.png"} />
            </Avatar>
            <div>
              <p className="font-semibold">
                {post?.author?.name || "Anonymous"}
              </p>
              <p className="text-sm text-muted-foreground">2 hours ago</p>
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="space-y-4">
          <p>{post?.content}</p>

          {/* Single Image */}
          {post?.image && (
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <div className="relative aspect-[16/9]">
                <img
                  src={post.image}
                  alt="Post image"
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
              className={`flex gap-2 ${hasLiked ? "text-red-500" : ""}`}
              onClick={handleLike}
            >
              <Heart className={`h-5 w-5 ${hasLiked ? "fill-current" : ""}`} />
              <span>{optimisticLikes}</span>
            </Button>

            <Button variant="ghost" size="sm" className="flex gap-2">
              <MessageCircle className="h-5 w-5" />
              <span>{post?.comments?.length || 0}</span>
            </Button>

            <Button variant="ghost" size="sm" className="flex gap-2">
              <Link2 className="h-5 w-5" />
            </Button>
          </div>

          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <span className="ml-2">{post?.location || "Unknown location"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default EnhancedPostCard;
