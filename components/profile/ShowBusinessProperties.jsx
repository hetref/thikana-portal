"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Image,
  MapPin,
  Calendar,
  Home,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import PropertyContactModal from "./PropertyContactModal";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ShowBusinessProperties({ businessId }) {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [propertyType, setPropertyType] = useState("all");

  useEffect(() => {
    fetchProperties();
  }, [businessId]);

  const fetchProperties = async () => {
    try {
      setIsLoading(true);
      if (!businessId) return;

      const propertiesQuery = query(
        collection(db, "businesses", businessId, "properties"),
        where("isAvailable", "==", true)
      );
      const querySnapshot = await getDocs(propertiesQuery);

      const propertiesData = [];
      querySnapshot.forEach((doc) => {
        propertiesData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setProperties(propertiesData);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter properties based on selected property type
  const filteredProperties =
    propertyType === "all"
      ? properties
      : properties.filter((property) => property.propertyType === propertyType);

  // Get unique property types for filter tabs
  const propertyTypes = [
    "all",
    ...new Set(properties.map((p) => p.propertyType)),
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No properties listed by this business yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          businessId={businessId}
        />
      ))}
    </div>
  );
}

// Helper function to safely format numeric values
const formatNumber = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0 ? num.toString() : "—";
};

const formatPrice = (price) => {
  const num = parseFloat(price);
  return !isNaN(num) && num > 0
    ? `₹${num.toLocaleString("en-IN")}`
    : "Price on request";
};

// Image Gallery Modal Component
const ImageGalleryModal = ({ images, isOpen, onClose, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  if (!images || images.length === 0) return null;

  const handlePrevious = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div className="relative h-full">
          <Button
            variant="ghost"
            className="absolute right-2 top-2 z-50 rounded-full p-2 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="relative h-[70vh]">
            <img
              src={images[currentIndex]}
              alt={`Property image ${currentIndex + 1}`}
              className="w-full h-full object-contain"
            />

            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>

                <Button
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex justify-center gap-2 p-4 bg-black">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`w-16 h-12 rounded cursor-pointer ${index === currentIndex ? "ring-2 ring-primary" : "opacity-70"}`}
                  onClick={() => setCurrentIndex(index)}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Update the PropertyCard component to use a horizontal layout
const PropertyCard = ({ property, businessId }) => {
  const statusBadgeColor = property.isAvailable
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-red-100 text-red-800 border-red-200";

  // Handle features correctly whether it's a string or array
  const featuresArray = Array.isArray(property.features)
    ? property.features
    : property.features
      ? property.features
          .toString()
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean)
      : [];

  // Image slider state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasMultipleImages = property.images && property.images.length > 1;

  // Image gallery modal state
  const [galleryOpen, setGalleryOpen] = useState(false);

  const nextImage = (e) => {
    e.stopPropagation();
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
    }
  };

  const prevImage = (e) => {
    e.stopPropagation();
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? property.images.length - 1 : prev - 1
      );
    }
  };

  const openGallery = () => {
    setGalleryOpen(true);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="flex flex-row">
        {/* Left side - Image with slider navigation */}
        <div className="relative w-48 h-48 min-w-[12rem] bg-gray-100">
          {property.images && property.images.length > 0 ? (
            <>
              <img
                src={property.images[currentImageIndex]}
                alt={property.title || "Property image"}
                className="w-full h-full object-cover cursor-pointer"
                onClick={openGallery}
              />
              {hasMultipleImages && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                    aria-label="Previous image"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                    aria-label="Next image"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                  <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
                    {property.images.map((_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 w-1.5 rounded-full ${index === currentImageIndex ? "bg-white" : "bg-white/50"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
              <p className="text-gray-500">No image</p>
            </div>
          )}
          <div className="absolute top-2 left-2">
            <Badge className={`${statusBadgeColor} font-medium`}>
              {property.isAvailable ? "Available" : "Not Available"}
            </Badge>
          </div>
        </div>

        <div className="flex-grow p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3
                  className="text-lg font-semibold leading-tight line-clamp-1"
                  title={property.title}
                >
                  {property.title || "Unnamed Property"}
                </h3>
                {(property.city || property.state) && (
                  <div className="flex items-center text-gray-500 mt-1">
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    <p className="text-sm line-clamp-1">
                      {[property.city, property.state]
                        .filter(Boolean)
                        .join(", ") || "Location not specified"}
                    </p>
                  </div>
                )}
              </div>
              {property.propertyType && (
                <Badge
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm font-medium text-xs"
                >
                  {property.propertyType}
                </Badge>
              )}
            </div>

            <div className="mt-3 mb-2">
              <p className="text-xl font-medium text-primary">
                ₹{formatNumber(property.price)}
              </p>
            </div>

            <div className="flex gap-6 mt-3 text-sm text-gray-600">
              <div className="flex items-center">
                <span className="font-medium mr-1">
                  {formatNumber(property.bedrooms)}
                </span>{" "}
                Beds
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-1">
                  {formatNumber(property.bathrooms)}
                </span>{" "}
                Baths
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-1">
                  {formatNumber(property.area)}
                </span>{" "}
                sq.ft
              </div>
            </div>

            {featuresArray.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {featuresArray.slice(0, 3).map((feature, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-gray-100 text-gray-700 text-xs"
                  >
                    {feature}
                  </Badge>
                ))}
                {featuresArray.length > 3 && (
                  <Badge
                    variant="outline"
                    className="bg-gray-100 text-gray-700 text-xs"
                  >
                    +{featuresArray.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Contact */}
        <div className="flex flex-col justify-center items-center border-l p-4 min-w-[140px]">
          <PropertyContactModal property={property} businessId={businessId} />
        </div>
      </div>

      {/* Image Gallery Modal */}
      {property.images && property.images.length > 0 && (
        <ImageGalleryModal
          images={property.images}
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          initialIndex={currentImageIndex}
        />
      )}
    </div>
  );
};
