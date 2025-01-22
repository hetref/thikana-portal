import React, { useEffect, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ensure you have your Firebase setup in firebase.js
import { ProductGrid } from "../ProductGrid";
import { Button } from "../ui/button";
import Link from "next/link";
import { Blocks } from "lucide-react";

const ShowProductsTabContent = ({ userId, userData }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsRef = collection(db, "users", userId, "products");
        const productsQuery = query(productsRef);
        const querySnapshot = await getDocs(productsQuery);
        const productsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Failed to fetch products. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [userId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <Button asChild variant="outline" className="mb-4">
        <Link
          href="/profile/inventory"
          className="w-full flex items-center jsutify-center gap-2"
        >
          Manage Inventory
          <Blocks className="w-6 h-6" />
        </Link>
      </Button>
      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <ProductGrid products={products} userId={userId} userData={userData} />
      )}
    </div>
  );
};

export default ShowProductsTabContent;
