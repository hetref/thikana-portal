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
import ImageUpload from "@/components/ImageUpload";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, updateDoc, setDoc, doc } from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Package, Sparkles, Upload, FileImage, IndianRupee, Hash } from "lucide-react";

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
  const [authChecking, setAuthChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAuthChecking(false);
      if (!user) {
        console.log("User not authenticated, redirecting to login");
        router.push("/login");
      } else {
        console.log("User authenticated:", user.uid);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (selectedFile) => {
    console.log("File selected:", selectedFile);
    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted with data:", formState);
    
    // Basic validation
    if (!formState.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    
    if (!formState.price || parseFloat(formState.price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    
    if (!formState.quantity || parseInt(formState.quantity) < 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    
    setLoading(true);

    try {
      // Check if user is authenticated
      const user = auth.currentUser;
      if (!user) {
        console.log("No authenticated user found");
        toast.error("You must be logged in to add a product");
        setLoading(false);
        return;
      }
      console.log("User authenticated:", user.uid);

      let imageUrl = null;
      if (file) {
        console.log("Uploading image:", file.name);
        // Upload image to Firebase Storage using the same path as bulk upload
        const filename = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `products/${user.uid}/${filename}`);
        await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(storageRef);
        console.log("Image uploaded successfully:", imageUrl);
      } else {
        console.log("No image file selected");
      }

      // Create a product document in Firestore
      const productData = {
        name: formState.name,
        description: formState.description,
        price: parseFloat(formState.price) || 0,
        quantity: parseInt(formState.quantity) || 0,
        category: formState.category,
        imageUrl: imageUrl,
        userId: user.uid,
        createdAt: new Date(),
        // Analytics fields with initial values
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

      // Add to the root products collection
      const productsRootRef = collection(db, "products");
      const docRef = await addDoc(productsRootRef, productData);
      await updateDoc(docRef, { id: docRef.id });

      // Add to the user's products subcollection with the same ID
      const userProductsRef = collection(db, "users", user.uid, "products");
      await setDoc(doc(userProductsRef, docRef.id), { ...productData, id: docRef.id });

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

      // Redirect to inventory page
      router.push("/profile/inventory");
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Failed to add product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-200 rounded-full animate-spin mx-auto"></div>
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Add Product</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Add new products to your inventory with detailed information and images
          </p>
        </div>

        {/* Main Form */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* Form Fields Section - Left */}
          <div className="xl:col-span-3">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Product Details</h2>
                <p className="text-gray-600">Fill in the information about your product</p>
              </div>

              <div className="space-y-6">
                {/* Product Name */}
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-500" />
                    Product Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formState.name}
                    onChange={handleChange}
                    placeholder="Enter product name..."
                    required
                    className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl"
                  />
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formState.description}
                    onChange={handleChange}
                    placeholder="Describe your product in detail..."
                    rows={4}
                    className="resize-none border-gray-200 focus:border-orange-500 focus:ring-orange-500 text-base rounded-xl"
                  />
                </div>

                {/* Price and Quantity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="price" className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-green-500" />
                      Price (₹)
                    </Label>
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
                      className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="quantity" className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                      <Hash className="w-4 h-4 text-blue-500" />
                      Quantity in Stock
                    </Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="0"
                      value={formState.quantity}
                      onChange={handleChange}
                      placeholder="0"
                      required
                      className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-3">
                  <Label htmlFor="category" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Category
                  </Label>
                  <Input
                    id="category"
                    name="category"
                    value={formState.category}
                    onChange={handleChange}
                    placeholder="e.g., Electronics, Clothing, Home & Garden..."
                    className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleSubmit}
                    className="w-full h-14 text-base font-semibold bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 hover:from-orange-600 hover:via-red-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Adding Product...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Add Product
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Image Section - Right */}
          <div className="xl:col-span-2">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                    <FileImage className="w-4 h-4 text-white" />
                  </div>
                  Product Image
                </h2>
                <p className="text-gray-600">Upload a high-quality image of your product</p>
              </div>

              <div className="sticky top-8">
                {/* Image Upload Area */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <ImageUpload
                    label=""
                    onImageChange={handleFileChange}
                    currentImage={file ? URL.createObjectURL(file) : null}
                    isSubmitting={loading}
                  />
                </div>

                {/* Large Image Preview */}
                {file && (
                  <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
                    <div className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Product preview"
                        className="w-full h-80 object-cover rounded-xl border border-gray-200"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3 text-center">
                      {file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
                
                {!file && (
                  <div className="mt-6 p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border border-orange-200">
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                      <div>
                        <p className="text-lg font-medium text-orange-800 mb-2">Image Tips</p>
                        <ul className="text-sm text-orange-700 space-y-1">
                          <li>• Use clear, well-lit photos</li>
                          <li>• Show multiple angles if possible</li>
                          <li>• High resolution images work best</li>
                          <li>• Remove distracting backgrounds</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;