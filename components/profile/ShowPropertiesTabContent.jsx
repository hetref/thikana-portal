"use client";

import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  X,
  Plus,
  Edit,
  Trash2,
  Image,
  MapPin,
  Home,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Mail,
  Phone,
  MoreHorizontal,
  User2,
  Tag,
  Building2,
  Banknote,
  Laptop,
  BathIcon,
  BedIcon,
  SquareIcon,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import AddPropertyModal from "./AddPropertyModal";

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

export default function ShowPropertiesTabContent() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    propertyType: "residential",
    bedrooms: "",
    bathrooms: "",
    area: "",
    features: [],
    images: [],
    isAvailable: true,
  });

  // Images to be uploaded
  const [imagesToUpload, setImagesToUpload] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const propertiesQuery = query(
        collection(db, "businesses", user.uid, "properties"),
        orderBy("createdAt", "desc")
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
      toast.error("Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeatureChange = (feature) => {
    setFormData((prev) => {
      const features = prev.features || [];
      if (features.includes(feature)) {
        return { ...prev, features: features.filter((f) => f !== feature) };
      } else {
        return { ...prev, features: [...features, feature] };
      }
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImagesToUpload([...imagesToUpload, ...files]);

    // Create preview URLs
    const newPreviewUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviewUrls]);
  };

  const removeImage = (index) => {
    const newImages = [...imagesToUpload];
    newImages.splice(index, 1);
    setImagesToUpload(newImages);

    const newPreviews = [...previewUrls];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setPreviewUrls(newPreviews);
  };

  const uploadImages = async (propertyId) => {
    if (imagesToUpload.length === 0) return [];

    setUploadingImages(true);
    const uploadedUrls = [];

    try {
      for (const file of imagesToUpload) {
        const fileName = `properties/${propertyId}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, fileName);

        await uploadBytesResumable(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        uploadedUrls.push(downloadUrl);
      }
      return uploadedUrls;
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload some images");
      return uploadedUrls;
    } finally {
      setUploadingImages(false);
    }
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();

    try {
      const user = auth.currentUser;
      if (!user) return;

      const propertyData = {
        ...formData,
        price: parseFloat(formData.price),
        bedrooms: parseInt(formData.bedrooms, 10),
        bathrooms: parseFloat(formData.bathrooms),
        area: parseFloat(formData.area),
        images: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user.uid,
      };

      // Add document first to get ID
      const docRef = await addDoc(
        collection(db, "businesses", user.uid, "properties"),
        propertyData
      );

      // Upload images with property ID
      if (imagesToUpload.length > 0) {
        const imageUrls = await uploadImages(docRef.id);

        // Update the property with image URLs
        await updateDoc(
          doc(db, "businesses", user.uid, "properties", docRef.id),
          {
            images: imageUrls,
          }
        );

        propertyData.images = imageUrls;
      }

      // Add to local state
      setProperties([...properties, { id: docRef.id, ...propertyData }]);

      // Reset form and close modal
      setFormData({
        title: "",
        description: "",
        price: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        propertyType: "residential",
        bedrooms: "",
        bathrooms: "",
        area: "",
        features: [],
        images: [],
        isAvailable: true,
      });
      setImagesToUpload([]);
      setPreviewUrls([]);
      setIsAddModalOpen(false);

      toast.success("Property added successfully!");
    } catch (error) {
      console.error("Error adding property:", error);
      toast.error("Failed to add property");
    }
  };

  const handleEditProperty = async (e) => {
    e.preventDefault();

    if (!selectedProperty) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      const propertyData = {
        ...formData,
        price: parseFloat(formData.price),
        bedrooms: parseInt(formData.bedrooms, 10),
        bathrooms: parseFloat(formData.bathrooms),
        area: parseFloat(formData.area),
        updatedAt: Timestamp.now(),
      };

      // Upload new images if any
      if (imagesToUpload.length > 0) {
        const newImageUrls = await uploadImages(selectedProperty.id);
        propertyData.images = [
          ...(selectedProperty.images || []),
          ...newImageUrls,
        ];
      } else {
        propertyData.images = selectedProperty.images || [];
      }

      // Update document
      await updateDoc(
        doc(db, "businesses", user.uid, "properties", selectedProperty.id),
        propertyData
      );

      // Update local state
      setProperties(
        properties.map((property) =>
          property.id === selectedProperty.id
            ? { ...property, ...propertyData }
            : property
        )
      );

      // Reset and close
      setIsEditModalOpen(false);
      setSelectedProperty(null);
      setImagesToUpload([]);
      setPreviewUrls([]);

      toast.success("Property updated successfully!");
    } catch (error) {
      console.error("Error updating property:", error);
      toast.error("Failed to update property");
    }
  };

  const handleDeleteProperty = async (id) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Delete the property document
      await deleteDoc(doc(db, "businesses", user.uid, "properties", id));

      // Delete images from storage
      if (
        selectedProperty &&
        selectedProperty.images &&
        selectedProperty.images.length > 0
      ) {
        for (const imageUrl of selectedProperty.images) {
          try {
            // Extract the path from the URL
            const imagePath = decodeURIComponent(
              imageUrl.split("/o/")[1].split("?")[0]
            );
            const imageRef = ref(storage, imagePath);
            await deleteObject(imageRef);
          } catch (error) {
            console.error("Error deleting image:", error);
          }
        }
      }

      // Update local state
      setProperties(properties.filter((p) => p.id !== id));

      // Close dialog and reset
      setIsDeleteDialogOpen(false);
      setSelectedProperty(null);

      toast.success("Property deleted successfully!");
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Failed to delete property");
    }
  };

  const openEditModal = (property) => {
    setSelectedProperty(property);
    setFormData({
      title: property.title || "",
      description: property.description || "",
      price: property.price?.toString() || "",
      address: property.address || "",
      city: property.city || "",
      state: property.state || "",
      zipCode: property.zipCode || "",
      propertyType: property.propertyType || "residential",
      bedrooms: property.bedrooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      area: property.area?.toString() || "",
      features: property.features || [],
      images: property.images || [],
      isAvailable: property.isAvailable !== false, // default to true
    });
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (property) => {
    setSelectedProperty(property);
    setIsDeleteDialogOpen(true);
  };

  const propertyFeatures = [
    "Parking",
    "Pool",
    "Garden",
    "Balcony",
    "Air Conditioning",
    "Furnished",
    "Pet Friendly",
    "Security System",
    "Elevator",
    "Gym",
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader/>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Your Listed Properties</h2>
        <AddPropertyModal
          onPropertyAdded={fetchProperties}
          existingProperty={null}
        />
      </div>

      {/* Properties list */}
      {properties.length === 0 ? (
        <div className="text-center py-10 space-y-4">
          <Home className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="text-xl font-medium">No properties listed yet</h3>
          <p className="text-muted-foreground">
            Start by adding your first property listing
          </p>
          <AddPropertyModal
            onPropertyAdded={fetchProperties}
            existingProperty={null}
            buttonVariant="default"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onDelete={handleDeleteProperty}
              onEdit={openEditModal}
            />
          ))}
        </div>
      )}

      {/* Edit Property Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>Update the property details.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditProperty} className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="general">General Info</TabsTrigger>
                <TabsTrigger value="details">Property Details</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Property Title</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter property title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe the property"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-price">Price (₹)</Label>
                  <Input
                    id="edit-price"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="Enter price"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-propertyType">Property Type</Label>
                  <Select
                    name="propertyType"
                    value={formData.propertyType}
                    onValueChange={(value) =>
                      handleSelectChange("propertyType", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="land">Land/Plot</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="villa">Villa/House</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isAvailable"
                    checked={formData.isAvailable}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isAvailable: checked }))
                    }
                  />
                  <Label htmlFor="edit-isAvailable">
                    Property is available
                  </Label>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div>
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Street address"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-city">City</Label>
                    <Input
                      id="edit-city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="City"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-state">State</Label>
                    <Input
                      id="edit-state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="State"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-zipCode">ZIP Code</Label>
                  <Input
                    id="edit-zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    placeholder="ZIP Code"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-bedrooms">Bedrooms</Label>
                    <Input
                      id="edit-bedrooms"
                      name="bedrooms"
                      type="number"
                      value={formData.bedrooms}
                      onChange={handleInputChange}
                      placeholder="No. of bedrooms"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-bathrooms">Bathrooms</Label>
                    <Input
                      id="edit-bathrooms"
                      name="bathrooms"
                      type="number"
                      step="0.5"
                      value={formData.bathrooms}
                      onChange={handleInputChange}
                      placeholder="No. of bathrooms"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-area">Area (Sq.ft)</Label>
                    <Input
                      id="edit-area"
                      name="area"
                      type="number"
                      value={formData.area}
                      onChange={handleInputChange}
                      placeholder="Area in sq.ft"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="block mb-2">Features</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {propertyFeatures.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`edit-feature-${feature}`}
                          checked={formData.features?.includes(feature)}
                          onCheckedChange={() => handleFeatureChange(feature)}
                        />
                        <Label
                          htmlFor={`edit-feature-${feature}`}
                          className="text-sm"
                        >
                          {feature}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="images" className="space-y-4">
                {selectedProperty?.images &&
                  selectedProperty.images.length > 0 && (
                    <div>
                      <Label className="block mb-2">Current Images</Label>
                      <div className="grid grid-cols-3 gap-4">
                        {selectedProperty.images.map((url, index) => (
                          <div
                            key={`current-${index}`}
                            className="relative h-24 bg-muted rounded-md overflow-hidden"
                          >
                            <img
                              src={url}
                              alt={`Image ${index}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                <div>
                  <Label htmlFor="edit-images">Add More Images</Label>
                  <Input
                    id="edit-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="mt-1"
                  />
                </div>

                {previewUrls.length > 0 && (
                  <div>
                    <Label className="block mb-2">New Image Previews</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {previewUrls.map((url, index) => (
                        <div
                          key={`new-${index}`}
                          className="relative h-24 bg-muted rounded-md overflow-hidden"
                        >
                          <img
                            src={url}
                            alt={`Preview ${index}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-black/60 rounded-full p-1"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedProperty(null);
                  setImagesToUpload([]);
                  setPreviewUrls([]);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingImages}>
                {uploadingImages ? (
                  <>
                    <Loader/>
                    Uploading...
                  </>
                ) : (
                  "Update Property"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this property and all associated
              images. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedProperty(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteProperty(selectedProperty.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const PropertyCard = ({ property, onDelete, onEdit }) => {
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

  const nextImage = () => {
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
    }
  };

  const prevImage = () => {
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? property.images.length - 1 : prev - 1
      );
    }
  };

  // Image gallery modal state
  const [galleryOpen, setGalleryOpen] = useState(false);

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
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
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
              {property.isAvailable ? "Available" : "Sold/Rented"}
            </Badge>
          </div>
        </div>

        {/* Middle - Property info */}
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

        {/* Right side - Actions */}
        <div className="flex flex-col gap-2 justify-center items-center border-l p-4 min-w-[120px]">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onEdit(property)}
          >
            Edit
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your property listing.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(property.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
