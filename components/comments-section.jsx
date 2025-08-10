"use client";

import { Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CommentsSection({ 
  comments = [], 
  comment = "", 
  setComment, 
  onSubmitComment, 
  isSubmitting = false 
}) {
  return (
    <div className="flex flex-col h-80 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Comments list with dedicated scroller */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800">
        <div className="p-4 space-y-3">
          {comments.length > 0 ? (
            comments.map((comment, index) => (
              <div key={comment.id || index} className="flex items-start gap-3 py-2">
                <div className="grid gap-1 text-sm flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {comment.author || comment.username || comment.name}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {comment.timeAgo || (comment.timestamp ? 
                        new Date(comment.timestamp.toDate ? comment.timestamp.toDate() : comment.timestamp).toLocaleDateString() : '')}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{comment.text || comment.comment}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{comment.likes || 0} likes</span>
                    {comment.replies > 0 && <span>{comment.replies} replies</span>}
                    <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs hover:bg-gray-200 dark:hover:bg-gray-700">
                      Reply
                    </Button>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-gray-200 dark:hover:bg-gray-700">
                  <Heart className="w-5 h-5" />
                  <span className="sr-only">Like comment</span>
                </Button>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
              <p>No comments yet. Be the first to comment!</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Comment input form - fixed at bottom */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <form onSubmit={onSubmitComment} className="flex items-center gap-3">
          <Input 
            placeholder="Add a comment..." 
            className="flex-1 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button
            type="submit"
            variant="ghost"
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500 font-semibold px-4"
            disabled={!comment.trim() || isSubmitting}
          >
            {isSubmitting ? "Posting..." : "Post"}
          </Button>
        </form>
      </div>
    </div>
  );
}
