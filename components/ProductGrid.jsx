"use client";
import { useState, useEffect } from "react";
import ProductDialog from "@/components/product/ProductDialog";
import { getProduct } from "@/lib/inventory-operations";
import { Card, CardContent } from "./ui/card";
import Image from "next/image";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShoppingBag, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import useBusinessIdForMember from "@/hooks/useBusinessIdForMember";
import Loader from "@/components/Loader"
export function ProductGrid({ userId, userData, userType = "customer" }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProductData, setSelectedProductData] = useState(null);

  // Use our custom hook to get the appropriate ID for fetching data
  const {
    targetId,
    isMember,
    loading: idLoading,
  } = useBusinessIdForMember(userId);

  useEffect(() => {
    if (idLoading) return; // Wait until we know if the user is a member

    const productsCol = collection(db, `users/${targetId}/products`);
    const unsubscribe = onSnapshot(
      productsCol,
      (productSnapshot) => {
        if (!productSnapshot.empty) {
          const productsData = productSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setProducts(productsData);
        } else {
          setProducts([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching products:", error);
        setError("Failed to fetch products. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetId, idLoading]);

  useEffect(() => {
    const fetchSelectedProduct = async () => {
      if (selectedProduct) {
        try {
          // Use targetId instead of userId to get the correct product
          const productData = await getProduct(targetId, selectedProduct);
          setSelectedProductData(productData);
        } catch (error) {
          console.error("Error fetching selected product:", error);
          setError("Failed to fetch selected product. Please try again.");
        }
      }
    };

    if (!idLoading && selectedProduct) {
      fetchSelectedProduct();
    }
  }, [selectedProduct, targetId, idLoading]);

  if (idLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader />
        <p className="text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="w-12 h-12 text-destructive/70 mb-4" />
        <p className="text-destructive font-medium mb-1">
          Something went wrong
        </p>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          No products added yet
        </h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {isMember
            ? "The business hasn't added any products to their inventory."
            : "This business hasn't added any products to their inventory."}
        </p>
      </div>
    );
  }

  return (
    <>
      {isMember && (
        <div className="mb-4 p-2 bg-violet-50 text-violet-700 rounded-md text-sm">
          Showing products from your business
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        {products.map((product) => (
          <Card
            className="overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-100"
            onClick={() => setSelectedProduct(product.id)}
            key={product.id}
          >
            <div className="aspect-square relative bg-gray-50 overflow-hidden">
              <Image
                src={product.imageUrl || "/product-placeholder.png"}
                alt={product.title}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
              {product.quantity === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Badge
                    variant="destructive"
                    className="text-sm px-3 py-1.5 font-medium uppercase"
                  >
                    Out of Stock
                  </Badge>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-1 truncate">
                {product.title}
              </h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {product.description}
              </p>
              <div className="flex items-center justify-between">
                <p className="font-bold text-lg text-primary">
                  ₹{product.price?.toFixed(2) || "0.00"}
                </p>
                {userType === "business" ? (
                  <Badge
                    variant={
                      product.quantity > 5
                        ? "outline"
                        : product.quantity > 0
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    {product.quantity > 0
                      ? `${product.quantity} in stock`
                      : "Out of stock"}
                  </Badge>
                ) : (
                  <Badge
                    variant={product.quantity > 0 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {product.quantity > 0
                      ? product.quantity <= 5
                        ? "2-3 available"
                        : "In stock"
                      : "Out of stock"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {selectedProduct && targetId && selectedProductData && (
        <ProductDialog
          product={selectedProductData}
          isOpen={!!selectedProduct}
          onClose={() => {
            setSelectedProduct(null);
            setSelectedProductData(null);
          }}
          userId={targetId}
          userData={userData}
          userType={userType}
        />
      )}
    </>
  );
}
