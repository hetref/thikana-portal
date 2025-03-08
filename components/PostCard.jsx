import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Heart, MessageCircle, MapPin } from "lucide-react";

function PostCard({ post, onLike, onView, showDistance, distanceText }) {
  // Track if we're currently processing a like operation
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);

  // Ref to track the actual liked state from props
  const isLikedRef = useRef(post?.isLiked);
  const likesCountRef = useRef(post?.likes);

  // Update the ref when props change
  useEffect(() => {
    isLikedRef.current = post?.isLiked;
    likesCountRef.current = post?.likes;
  }, [post?.isLiked, post?.likes]);

  const handleLike = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    // If we're already processing a like operation, don't start another one
    if (isLikeProcessing) {
      return;
    }

    try {
      setIsLikeProcessing(true);

      // Call the parent's onLike function
      await onLike();

      // Processing is complete
      setIsLikeProcessing(false);
    } catch (error) {
      console.error("Error handling like:", error);
      setIsLikeProcessing(false);
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

            <Button variant="ghost" size="sm" className="flex gap-2">
              <MessageCircle className="h-5 w-5" />
              <span>{post?.comments?.length || 0}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PostCard;
