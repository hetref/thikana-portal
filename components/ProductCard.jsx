import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

export function ProductCard({ product, onClick }) {
  const handleDelete = async () => {};

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <Image
          src={product.imageUrl}
          alt={product.title}
          width={200}
          height={200}
          className="w-full object-contain mb-4 rounded"
        />
        <h3 className="font-semibold text-lg mb-2 truncate">{product.title}</h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {product.description}
        </p>
        <p className="font-bold text-lg">₹{product.price.toFixed(2)}</p>
        <button
          onClick={handleDelete}
          className="mt-4 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
        >
          Delete Product
        </button>
      </CardContent>
    </Card>
  );
}
