"use client";
import { useParams } from "next/navigation";
import { getProduct } from "@/lib/inventory-operations";
import ProductAnalytics from "@/components/inventory/ProductAnalytics";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { auth } from "@/lib/firebase"; // Import the auth object from Firebase

export default function ProductAnalyticsPage() {
  const params = useParams();
  const { productId } = params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const userId = auth.currentUser?.uid; // Get the current user ID
        console.log("USER ID::", userId, productId);
        if (!userId) {
          throw new Error("User not authenticated");
        }
        const fetchedProduct = await getProduct(userId, productId);
        console.log("FETCHED PRODUCT", fetchedProduct);
        setProduct(fetchedProduct);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Failed to fetch product data. Using static data.");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Product Analytics: {product.name}
        </h1>
        <Link href="/profile/analytics">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
      <ProductAnalytics
        product={product}
        userId={auth.currentUser?.uid}
        productId={productId}
      />
    </div>
  );
}
