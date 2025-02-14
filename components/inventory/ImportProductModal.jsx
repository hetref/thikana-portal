"use client";
import React, { useState } from "react";
import * as Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/lib/firebase"; // Ensure Firebase is set up correctly
import { collection, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Trash } from "lucide-react";

const REQUIRED_COLUMNS = [
  "Title",
  "Description",
  "Price",
  "Category",
  "Quantity",
];

const ImportProductModalPage = () => {
  const [file, setFile] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile || uploadedFile.type !== "text/csv") {
      toast.error("Please upload a valid CSV file.");
      setFile(null);
      setTableData(null);
      return;
    }
    setFile(uploadedFile);

    // Parse CSV file
    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { data, errors } = results;
        if (errors.length > 0) {
          toast.error("Error parsing CSV file. Please check the file format.");
          setTableData(null);
          return;
        }

        // Check if all required columns are present
        const columns = Object.keys(data[0]);
        const missingColumns = REQUIRED_COLUMNS.filter(
          (col) => !columns.includes(col)
        );
        if (missingColumns.length > 0) {
          toast.error(
            `The following columns are missing: ${missingColumns.join(
              ", "
            )}. Please refer to the template.`
          );
          setTableData(null);
          return;
        }

        setTableData(data);
        toast.success("File uploaded and validated successfully.");
      },
      error: (error) => {
        console.error("Error parsing CSV file:", error);
        toast.error("Failed to read the file. Please try again.");
      },
    });
  };

  const handleSaveProducts = async () => {
    if (!tableData || tableData.length === 0) return;
    setIsSubmitting(true);
    const user = auth.currentUser;
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }
      const productsRef = collection(db, "users", user.uid, "products");
      const promises = tableData.map((product) =>
        addDoc(productsRef, {
          title: product.Title,
          description: product.Description,
          price: parseFloat(product.Price),
          category: product.Category,
          quantity: parseInt(product.Quantity),
        })
      );
      await Promise.all(promises);
      toast.success("Products added successfully!");
      setFile(null);
      setTableData(null);
    } catch (error) {
      console.error("Error saving products:", error);
      toast.error("Failed to save products. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = REQUIRED_COLUMNS.join(",") + "\n";
    const blob = new Blob([templateData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "product_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteProduct = (index) => {
    setTableData((prevData) => {
      const newData = prevData.filter((_, i) => i !== index);
      return newData.length === 0 ? null : newData;
    });
  };

  return (
    <div className="mt-20 max-w-3xl mx-auto p-4 sm:p-6 md:p-8 shadow-md rounded-md text-primary border border-primary-foreground">
      <h1 className="text-2xl font-bold text-center text-primary mb-6">
        Add Products in Bulk
      </h1>
      <div className="flex items-center justify-between mb-4">
        <p className="text-lg font-medium">View Template</p>
        <Button
          onClick={downloadTemplate}
          className="bg-primary hover:bg-primary-dark"
        >
          Download
        </Button>
      </div>
      <div className="mb-6">
        <p className="text-lg font-medium mb-2">Upload Products CSV File</p>
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="text-primary w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      {tableData && (
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SR No.
                </th>
                {REQUIRED_COLUMNS.map((column) => (
                  <th
                    key={column}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableData.map((row, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDeleteProduct(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash />
                    </button>
                    {index + 1}
                  </td>
                  {REQUIRED_COLUMNS.map((column) => (
                    <td key={column} className="px-6 py-4 whitespace-nowrap">
                      {row[column]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Button
        onClick={handleSaveProducts}
        disabled={!tableData || tableData.length === 0 || isSubmitting}
        className="w-full bg-primary hover:bg-primary-dark font-semibold py-2 px-4 rounded-md transition-all duration-200 disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Save Products"}
      </Button>
    </div>
  );
};

export default ImportProductModalPage;
