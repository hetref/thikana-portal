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
import { Loader2, Image, MapPin, Calendar, Home } from "lucide-react";
import PropertyContactModal from "./PropertyContactModal";
import Link from "next/link";

export default function ShowBusinessProperties({ businessId }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propertyType, setPropertyType] = useState("all");

  useEffect(() => {
    fetchProperties();
  }, [businessId]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-8">
        <Home className="h-12 w-12 mx-auto text-muted-foreground" />
        <h3 className="text-lg font-medium mt-4">No properties available</h3>
        <p className="text-muted-foreground mt-2">
          This business doesn't have any properties listed at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Available Properties</h2>

      {/* Property Type Tabs */}
      <Tabs defaultValue="all" onValueChange={setPropertyType}>
        <TabsList>
          {propertyTypes.map((type) => (
            <TabsTrigger key={type} value={type}>
              {type === "all"
                ? "All Properties"
                : type.charAt(0).toUpperCase() + type.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filteredProperties.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No properties found for the selected type.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              businessId={businessId}
            />
          ))}
        </div>
      )}
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

// Component to display property cards
const PropertyCard = ({ property, businessId }) => {
  const statusBadgeColor =
    property.status === "Available"
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="relative h-56">
        {property.images && property.images.length > 0 ? (
          <img
            src={property.images[0]}
            alt={property.title || "Property image"}
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
            <p className="text-gray-500">No image available</p>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge className={`${statusBadgeColor} font-medium`}>
            {property.status || "Status N/A"}
          </Badge>
        </div>
        {property.propertyType && (
          <div className="absolute top-2 right-2">
            <Badge
              variant="outline"
              className="bg-white/80 backdrop-blur-sm font-medium"
            >
              {property.propertyType}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50">
        <div className="mb-2 flex items-start justify-between">
          <h3
            className="text-lg font-semibold leading-tight line-clamp-1"
            title={property.title}
          >
            {property.title || "Unnamed Property"}
          </h3>
        </div>

        {(property.city || property.state) && (
          <div className="flex items-center text-gray-500 mb-3">
            <MapPin className="h-4 w-4 mr-1" />
            <p className="text-sm line-clamp-1">
              {[property.city, property.state].filter(Boolean).join(", ") ||
                "Location not specified"}
            </p>
          </div>
        )}

        <div className="mt-2 mb-4">
          <p className="text-xl font-medium text-primary">
            {formatPrice(property.price)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mb-3">
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
          <div className="flex flex-wrap gap-1 mt-2">
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

      <CardFooter className="p-4 pt-0">
        <PropertyContactModal property={property} businessId={businessId} />
      </CardFooter>
    </div>
  );
};
