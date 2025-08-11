"use client";

import React, { useState } from "react";
import { auth, db, storage } from "@/lib/firebase"; // Firebase setup
import { collection, addDoc, updateDoc, setDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Package, 
  Sparkles, 
  Upload, 
  FileText, 
  FileSpreadsheet,
  Image as ImageIcon,
  Download,
  CheckCircle,
  AlertCircle
} from "lucide-react";

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

  // Parse CSV File with better handling
  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      
      // Split by lines and filter out empty lines
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length <= 1) {
        toast.error("CSV file must contain headers and at least one data row");
        return;
      }

      // Parse header row
      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Validate required columns
      const requiredColumns = ['Name', 'Description', 'Price', 'Category', 'Quantity'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        toast.error(`Missing required columns: ${missingColumns.join(', ')}`);
        return;
      }

      // Parse data rows
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue; // Skip empty lines
        
        // Split by comma but handle quoted values
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/"/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim().replace(/"/g, '')); // Add last value
        
        // Create object mapping headers to values
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });
        
        // Validate that essential fields are not empty
        if (rowData.Name && rowData.Name.trim() !== '') {
          data.push(rowData);
        }
      }

      if (data.length === 0) {
        toast.error("No valid product data found in CSV");
        return;
      }

      setTableData(data);
      toast.success(`Successfully loaded ${data.length} products from CSV!`);
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
      const productsRootRef = collection(db, "products");
      const userProductsRef = collection(db, "users", user.uid, "products");

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
        const productData = {
          name: product.Name || "",
          description: product.Description || "",
          price: parseFloat(product.Price) || 0,
          quantity: parseInt(product.Quantity) || 0,
          category: product.Category || "",
          imageUrl: imageUrls[index],
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
        const docRef = await addDoc(productsRootRef, productData);
        await updateDoc(docRef, { id: docRef.id });
        // Add to the user's products subcollection with the same ID
        await setDoc(doc(userProductsRef, docRef.id), { ...productData, id: docRef.id });
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
    toast.success("Template downloaded successfully!");
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Bulk Product Upload</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload multiple products at once using a CSV file with images
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload CSV File</h2>
            <p className="text-gray-600">Start by downloading the template or upload your CSV file</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Template Download */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-500" />
                Download Template
              </Label>
              <Button
                onClick={handleViewTemplate}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Download CSV Template
                </div>
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Upload className="w-4 h-4 text-orange-500" />
                Upload CSV File
              </Label>
              <div className="relative">
                <Input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange}
                  className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  <span>{file.name} loaded successfully</span>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border border-orange-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium text-orange-800 mb-2">Important Instructions</h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Download the template first to see the required format</li>
                  <li>• CSV must include: Name, Description, Price, Category, Quantity</li>
                  <li>• Each product will need an image uploaded after CSV is processed</li>
                  <li>• Make sure all prices are in numbers and quantities are integers</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        {tableData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Product Preview</h2>
              <p className="text-gray-600">Review your products and upload images for each item</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-50 to-red-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wide">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wide">Description</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wide">Price (₹)</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wide">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wide">Quantity</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 uppercase tracking-wide">Image</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tableData.map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {product.Name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {product.Description}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600">
                        ₹{product.Price}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.Category}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.Quantity}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center space-y-3">
                          {/* Image Preview */}
                          {images[index] && (
                            <div className="relative">
                              <img
                                src={URL.createObjectURL(images[index])}
                                alt={`Preview for ${product.Name}`}
                                className="w-20 h-20 object-cover rounded-xl border-2 border-orange-200 shadow-sm"
                              />
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}

                          {/* Upload Status & Button */}
                          <div className="flex flex-col items-center space-y-2">
                            <span className={`text-xs font-medium ${
                              images[index] 
                                ? "text-green-700 bg-green-100" 
                                : "text-orange-700 bg-orange-100"
                            } px-3 py-1 rounded-full`}>
                              {images[index] ? "✅ Uploaded" : "📷 Need Image"}
                            </span>
                            
                            <label className="cursor-pointer">
                              <div className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                {images[index] ? "Change" : "Upload"}
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    setImages((prev) => ({ ...prev, [index]: file }));
                                    toast.success(`Image uploaded for ${product.Name}`);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Submit Section */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{tableData.length}</span> products ready to upload
                  <span className="ml-4 font-medium">{Object.keys(images).length}</span> images uploaded
                </div>
                
                <Button
                  onClick={handleSaveProducts}
                  disabled={isSubmitting || Object.keys(images).length !== tableData.length}
                  className="h-12 px-8 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 hover:from-orange-600 hover:via-red-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Uploading Products...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Upload {tableData.length} Products
                    </div>
                  )}
                </Button>
              </div>
              
              {Object.keys(images).length !== tableData.length && (
                <div className="mt-3 text-sm text-orange-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Please upload images for all products before submitting
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkProductUpload;