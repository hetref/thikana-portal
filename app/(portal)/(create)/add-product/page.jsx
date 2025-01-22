"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { auth, db, storage } from "@/lib/firebase"; // Ensure you have your Firebase setup in firebase.js
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const productSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  price: z.string().min(1, "Price must be a positive number"),
  image: z
    .instanceof(File)
    .refine((file) => file.size <= 5000000, "Max file size is 5MB"),
});

const AddProductPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      description: "",
      price: 1,
      image: null,
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Convert price to a number
      const price = parseFloat(data.price);

      // Upload image to Firebase Storage
      const storageRef = ref(
        storage,
        `${user.uid}/products/${data.image.name}`
      );
      await uploadBytes(storageRef, data.image);
      const imageUrl = await getDownloadURL(storageRef);

      // Save product data to Firestore
      const productsRef = collection(db, "users", user.uid, "products");
      await addDoc(productsRef, {
        title: data.title,
        description: data.description,
        price: price,
        imageUrl: imageUrl,
      });

      toast.success("Product added successfully!");
      form.reset(); // Reset the form
      router.push("/profile");
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Failed to add product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter product title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter product description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter product price"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Image</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => field.onChange(e.target.files[0])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Product"}
        </Button>
      </form>
    </Form>
  );
};

export default AddProductPage;
