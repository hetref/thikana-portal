"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  Timestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {  Plus, Edit2, Trash2, Tag } from "lucide-react";
import toast from "react-hot-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/Loader";

export default function CallTypeManager() {
  const [callTypes, setCallTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    typeId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const callTypesRef = collection(db, "users", user.uid, "callTypes");
    const q = query(callTypesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const types = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCallTypes(types);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching call types:", error);
        toast.error("Failed to load call types");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleAddType = async () => {
    if (!formData.name || !formData.typeId) {
      toast.error("Name and Type ID are required");
      return;
    }

    // Check if typeId already exists
    if (callTypes.some((type) => type.typeId === formData.typeId)) {
      toast.error("Type ID already exists. Please use a unique ID.");
      return;
    }

    setIsSubmitting(true);
    try {
      const typeData = {
        name: formData.name,
        description: formData.description || "",
        typeId: formData.typeId.toLowerCase().replace(/\s+/g, "_"),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Add the call type
      const typeDocRef = await addDoc(
        collection(db, "users", user.uid, "callTypes"),
        typeData
      );

      // Create a sample script for this call type
      const sampleScript = getSampleScriptForType(
        formData.name,
        typeData.typeId
      );

      await addDoc(collection(db, "users", user.uid, "callScripts"), {
        name: `${formData.name} Script`,
        callTypeId: typeDocRef.id,
        callTypeName: formData.name,
        callType: typeData.typeId,
        script: sampleScript,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setIsAddDialogOpen(false);
      setFormData({ name: "", description: "", typeId: "" });
      toast.success("Call type and sample script added successfully");
    } catch (error) {
      console.error("Error adding call type:", error);
      toast.error("Failed to add call type");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to get a sample script based on call type
  const getSampleScriptForType = (typeName, typeId) => {
    const businessPlaceholder = "[Business Name]";

    const scripts = {
      customer_support: `Hello! I'm calling from ${businessPlaceholder}. My name is [AI Assistant], and I'm reaching out to follow up on your recent support request. Is this a good time to talk?

[If not a good time]
I understand. When would be a better time for me to call back?

[If yes]
Great! I understand you had a question/concern about [product/service]. How can I assist you with that today?

[Listen to customer's issue]

I understand your concern. Let me help you with that.

[After addressing issue]
Is there anything else I can help you with today?

[If yes, address additional questions]

[If no]
Thank you for your time. If you have any further questions, please don't hesitate to reach out to us. Have a great day!`,

      appointment: `Hello! I'm calling from ${businessPlaceholder}. My name is [AI Assistant]. I'm calling to help you schedule an appointment. Is this a good time to talk?

[If not a good time]
I understand. When would be a better time for me to call back?

[If yes]
Great! What day and time would work best for you to come in?

[Discuss scheduling options]

Excellent! I've reserved [day] at [time] for you. Can I help you with anything else regarding your appointment?

[Address any questions]

Just to confirm, we have you scheduled for [day] at [time]. We look forward to seeing you then! Thank you for choosing ${businessPlaceholder}.`,

      sales_followup: `Hello! This is [AI Assistant] calling from ${businessPlaceholder}. I'm following up on your recent interest in our products/services. Is now a good time to talk?

[If not a good time]
I understand. When would be a better time for me to call back?

[If yes]
Great! I wanted to check if you had any questions about the [product/service] you inquired about?

[Discuss product/service details]

Would you like to proceed with a purchase or would you need more information?

[Handle response accordingly]

Thank you for your time today. If you have any more questions, please don't hesitate to reach out. Have a wonderful day!`,

      product_info: `Hello! This is [AI Assistant] from ${businessPlaceholder}. I'm calling regarding your interest in our products. Is this a convenient time to talk?

[If not a good time]
I understand. When would be a better time for me to call back?

[If yes]
Great! I'd be happy to provide you with more information about [product]. What specific details are you looking for?

[Respond to questions about features, pricing, availability, etc.]

Is there anything else you'd like to know about our products?

[Address additional questions]

Thank you for your interest in ${businessPlaceholder}. If you have any further questions, feel free to contact us. Have a great day!`,
    };

    // Return the specific script or a generic one if the type doesn't match
    return (
      scripts[typeId] ||
      `Hello! I'm calling from ${businessPlaceholder}. My name is [AI Assistant], and I'm reaching out about ${typeName}. 

[Introduce the purpose of the call]

[Ask if this is a good time to talk]

[Discuss the main topic]

[Answer any questions]

Thank you for your time. Is there anything else I can help you with today?

[If yes, address additional questions]

[If no]
Thank you for speaking with me today. If you have any further questions, please don't hesitate to contact us. Have a great day!`
    );
  };

  const handleEditType = async () => {
    if (!formData.name || !formData.typeId) {
      toast.error("Name and Type ID are required");
      return;
    }

    // Check if typeId already exists (excluding the current one being edited)
    if (
      callTypes.some(
        (type) => type.typeId === formData.typeId && type.id !== editingType.id
      )
    ) {
      toast.error("Type ID already exists. Please use a unique ID.");
      return;
    }

    setIsSubmitting(true);
    try {
      const typeData = {
        name: formData.name,
        description: formData.description || "",
        typeId: formData.typeId.toLowerCase().replace(/\s+/g, "_"),
        updatedAt: Timestamp.now(),
      };

      await updateDoc(
        doc(db, "users", user.uid, "callTypes", editingType.id),
        typeData
      );

      setIsEditDialogOpen(false);
      setEditingType(null);
      setFormData({ name: "", description: "", typeId: "" });
      toast.success("Call type updated successfully");
    } catch (error) {
      console.error("Error updating call type:", error);
      toast.error("Failed to update call type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteType = async (typeId) => {
    if (
      !confirm(
        "Are you sure you want to delete this call type? Scripts associated with this type may no longer work correctly."
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "callTypes", typeId));
      toast.success("Call type deleted");
    } catch (error) {
      console.error("Error deleting call type:", error);
      toast.error("Failed to delete call type");
    }
  };

  const openEditDialog = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
      typeId: type.typeId,
    });
    setIsEditDialogOpen(true);
  };

  const createSampleTypes = async () => {
    setIsSubmitting(true);
    try {
      const sampleTypes = [
        {
          name: "Customer Support",
          description: "For handling customer inquiries and resolving issues",
          typeId: "customer_support",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        {
          name: "Appointment Booking",
          description: "For scheduling appointments with customers",
          typeId: "appointment",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        {
          name: "Product Information",
          description: "For providing information about products or services",
          typeId: "product_info",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        {
          name: "Sales Follow-up",
          description: "For following up with potential customers",
          typeId: "sales_followup",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      const promises = sampleTypes.map((type) =>
        addDoc(collection(db, "users", user.uid, "callTypes"), type)
      );

      await Promise.all(promises);

      toast.success("Sample call types added");
    } catch (error) {
      console.error("Error adding sample call types:", error);
      toast.error("Failed to add sample call types");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader/>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Call Types</h2>
          <p className="text-muted-foreground">
            Create and manage call types for your business
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Type
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Add New Call Type</DialogTitle>
              <DialogDescription>
                Create a new call type for your business. These types will be
                visible to users when they request a call.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Type Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Customer Support"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="typeId">Type ID</Label>
                <Input
                  id="typeId"
                  placeholder="e.g., customer_support"
                  value={formData.typeId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      typeId: e.target.value.replace(/\s+/g, "_").toLowerCase(),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  This ID will be used internally and should be unique. Use
                  lowercase and underscores.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this call type is for..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddType} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader/>
                    Saving...
                  </>
                ) : (
                  "Save Type"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {callTypes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="mb-4 text-muted-foreground">
              No call types defined yet
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Call Type
              </Button>
              <Button
                variant="outline"
                onClick={createSampleTypes}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader/>
                    Creating...
                  </>
                ) : (
                  "Use Sample Types"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Call Types</CardTitle>
            <CardDescription>
              These types will be shown to users when they request a call
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {type.typeId}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {type.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(type)}
                        >
                          <Edit2 className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteType(type.id)}
                          className="text-destructive hover:text-destructive/90"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Type Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Call Type</DialogTitle>
            <DialogDescription>
              Update the details of this call type
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Type Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Customer Support"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-typeId">Type ID</Label>
              <Input
                id="edit-typeId"
                placeholder="e.g., customer_support"
                value={formData.typeId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    typeId: e.target.value.replace(/\s+/g, "_").toLowerCase(),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe what this call type is for..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditType} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader/>
                  Updating...
                </>
              ) : (
                "Update Type"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
