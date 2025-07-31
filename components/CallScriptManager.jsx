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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {  Plus, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";


export default function CallScriptManager() {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    callType: "",
    script: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callTypes, setCallTypes] = useState([]);
  const [loadingCallTypes, setLoadingCallTypes] = useState(true);

  const user = auth.currentUser;

  // Fetch available call types
  useEffect(() => {
    if (!user) return;

    const callTypesRef = collection(db, "users", user.uid, "callTypes");
    const q = query(callTypesRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const types = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCallTypes(types);
        setLoadingCallTypes(false);
      },
      (error) => {
        console.error("Error fetching call types:", error);
        setLoadingCallTypes(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch scripts
  useEffect(() => {
    if (!user) return;

    const fetchScripts = async () => {
      try {
        const scriptsRef = collection(db, "users", user.uid, "callScripts");
        const querySnapshot = await getDocs(scriptsRef);

        const scriptsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setScripts(scriptsList);
      } catch (error) {
        console.error("Error fetching scripts:", error);
        toast.error("Failed to load call scripts");
      } finally {
        setLoading(false);
      }
    };

    fetchScripts();
  }, [user]);

  const handleAddScript = async () => {
    if (!formData.name || !formData.callType || !formData.script) {
      toast.error("Please fill all fields");
      return;
    }

    // Find the selected call type
    const selectedType = callTypes.find(
      (type) => type.id === formData.callType
    );
    if (!selectedType) {
      toast.error("Selected call type not found");
      return;
    }

    setIsSubmitting(true);
    try {
      const scriptData = {
        name: formData.name,
        callTypeId: formData.callType,
        callTypeName: selectedType.name,
        callType: selectedType.typeId,
        script: formData.script,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(
        collection(db, "users", user.uid, "callScripts"),
        scriptData
      );

      // Refresh the scripts list
      const scriptsRef = collection(db, "users", user.uid, "callScripts");
      const querySnapshot = await getDocs(scriptsRef);
      const scriptsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setScripts(scriptsList);
      setIsAddDialogOpen(false);
      setFormData({ name: "", callType: "", script: "" });
      toast.success("Script added successfully");
    } catch (error) {
      console.error("Error adding script:", error);
      toast.error("Failed to add script");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditScript = async () => {
    if (!formData.name || !formData.callType || !formData.script) {
      toast.error("Please fill all fields");
      return;
    }

    // Find the selected call type
    const selectedType = callTypes.find(
      (type) => type.id === formData.callType
    );
    if (!selectedType) {
      toast.error("Selected call type not found");
      return;
    }

    setIsSubmitting(true);
    try {
      const scriptData = {
        name: formData.name,
        callTypeId: formData.callType,
        callTypeName: selectedType.name,
        callType: selectedType.typeId,
        script: formData.script,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(
        doc(db, "users", user.uid, "callScripts", editingScript.id),
        scriptData
      );

      // Refresh the scripts list
      const scriptsRef = collection(db, "users", user.uid, "callScripts");
      const querySnapshot = await getDocs(scriptsRef);
      const scriptsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setScripts(scriptsList);
      setIsEditDialogOpen(false);
      setEditingScript(null);
      setFormData({ name: "", callType: "", script: "" });
      toast.success("Script updated successfully");
    } catch (error) {
      console.error("Error updating script:", error);
      toast.error("Failed to update script");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteScript = async (scriptId) => {
    if (!confirm("Are you sure you want to delete this script?")) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "callScripts", scriptId));

      // Update the local state
      setScripts(scripts.filter((script) => script.id !== scriptId));
      toast.success("Script deleted successfully");
    } catch (error) {
      console.error("Error deleting script:", error);
      toast.error("Failed to delete script");
    }
  };

  const openEditDialog = (script) => {
    setEditingScript(script);
    setFormData({
      name: script.name,
      callType: script.callTypeId || "",
      script: script.script,
    });
    setIsEditDialogOpen(true);
  };

  const createSampleScript = async () => {
    // Check if there are call types available
    if (callTypes.length === 0) {
      toast.error("Please create call types first before adding scripts");
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the first available call type
      const callType = callTypes[0];

      const sampleScriptData = {
        name: "Customer Support",
        callTypeId: callType.id,
        callTypeName: callType.name,
        callType: callType.typeId,
        script: `Hello! I'm calling from [Business Name]. My name is [AI Assistant], and I'm reaching out regarding your recent query. Is this a good time to talk?

[If not a good time]
I understand. When would be a better time for me to call back?

[If yes]
Great! I see you had a question about our services. How can I help you today?

[Listen to customer's issue]

I understand your concern. Let me help you with that.

[If customer mentions product issue]
I'm sorry to hear about the issue with your product. Could you please provide me with your order number or the date of purchase?

[If customer mentions service issue]
I apologize for the inconvenience. Could you provide me with more details about when this happened and which service you were using?

[After collecting information]
Thank you for providing those details. Here's what we can do to resolve this issue...

[Provide solution options]

Would that work for you?

[If yes]
Excellent! I'll make a note of our conversation and the solution we've agreed upon. You'll receive a confirmation email with these details shortly.

[If no]
I understand. Let me see what other options we have available...

[Closing]
Is there anything else I can help you with today?

[If yes, address additional questions]

[If no]
Thank you for taking the time to speak with me today. If you have any further questions, please don't hesitate to reach out. Have a wonderful day!`,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(
        collection(db, "users", user.uid, "callScripts"),
        sampleScriptData
      );

      // Refresh the scripts list
      const scriptsRef = collection(db, "users", user.uid, "callScripts");
      const querySnapshot = await getDocs(scriptsRef);
      const scriptsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setScripts(scriptsList);
      toast.success("Sample script added");
    } catch (error) {
      console.error("Error adding sample script:", error);
      toast.error("Failed to add sample script");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || loadingCallTypes) {
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
          <h2 className="text-2xl font-bold">Call Scripts</h2>
          <p className="text-muted-foreground">
            Create and manage scripts for different types of calls
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Script
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Add New Call Script</DialogTitle>
              <DialogDescription>
                Create a script for customer calls. The AI will follow this
                script during calls.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Script Name</Label>
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
                <Label htmlFor="callType">Call Type</Label>
                <Select
                  value={formData.callType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, callType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select call type" />
                  </SelectTrigger>
                  <SelectContent>
                    {callTypes.length === 0 ? (
                      <SelectItem value="" disabled>
                        No call types available - create one first
                      </SelectItem>
                    ) : (
                      callTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {callTypes.length === 0 && (
                  <p className="text-xs text-destructive">
                    Please create call types first in the "Call Types" tab
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="script">Script Content</Label>
                <Textarea
                  id="script"
                  placeholder="Write your call script here..."
                  className="min-h-[200px]"
                  value={formData.script}
                  onChange={(e) =>
                    setFormData({ ...formData, script: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Use placeholders like [Business Name], [Customer Name], etc.
                  which will be replaced during the call.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddScript} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader/>
                    Saving...
                  </>
                ) : (
                  "Save Script"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {scripts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="mb-4 text-muted-foreground">
              No call scripts found
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Script
              </Button>
              <Button
                variant="outline"
                onClick={createSampleScript}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader/>
                    Creating...
                  </>
                ) : (
                  "Use Sample Script"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {scripts.map((script) => (
            <Card key={script.id}>
              <CardHeader>
                <CardTitle>{script.name}</CardTitle>
                <CardDescription>
                  Type:{" "}
                  {script.callTypeName || script.callType.replace("_", " ")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[150px] overflow-y-auto text-sm border rounded-md p-3 bg-muted/30">
                  <p className="whitespace-pre-line">{script.script}</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(script)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteScript(script.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Script Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Call Script</DialogTitle>
            <DialogDescription>
              Update your call script details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Script Name</Label>
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
              <Label htmlFor="edit-callType">Call Type</Label>
              <Select
                value={formData.callType}
                onValueChange={(value) =>
                  setFormData({ ...formData, callType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select call type" />
                </SelectTrigger>
                <SelectContent>
                  {callTypes.length === 0 ? (
                    <SelectItem value="" disabled>
                      No call types available - create one first
                    </SelectItem>
                  ) : (
                    callTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-script">Script Content</Label>
              <Textarea
                id="edit-script"
                placeholder="Write your call script here..."
                className="min-h-[200px]"
                value={formData.script}
                onChange={(e) =>
                  setFormData({ ...formData, script: e.target.value })
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
            <Button onClick={handleEditScript} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader/>
                  Updating...
                </>
              ) : (
                "Update Script"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
