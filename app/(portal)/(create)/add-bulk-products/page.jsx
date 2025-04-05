"use client";

import React, { useState } from "react";
import { auth, db, storage } from "@/lib/firebase"; // Firebase setup
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BulkProductUpload = () => {
  const [file, setFile] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [images, setImages] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = auth.currentUser;

  // Handle CSV File Selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  // Parse CSV File
  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split("\n").map((row) => row.split(","));

      if (rows.length > 1) {
        const headers = rows[0].map((h) => h.trim());
        const data = rows.slice(1).map((row) => {
          let obj = {};
          row.forEach((val, i) => {
            obj[headers[i]] = val.trim();
          });
          return obj;
        });

        setTableData(data);
      }
    };
    reader.readAsText(file);
  };

  // Upload Image to Firebase Storage
  const uploadImage = async (file, index, productName) => {
    if (!file) throw new Error(`Image is required for product ${index + 1}`);

    // Use the same storage path structure as single product upload
    const filename = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `products/${user.uid}/${filename}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  };

  // Save Products with Image Upload
  const handleSaveProducts = async () => {
    if (!tableData || tableData.length === 0) {
      toast.error("No products to save.");
      return;
    }

    if (!user) {
      toast.error("User not authenticated.");
      return;
    }

    setIsSubmitting(true);

    try {
      const productsRef = collection(db, "users", user.uid, "products");

      // Upload images & store URLs
      const imageUploadPromises = tableData.map(async (product, index) => {
        if (!images[index]) {
          throw new Error(`Image is required for product: ${product.Name}`);
        }
        return uploadImage(images[index], index, product.Name);
      });

      const imageUrls = await Promise.all(imageUploadPromises);

      // Save products to Firestore with the same structure as single product upload
      const productUploadPromises = tableData.map(async (product, index) => {
        return addDoc(productsRef, {
          name: product.Name || "",
          description: product.Description || "",
          price: parseFloat(product.Price) || 0,
          category: product.Category || "",
          quantity: parseInt(product.Quantity) || 0,
          imageUrl: imageUrls[index],
          businessId: user.uid,
          createdAt: new Date(),
          // Add analytics fields with initial values - matching single product upload
          totalSales: 0,
          totalRevenue: 0,
          purchaseCount: 0,
          ratings: {
            average: 0,
            count: 0,
            total: 0,
          },
          monthlySales: {},
          yearlySales: {},
        });
      });

      await Promise.all(productUploadPromises);

      toast.success("Products added successfully!");
      setFile(null);
      setTableData([]);
      setImages({});
    } catch (error) {
      console.error("Error saving products:", error);
      toast.error(error.message || "Failed to save products.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // **View Template Function**
  const handleViewTemplate = () => {
    const csvContent =
      "Name,Description,Price,Category,Quantity\nSample Product,This is a sample description,100,Electronics,10";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="mt-10 max-w-2xl mx-auto p-6 shadow-md border rounded-md">
      <h2 className="text-2xl font-bold text-center mb-6">
        Bulk Product Upload
      </h2>

      <div className="flex justify-normal mb-4">
        <Button
          onClick={handleViewTemplate}
          className="bg-primary text-white py-2 px-4 rounded-md mr-10"
        >
          View Template
        </Button>
        <Input type="file" accept=".csv" onChange={handleFileChange} />
      </div>

      {tableData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-4 py-2">Name</th>
                <th className="border px-4 py-2">Description</th>
                <th className="border px-4 py-2">Price</th>
                <th className="border px-4 py-2">Category</th>
                <th className="border px-4 py-2">Quantity</th>
                <th className="border w-full">Image</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((product, index) => (
                <tr key={index} className="border">
                  <td className="border px-4 py-2">{product.Name}</td>
                  <td className="border px-4 py-2">{product.Description}</td>
                  <td className="border px-4 py-2">{product.Price}</td>
                  <td className="border px-4 py-2">{product.Category}</td>
                  <td className="border px-4 py-2">{product.Quantity}</td>
                  <td className="border px-4 py-2 text-center">
                    <div className="flex flex-col items-center">
                      {/* Show image preview if uploaded */}
                      {images[index] && (
                        <img
                          src={URL.createObjectURL(images[index])}
                          alt={`Uploaded preview for ${product.Name}`}
                          className="w-16 h-16 object-cover rounded mb-2"
                        />
                      )}

                      {/* Image Upload Section */}
                      <span className="text-sm text-gray-600 mb-1">
                        {images[index]
                          ? "✅ Image Uploaded"
                          : "📂 Choose Image"}
                      </span>
                      <label className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded cursor-pointer">
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            setImages((prev) => ({ ...prev, [index]: file }));
                          }}
                        />
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Button
        onClick={handleSaveProducts}
        disabled={isSubmitting}
        className="mt-4 w-full bg-primary text-white py-2 rounded-md"
      >
        {isSubmitting ? "Uploading..." : "Upload Products"}
      </Button>
    </div>
  );
};

export default BulkProductUpload;
