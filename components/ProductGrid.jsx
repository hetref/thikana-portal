"use client";
import { useState, useEffect } from "react";
import { ProductDialog } from "@/components/ProductDialog";
import { getProduct } from "@/lib/inventory-operations";
import { Card, CardContent } from "./ui/card";
import Image from "next/image";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ensure you import the db instance from your firebase configuration

export function ProductGrid({ userId, userData }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProductData, setSelectedProductData] = useState(null);

  useEffect(() => {
    const productsCol = collection(db, `users/${userId}/products`);
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
  }, [userId]);

  useEffect(() => {
    const fetchSelectedProduct = async () => {
      if (selectedProduct) {
        try {
          const productData = await getProduct(userId, selectedProduct);
          setSelectedProductData(productData);
        } catch (error) {
          console.error("Error fetching selected product:", error);
          setError("Failed to fetch selected product. Please try again.");
        }
      }
    };
    fetchSelectedProduct();
  }, [selectedProduct, userId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.map((product) => (
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedProduct(product.id)}
            key={product.id}
          >
            <CardContent className="p-4">
              <Image
                src={product.imageUrl}
                alt={product.title}
                width={200}
                height={200}
                className="w-full object-contain mb-4 rounded"
              />
              <h3 className="font-semibold text-lg mb-2 truncate">
                {product.title}
              </h3>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {product.description}
              </p>
              <p className="font-bold text-lg">₹{product.price.toFixed(2)}</p>
              <p>{product.quantity} available</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {selectedProduct && userId && selectedProductData && (
        <ProductDialog
          product={selectedProductData}
          isOpen={!!selectedProduct}
          onClose={() => {
            setSelectedProduct(null);
            setSelectedProductData(null);
          }}
          userId={userId}
          userData={userData}
        />
      )}
    </>
  );
}
