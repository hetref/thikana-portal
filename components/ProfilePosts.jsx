import React from "react";
import { Card } from "./ui/card";
import useLikePost from "@/hooks/useLikePosts";
import { HeartIcon, MessageCircle } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

const ProfilePosts = ({ post, userData }) => {
  const { isLiked, likes, handleLikePost, isUpdating } = useLikePost(post);
  return (
    <div key={post.id} className="p-4">
      <div className="flex gap-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src={userData?.profilePic || "/avatar.png"} />
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {userData?.fullname || "User"}
            </span>
            <span className="text-sm text-muted-foreground">
              {new Date(post.createdAt?.toDate()).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-2">{post.description || "No description"}</p>
          <div onDoubleClick={handleLikePost} className="cursor-pointer">
            {post.image && (
              <img
                src={post.image}
                alt="Post image"
                className="mt-2 rounded-lg max-h-96 object-cover"
              />
            )}
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              {/* Like Button */}
              <button
                onClick={handleLikePost}
                disabled={isUpdating}
                className={`flex items-center gap-1 ${
                  isLiked ? "text-red-500" : "text-gray-500"
                }`}
              >
                <HeartIcon
                  className={`w-6 h-6 ${isLiked ? "fill-red-500" : ""}`}
                />
                <span className="text-sm">{likes}</span>
              </button>
              <span className="text-sm text-muted-foreground">Likes</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              <span className="text-sm text-muted-foreground">
                {post.comments.length}
              </span>
              <span className="text-sm text-muted-foreground">Comments</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePosts;
