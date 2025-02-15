import React, { useEffect, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ensure you have your Firebase setup in firebase.js
import { ProductGrid } from "../ProductGrid";
import { Button } from "../ui/button";
import Link from "next/link";
import { Blocks } from "lucide-react";
import { getProducts } from "@/lib/inventory-operations";

const ShowProductsTabContent = ({ userId, userData }) => {
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
      {/* {products.length === 0 ? (
        <p>No products found.</p>
      ) : ( */}
      {/* <ProductGrid products={products} userId={userId} userData={userData} /> */}

      <ProductGrid userId={userId} userData={userData} />
      {/* )} */}
    </div>
  );
};

export default ShowProductsTabContent;
