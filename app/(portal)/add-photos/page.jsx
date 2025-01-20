"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import AddPhotoModal from "@/components/AddPhotoModal";

export default function AddPhotosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const userId = "user123"; // Replace this with the actual user ID from your authentication system

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Add Photos</h1>
      <Button onClick={() => setIsModalOpen(true)}>Add New Photo</Button>
      <AddPhotoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
      />
    </div>
  );
}
