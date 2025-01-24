"use client";

import { useState, useEffect } from "react";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  recordPurchase,
} from "@/lib/inventory-operations";
import { initialProducts } from "@/lib/initial-products";
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
import ProductAnalytics from "@/components/inventory/ProductAnalytics";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { ChartSpline, EllipsisVertical, Pencil, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [userId, setUserId] = useState(null);

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
        setProducts(
          fetchedProducts.length > 0 ? fetchedProducts : initialProducts
        );
      },
      (error) => {
        console.error("Error fetching products:", error);
        toast.error("Failed to fetch products. Please try again.");
      }
    );

    return unsubscribe;
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

  async function handleUpdateProduct(e) {
    e.preventDefault();
    if (!currentProduct) return;

    const formData = new FormData(e.currentTarget);
    const updatedProduct = {
      ...currentProduct,
      name: formData.get("name"),
      description: formData.get("description"),
      price: Number.parseFloat(formData.get("price")),
      quantity: Number.parseInt(formData.get("quantity"), 10),
      category: formData.get("category"),
    };

    try {
      await updateProduct(userId, updatedProduct, imageFile || undefined);
      setIsEditDialogOpen(false);
      subscribeToProducts(userId);
      toast.success("Product updated successfully.");
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product. Please try again.");
    }
  }

  async function handleDeleteProduct(product) {
    if (!product.id) return;

    try {
      await deleteProduct(userId, product.id, product.imageUrl);
      subscribeToProducts(userId);
      toast.success("Product deleted successfully.");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product. Please try again.");
    }
  }

  async function handlePurchase() {
    if (!currentProduct || !currentProduct.id) return;

    try {
      await recordPurchase(
        userId,
        currentProduct.id,
        purchaseQuantity,
        currentProduct.price
      );
      setIsPurchaseDialogOpen(false);
      subscribeToProducts(userId);
      toast.success("Purchase recorded successfully.");
    } catch (error) {
      console.error("Error recording purchase:", error);
      toast.error("Failed to record purchase. Please try again.");
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mb-4">Add New Product</Button>
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
      <Table>
        <TableHeader>
          <TableRow>
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
          {products.map((product) => (
            <TableRow key={product.id}>
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
                    <DropdownMenuItem
                      onClick={() => {
                        setCurrentProduct(product);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        // setCurrentProduct(product);
                        // setIsAnalyticsDialogOpen(true);
                      }}
                    >
                      <Link href="/profile/analytics">Analytics</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteProduct(product)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {currentProduct && (
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={currentProduct.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  name="description"
                  defaultValue={currentProduct.description}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-price">Price</Label>
                <Input
                  id="edit-price"
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue={currentProduct.price}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input
                  id="edit-quantity"
                  name="quantity"
                  type="number"
                  defaultValue={currentProduct.quantity}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  name="category"
                  defaultValue={currentProduct.category}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-image">Image (optional)</Label>
                <Input
                  id="edit-image"
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button type="submit">Update Product</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={isPurchaseDialogOpen}
        onOpenChange={setIsPurchaseDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Product</DialogTitle>
          </DialogHeader>
          {currentProduct && (
            <div className="space-y-4">
              <p>Product: {currentProduct.name}</p>
              <p>Price: ₹{currentProduct.price.toFixed(2)}</p>
              <div>
                <Label htmlFor="purchase-quantity">Quantity</Label>
                <Input
                  id="purchase-quantity"
                  type="number"
                  min="1"
                  max={currentProduct.quantity}
                  value={purchaseQuantity}
                  onChange={(e) =>
                    setPurchaseQuantity(Number.parseInt(e.target.value, 10))
                  }
                />
              </div>
              <Button onClick={handlePurchase}>Confirm Purchase</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={isAnalyticsDialogOpen}
        onOpenChange={setIsAnalyticsDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product Analytics</DialogTitle>
          </DialogHeader>
          {currentProduct && currentProduct.id && (
            <ProductAnalytics userId={userId} productId={currentProduct.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
