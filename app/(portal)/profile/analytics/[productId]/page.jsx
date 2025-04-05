"use client";
import { useParams } from "next/navigation";
import { getProduct } from "@/lib/inventory-operations";
import ProductAnalytics from "@/components/inventory/ProductAnalytics";
import EnhancedProductAnalytics from "@/components/inventory/EnhancedProductAnalytics";
import ProductReviews from "@/components/inventory/ProductReviews";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { auth } from "@/lib/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart, MessageSquare } from "lucide-react";
import Image from "next/image";

export default function ProductAnalyticsPage() {
  const params = useParams();
  const { productId } = params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        toast.error("You must be logged in to view analytics");
        setUserId(null);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!userId) return;

        setLoading(true);
        const fetchedProduct = await getProduct(userId, productId);
        console.log("Fetched product:", fetchedProduct);
        setProduct(fetchedProduct);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Failed to fetch product data");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProduct();
    }
  }, [productId, userId]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <p className="mb-4 text-gray-600">
          The product you're looking for doesn't exist or you don't have
          permission to view it.
        </p>
        <Link href="/profile/analytics">
          <Button>Back to Analytics Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <Link
          href="/profile/analytics"
          className="inline-flex items-center text-primary hover:text-primary/80 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Analytics Dashboard
        </Link>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-1/3 lg:w-1/4">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="aspect-square relative bg-gray-50">
                <Image
                  src={product.imageUrl || "/product-placeholder.png"}
                  alt={product.name}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="p-4">
                <h1 className="text-xl font-bold mb-2">{product.name}</h1>
                <p className="text-gray-700 text-sm mb-2">
                  {product.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">
                    ₹{product.price?.toFixed(2) || "0.00"}
                  </span>
                  <span className="text-sm text-gray-600">
                    {product.quantity} in stock
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <Tabs defaultValue="analytics" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="analytics" className="flex items-center">
                  <BarChart className="mr-2 h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="reviews" className="flex items-center">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Reviews
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics">
                <EnhancedProductAnalytics
                  userId={userId}
                  productId={productId}
                />
              </TabsContent>

              <TabsContent value="reviews">
                <ProductReviews userId={userId} productId={productId} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
