"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
// import { FileUploader } from "@/components/ui/file-uploader";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const AddProductPage = () => {
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    category: "",
    imageUrl: null,
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (selectedFile) => {
    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user is authenticated
      const user = auth.currentUser;
      if (!user) {
        toast.error("You must be logged in to add a product");
        setLoading(false);
        return;
      }

      let imageUrl = null;
      if (file) {
        // Upload image to Firebase Storage using the same path as bulk upload
        const filename = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `products/${user.uid}/${filename}`);
        await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(storageRef);
      }

      // Create a product document in Firestore
      const productData = {
        name: formState.name,
        description: formState.description,
        price: parseFloat(formState.price) || 0,
        quantity: parseInt(formState.quantity) || 0,
        category: formState.category,
        imageUrl: imageUrl,
        businessId: user.uid,
        createdAt: new Date(),
        // Add analytics fields with initial values
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
      };

      // Add to the user's products collection
      const productsRef = collection(db, `users/${user.uid}/products`);
      const docRef = await addDoc(productsRef, productData);

      toast.success("Product added successfully!");
      // Clear form
      setFormState({
        name: "",
        description: "",
        price: "",
        quantity: "",
        category: "",
        imageUrl: null,
      });
      setFile(null);

      // Redirect to products page
      router.push("/profile/products");
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Failed to add product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Add New Product</CardTitle>
          <CardDescription>
            Fill in the details below to add a new product to your inventory.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                name="name"
                value={formState.name}
                onChange={handleChange}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formState.description}
                onChange={handleChange}
                placeholder="Enter product description"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity in Stock</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  value={formState.quantity}
                  onChange={handleChange}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                value={formState.category}
                onChange={handleChange}
                placeholder="Enter product category"
              />
            </div>

            <div className="space-y-2">
              <Label>Product Image</Label>
              <FileUploader
                onFileSelect={handleFileChange}
                acceptedFileTypes="image/*"
                selectedFile={file}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Adding Product..." : "Add Product"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AddProductPage;
