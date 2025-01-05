"use client"

import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { 
  Heart, 
  MessageCircle, 
  Link2, 
  MapPin, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import Link from 'next/link';

// Example post data with images
const examplePost = {
  author: {
    name: "John Doe",
    image: "/avatar.png"
  },
  content: "Check out these amazing properties!",
  images: [
    "/house1.jpg",
    "/house2.jpg",
    "/house3.jpg",
    // Add more image URLs as needed
  ],
  comments: [],
  likes: 0,
  location: "New York, NY"
};

function PostCard({ post = examplePost }) {
  const [hasLiked, setHasLiked] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState(post.likes || 0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    if (!post.images?.length) return;
    setCurrentImageIndex((prev) => 
      prev === post.images.length - 1 ? 0 : prev + 1
    );
  };

  const previousImage = () => {
    if (!post.images?.length) return;
    setCurrentImageIndex((prev) => 
      prev === 0 ? post.images.length - 1 : prev - 1
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Post Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post?.author?.image} />
            </Avatar>
            <div>
              <p className="font-semibold">{post?.author?.name}</p>
              <p className="text-sm text-muted-foreground">2 hours ago</p>
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="space-y-4">
          <p>{post?.content}</p>
          
          {/* Image Slider */}
          {post?.images?.length > 0 && (
            <div className="relative rounded-lg overflow-hidden bg-muted">
              {/* Image Container with transition */}
              <div className="relative aspect-[16/9]">
                {post.images.map((image, index) => (
                  <div
                    key={index}
                    className={`absolute w-full h-full transition-opacity duration-300 ${
                      index === currentImageIndex ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Post image ${index + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ))}

                {/* Navigation Arrows */}
                {post.images.length > 1 && (
                  <>
                    <button
                      onClick={previousImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors z-10"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors z-10"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                {/* Image Indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {post.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex 
                          ? "bg-white" 
                          : "bg-white/50 hover:bg-white/75"
                      }`}
                    />
                  ))}
                </div>
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
              onClick={() => setHasLiked(!hasLiked)}
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
            <span className="ml-2">{post?.location}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default PostCard; 