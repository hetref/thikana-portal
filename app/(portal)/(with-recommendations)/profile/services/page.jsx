"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
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
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/Loader";


export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    isVariablePrice: false,
    approximatePrice: "",
    duration: "",
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const servicesRef = collection(db, "users", user.uid, "services");
      const q = query(servicesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const servicesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setServices(servicesData);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (checked) => {
    setFormData((prev) => ({
      ...prev,
      isVariablePrice: checked,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    try {
      const serviceData = {
        name: formData.name,
        description: formData.description,
        isVariablePrice: formData.isVariablePrice,
        duration: formData.duration,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add price based on whether it's variable or fixed
      if (formData.isVariablePrice) {
        serviceData.approximatePrice =
          parseFloat(formData.approximatePrice) || 0;
      } else {
        serviceData.price = parseFloat(formData.price) || 0;
      }

      if (editingService) {
        // Update existing service
        await updateDoc(
          doc(db, "users", user.uid, "services", editingService.id),
          {
            ...serviceData,
            updatedAt: serverTimestamp(),
          }
        );
        toast.success("Service updated successfully");
      } else {
        // Add new service
        await addDoc(
          collection(db, "users", user.uid, "services"),
          serviceData
        );
        toast.success("Service added successfully");
      }

      setIsAddDialogOpen(false);
      setEditingService(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        isVariablePrice: false,
        approximatePrice: "",
        duration: "",
      });
      fetchServices();
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Failed to save service");
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price ? service.price.toString() : "",
      isVariablePrice: service.isVariablePrice || false,
      approximatePrice: service.approximatePrice
        ? service.approximatePrice.toString()
        : "",
      duration: service.duration,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (serviceId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "services", serviceId));
      toast.success("Service deleted successfully");
      fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Failed to delete service");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader/>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manage Services</h1>
          <p className="text-muted-foreground">
            Add and manage your business services
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Service" : "Add New Service"}
              </DialogTitle>
              <DialogDescription>
                Fill in the details of your service
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Hair Cut"
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
                  placeholder="Describe your service..."
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isVariablePrice"
                  checked={formData.isVariablePrice}
                  onCheckedChange={handleCheckboxChange}
                />
                <Label htmlFor="isVariablePrice">
                  Price varies based on requirements
                </Label>
              </div>
              {formData.isVariablePrice ? (
                <div>
                  <Label htmlFor="approximatePrice">
                    Approximate Price (₹)
                  </Label>
                  <Input
                    id="approximatePrice"
                    name="approximatePrice"
                    type="number"
                    value={formData.approximatePrice}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    An estimate to give customers an idea of your pricing
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="price">Fixed Price (₹)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required={!formData.isVariablePrice}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  placeholder="e.g., 30 minutes"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingService ? "Update Service" : "Add Service"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Card key={service.id}>
            <CardHeader>
              <CardTitle>{service.name}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Price</span>
                  {service.isVariablePrice ? (
                    <div className="flex items-center">
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200"
                      >
                        Variable
                      </Badge>
                      {service.approximatePrice > 0 && (
                        <span className="ml-2 font-semibold">
                          ~₹{service.approximatePrice}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="font-semibold">₹{service.price}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{service.duration}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleEdit(service)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Service</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this service? This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(service.id)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No services added yet. Add your first service!
          </p>
        </div>
      )}
    </div>
  );
}
