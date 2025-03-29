import React, { useEffect, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ensure you have your Firebase setup in firebase.js
import { ProductGrid } from "../ProductGrid";
import { Button } from "../ui/button";
import Link from "next/link";
import { Blocks } from "lucide-react";
import { getProducts } from "@/lib/inventory-operations";

const ShowProductsTabContent = ({
  userId,
  userData,
  currentUserView = false,
  isViewOnly = false,
}) => {
  return (
    <div>
      {/* Only show the Manage Inventory button if this is the current user's view and not view-only mode */}
      {currentUserView && !isViewOnly && (
        <Button
          asChild
          variant="outline"
          className="mb-6 shadow-sm hover:shadow-md transition-all"
        >
          <Link
            href="/profile/inventory"
            className="w-full flex items-center justify-center gap-2"
          >
            <Blocks className="w-5 h-5 mr-1" />
            Manage Inventory
          </Link>
        </Button>
      )}

      <ProductGrid userId={userId} userData={userData} />
    </div>
  );
};

export default ShowProductsTabContent;
