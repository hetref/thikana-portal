"use client";

import { useState, useEffect } from "react";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  recordPurchase,
} from "@/lib/inventory-operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { EllipsisVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [bulkUpdates, setBulkUpdates] = useState({});
  const [userId, setUserId] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [imageFile, setImageFile] = useState(null);

  const handleSelectProduct = (productId) => {
    setSelectedProducts(
      (prevSelected) =>
        prevSelected.includes(productId)
          ? prevSelected.filter((id) => id !== productId) // Deselect
          : [...prevSelected, productId] // Select
    );
  };

  // Function to determine products to edit
  const getProductsToEdit = () => {
    return selectedProducts.length > 0
      ? products.filter((p) => selectedProducts.includes(p.id))
      : products;
  };

  useEffect(() => {
    const fetchUserId = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserId(currentUser.uid);
          subscribeToProducts(currentUser.uid);
        } else {
          console.error("No such user document!");
        }
      } else {
        console.error("No user is signed in.");
      }
    };

    fetchUserId();
  }, []);

  function subscribeToProducts(userId) {
    const db = getFirestore();
    const productsRef = collection(db, "users", userId, "products");

    const unsubscribe = onSnapshot(
      productsRef,
      (snapshot) => {
        const fetchedProducts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(fetchedProducts.length > 0 ? fetchedProducts : []);
      },
      (error) => {
        console.error("Error fetching products:", error);
        toast.error("Failed to fetch products. Please try again.");
      }
    );

    return unsubscribe;
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleBulkChange(productId, field, value) {
    setBulkUpdates((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  }

  async function handleBulkUpdate() {
    try {
      await Promise.all(
        Object.entries(bulkUpdates).map(([id, updates]) =>
          updateProduct(userId, { id, ...updates })
        )
      );
      setIsBulkEditDialogOpen(false);
      toast.success("Products updated successfully!");
    } catch (error) {
      console.error("Bulk update failed:", error);
      toast.error("Failed to update products.");
    }
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newProduct = {
      name: formData.get("name"),
      description: formData.get("description"),
      price: Number.parseFloat(formData.get("price")),
      quantity: Number.parseInt(formData.get("quantity"), 10),
      category: formData.get("category"),
      imageUrl: "",
      totalSales: 0,
      totalRevenue: 0,
      purchaseCount: 0,
    };

    if (!imageFile) {
      toast.error("Please select an image for the product.");
      return;
    }

    try {
      await addProduct(userId, newProduct, imageFile);
      setIsAddDialogOpen(false);
      subscribeToProducts(userId);
      toast.success("Product added successfully.");
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Failed to add product. Please try again.");
    }
  }

  return (
    <div className="container mx-auto p-4">
      {/* Top Bar - Search and Add Product */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <div className="flex space-x-2">
          {/* Search Bar */}
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border px-3 py-2 rounded"
          />
          {/* Bulk Edit Button */}
          <Button
            onClick={() => setIsBulkEditDialogOpen(true)}
            variant="outline"
          >
            Bulk Edit
          </Button>
          {/* Add New Product Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add New Product</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" required />
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" required />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" name="category" required />
                </div>
                <div>
                  <Label htmlFor="image">Image</Label>
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
                <Button type="submit">Add Product</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Product Table */}
      {filteredProducts.length === 0 ? (
        <div className="text-center text-muted-foreground">
          No products found.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Select</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => handleSelectProduct(product.id)}
                  />
                </TableCell>
                <TableCell>
                  <Image
                    src={product.imageUrl || "/placeholder.svg"}
                    alt={product.name}
                    width={50}
                    height={50}
                  />
                </TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.description}</TableCell>
                <TableCell>₹{product.price.toFixed(2)}</TableCell>
                <TableCell>{product.quantity}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <EllipsisVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={isBulkEditDialogOpen}
        onOpenChange={setIsBulkEditDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit Products</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBulkUpdate();
            }}
          >
            {/* Table Header Row */}
            <div className="grid grid-cols-3 gap-2 font-bold mb-2">
              <span>Name</span>
              <span>Price</span>
              <span>Quantity</span>
            </div>

            {/* Editable Fields */}
            {getProductsToEdit().map((product) => (
              <div key={product.id} className="grid grid-cols-3 gap-2 mb-2">
                <Input
                  type="text"
                  defaultValue={product.name}
                  onChange={(e) =>
                    handleBulkChange(product.id, "name", e.target.value)
                  }
                />
                <Input
                  type="number"
                  defaultValue={product.price}
                  onChange={(e) =>
                    handleBulkChange(product.id, "price", e.target.value)
                  }
                />
                <Input
                  type="number"
                  defaultValue={product.quantity}
                  onChange={(e) =>
                    handleBulkChange(product.id, "quantity", e.target.value)
                  }
                />
              </div>
            ))}

            <Button type="submit">Update Products</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
