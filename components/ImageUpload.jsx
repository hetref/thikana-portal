"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function ImageUpload({
  label = "Image",
  currentImage,
  onImageChange,
  isCover = false,
  isSubmitting,
}) {
  const [previewUrl, setPreviewUrl] = useState(currentImage || null);

  // Update preview when currentImage changes (from parent)
  useEffect(() => {
    setPreviewUrl(currentImage || null);
  }, [currentImage]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview from the selected file
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
      onImageChange(file);

      // Reset the input value to ensure onChange fires even if selecting the same file again
      e.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageChange(null);

    // Reset the file input
    const fileInput = document.getElementById(
      label ? label.toLowerCase().replace(" ", "-") : "image"
    );
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const inputId = label ? label.toLowerCase().replace(" ", "-") : "image";

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className={`${isCover ? "space-y-2" : "flex items-center gap-4"}`}>
        {previewUrl ? (
          <div
            className={
              isCover
                ? "w-full h-[200px] relative mb-2"
                : "w-20 h-20 relative flex-shrink-0"
            }
          >
            <img
              src={previewUrl}
              alt={label}
              className={`${
                isCover
                  ? "w-full h-full object-cover rounded-md"
                  : "w-20 h-20 rounded-full object-cover"
              }`}
            />
          </div>
        ) : (
          <div
            className={
              isCover
                ? "w-full h-[200px] relative mb-2 bg-gray-100 flex items-center justify-center rounded-md"
                : "w-20 h-20 relative flex-shrink-0 bg-gray-100 rounded-full flex items-center justify-center"
            }
          >
            <span className="text-gray-400 text-xs">No image</span>
          </div>
        )}
        <div className="flex space-x-2">
          <input
            type="file"
            id={inputId}
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={isSubmitting}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById(inputId)?.click()}
            disabled={isSubmitting}
          >
            {previewUrl ? "Change Image" : "Upload Image"}
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemoveImage}
              disabled={isSubmitting}
            >
              Remove Image
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
