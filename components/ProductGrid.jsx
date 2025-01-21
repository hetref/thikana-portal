"use client";
import { useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductDialog } from "@/components/ProductDialog";

export function ProductGrid({ products, userId }) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => setSelectedProduct(product)}
          />
        ))}
      </div>
      {selectedProduct && userId && (
        <ProductDialog
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          userId={userId}
        />
      )}
    </>
  );
}
