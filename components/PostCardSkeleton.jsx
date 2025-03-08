import React from "react";
import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

function PostCardSkeleton() {
  return (
    <Card className="cursor-pointer">
      <CardContent className="pt-6">
        {/* Post Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Post Content */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />

          {/* Image Skeleton */}
          <Skeleton className="w-full aspect-[16/9] rounded-lg" />
        </div>

        {/* Post Actions */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PostCardSkeleton;
