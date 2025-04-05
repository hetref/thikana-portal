"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function ProductReviews({ userId, productId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);

        // Get ratings from product's ratings collection
        const ratingsRef = collection(db, "products", productId, "ratings");
        const ratingsQuery = query(ratingsRef, orderBy("timestamp", "desc"));
        const ratingsSnapshot = await getDocs(ratingsQuery);

        if (!ratingsSnapshot.empty) {
          const reviewsData = [];

          // Process each rating document
          for (const doc of ratingsSnapshot.docs) {
            const ratingData = { id: doc.id, ...doc.data() };

            // Fetch user data to display with the review
            if (ratingData.userId) {
              try {
                const userDoc = await getDocs(
                  query(
                    collection(db, "users"),
                    where("uid", "==", ratingData.userId)
                  )
                );
                if (!userDoc.empty) {
                  const userData = userDoc.docs[0].data();
                  ratingData.userName = userData.name || "Anonymous User";
                  ratingData.userPhotoURL = userData.photoURL || null;
                }
              } catch (error) {
                console.error("Error fetching user data for review:", error);
                ratingData.userName = "Anonymous User";
              }
            }

            reviewsData.push(ratingData);
          }

          setReviews(reviewsData);
        } else {
          setReviews([]);
        }
      } catch (error) {
        console.error("Error fetching product reviews:", error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchReviews();
    }
  }, [productId]);

  // Render star rating component
  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Customer Reviews</span>
          {reviews.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No reviews yet for this product.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={review.userPhotoURL}
                      alt={review.userName}
                    />
                    <AvatarFallback>
                      {review.userName?.substring(0, 2) || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{review.userName}</h4>
                      <span className="text-xs text-gray-500">
                        {review.timestamp?.toDate().toLocaleDateString() ||
                          "Unknown date"}
                      </span>
                    </div>

                    <div className="mt-1">{renderStars(review.rating)}</div>

                    {review.feedback && (
                      <p className="mt-2 text-sm text-gray-700">
                        {review.feedback}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
