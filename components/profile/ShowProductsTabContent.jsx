"use client";
import { useState, useEffect } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import useBusinessIdForMember from "@/hooks/useBusinessIdForMember";
import { Button } from "../ui/button";
import Link from "next/link";
import { Blocks } from "lucide-react";
import { CartProvider } from "../CartContext";

export default function ShowProductsTabContent({
  userId,
  userData,
  currentUserView = false,
  isViewOnly = false,
}) {
  const {
    targetId,
    isMember,
    loading: idLoading,
  } = useBusinessIdForMember(userId);

  // If still loading the targetId, show loading state
  if (idLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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

      <CartProvider>
        <ProductGrid
          userId={targetId}
          userData={userData}
          userType={currentUserView ? "business" : "customer"}
        />
      </CartProvider>
    </div>
  );
}
