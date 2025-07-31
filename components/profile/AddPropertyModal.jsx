"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X, Plus } from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";

export default function AddPropertyModal({
  onPropertyAdded,
  existingProperty,
  buttonVariant = "outline",
}) {
  const [open, setOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imagesToUpload, setImagesToUpload] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

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
      }

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
      setOpen(false);

      toast.success("Property added successfully!");

      // Call the onPropertyAdded callback to refresh the list
      if (onPropertyAdded) {
        onPropertyAdded();
      }
    } catch (error) {
      console.error("Error adding property:", error);
      toast.error("Failed to add property");
    }
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} className="flex items-center">
          <Plus className="h-4 w-4 mr-2" /> Add Property
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
          <DialogDescription>
            Fill out the details to add a new property.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddProperty} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="general">General Info</TabsTrigger>
              <TabsTrigger value="details">Property Details</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div>
                <Label htmlFor="title">Property Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter property title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the property"
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="Enter price"
                  required
                />
              </div>

              <div>
                <Label htmlFor="propertyType">Property Type</Label>
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
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isAvailable: checked }))
                  }
                />
                <Label htmlFor="isAvailable">Property is available</Label>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Street address"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="State"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  placeholder="ZIP Code"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    name="bedrooms"
                    type="number"
                    value={formData.bedrooms}
                    onChange={handleInputChange}
                    placeholder="No. of bedrooms"
                  />
                </div>

                <div>
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    name="bathrooms"
                    type="number"
                    step="0.5"
                    value={formData.bathrooms}
                    onChange={handleInputChange}
                    placeholder="No. of bathrooms"
                  />
                </div>

                <div>
                  <Label htmlFor="area">Area (Sq.ft)</Label>
                  <Input
                    id="area"
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
                    <div key={feature} className="flex items-center space-x-2">
                      <Checkbox
                        id={`feature-${feature}`}
                        checked={formData.features?.includes(feature)}
                        onCheckedChange={() => handleFeatureChange(feature)}
                      />
                      <Label htmlFor={`feature-${feature}`} className="text-sm">
                        {feature}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="images" className="space-y-4">
              <div>
                <Label htmlFor="images">Upload Images</Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload multiple images of the property. The first image will
                  be the main display image.
                </p>
              </div>

              {previewUrls.length > 0 && (
                <div>
                  <Label className="block mb-2">Image Previews</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {previewUrls.map((url, index) => (
                      <div
                        key={index}
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
              onClick={() => setOpen(false)}
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
                "Add Property"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
