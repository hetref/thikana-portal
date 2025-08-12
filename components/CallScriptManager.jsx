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
import { Plus, Edit2, Trash2, Sparkles } from "lucide-react";
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
    language: "en",
    voiceProvider: "11labs",
    voiceId: "Hmz0MdhDqv9vPpSMfDkh", // Bobby from 11Labs
    voiceModel: "eleven_turbo_v2_5",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callTypes, setCallTypes] = useState([]);
  const [loadingCallTypes, setLoadingCallTypes] = useState(true);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [businessName, setBusinessName] = useState("");

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
      toast.error("Please fill all required fields");
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
        language: formData.language,
        voiceProvider: formData.voiceProvider,
        voiceId: formData.voiceId,
        voiceModel: formData.voiceModel,
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
      setFormData({
        name: "",
        callType: "",
        script: "",
        language: "en",
        voiceProvider: "11labs",
        voiceId: "bobby",
        voiceModel: "eleven_turbo_v2_5",
      });
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
        language: formData.language,
        voiceProvider: formData.voiceProvider,
        voiceId: formData.voiceId,
        voiceModel: formData.voiceModel,
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
      setFormData({
        name: "",
        callType: "",
        script: "",
        language: "en",
        voiceProvider: "11labs",
        voiceId: "bobby",
        voiceModel: "eleven_turbo_v2_5",
      });
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
      language: script.language || "en",
      voiceProvider: script.voiceProvider || "11labs",
      voiceId: script.voiceId || "bIHbv24MWmeRgasZH58o",
      voiceModel: script.voiceModel || "eleven_turbo_v2_5",
    });
    setIsEditDialogOpen(true);
  };

  const generateScriptWithAI = async () => {
    if (!businessName || !formData.callType) {
      toast.error("Please enter business name and select call type first");
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

    setIsGeneratingScript(true);
    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName: businessName,
          callType: selectedType.name,
          language: formData.language,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate script");
      }

      // Update form with generated script
      setFormData({
        ...formData,
        name: `${businessName} - ${selectedType.name} Script`,
        script: result.script,
      });

      toast.success("Script generated successfully with AI!");
    } catch (error) {
      console.error("Error generating script:", error);
      toast.error(error.message || "Failed to generate script");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const createFoodstersScript = async () => {
    // Check if there are call types available
    if (callTypes.length === 0) {
      toast.error("Please create call types first before adding scripts");
      return;
    }

    setIsSubmitting(true);
    try {
      // Find or use the first available call type
      const callType =
        callTypes.find((type) => type.name.toLowerCase().includes("support")) ||
        callTypes[0];

      const foodstersScriptData = {
        name: "Foodsters Customer Support",
        callTypeId: callType.id,
        callTypeName: callType.name,
        callType: callType.typeId,
        script: `Hello! Thank you for calling Foodsters. My name is [AI Assistant], and I'm here to help you with any questions or concerns you may have about your order or our services. Is this a good time to talk?

[If not a good time]
I understand. When would be a better time for me to call you back? I'll make sure to reach out at your preferred time.

[If yes]
Great! I'm here to assist you. What can I help you with today?

[If customer has an order issue]
I'm sorry to hear you're experiencing an issue with your order. Let me help you resolve this right away. Could you please provide me with your order number or the phone number you used to place the order?

[After getting order details]
Thank you for that information. I can see your order here. Could you please tell me specifically what issue you're experiencing? Is it related to:
- Food quality
- Delivery time
- Missing items
- Payment issues
- Something else

[If food quality issue]
I sincerely apologize for the poor food quality. This is definitely not the Foodsters standard, and I want to make this right for you immediately. We can offer you a full refund or send you a fresh replacement meal right away. Which would you prefer?

[If delivery issue]
I apologize for the delay in your delivery. I understand how frustrating this can be when you're hungry and waiting for your meal. Let me check with our delivery team and provide you with an updated delivery time. Would you also like me to apply a discount to your current order for the inconvenience?

[If missing items]
I'm sorry that some items were missing from your order. This is definitely our mistake, and I want to fix this immediately. I can arrange for the missing items to be delivered to you right away at no extra charge, or I can process a partial refund for the missing items. What would work better for you?

[If payment issue]
I understand there's been an issue with your payment. Let me look into this for you. Could you please tell me what specific payment problem you're experiencing? I'll make sure we resolve this promptly.

[For general inquiries]
I'd be happy to help you with any questions about our menu, delivery areas, special offers, or anything else about Foodsters. What would you like to know?

[If customer wants to place an order]
Wonderful! I'd be delighted to help you place an order. You can place orders through our website, mobile app, or I can connect you directly with our order team. Which method would be most convenient for you?

[If customer wants to modify an existing order]
Let me check if we can still modify your order. Could you please provide your order number? If the order hasn't started being prepared, we should be able to make changes for you.

[Resolution and follow-up]
Is there anything else I can help you with regarding your Foodsters experience today?

[If yes, address additional concerns]

[If no]
Thank you so much for choosing Foodsters and for giving us the opportunity to resolve this for you. We truly value your business and want to ensure you have a great experience with us. If you have any other questions or concerns, please don't hesitate to reach out to us anytime.

[Closing]
Have a wonderful day, and we look forward to serving you again soon!`,
        language: "en",
        voiceProvider: "11labs",
        voiceId: "bobby",
        voiceModel: "eleven_turbo_v2_5",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(
        collection(db, "users", user.uid, "callScripts"),
        foodstersScriptData
      );

      // Refresh the scripts list
      const scriptsRef = collection(db, "users", user.uid, "callScripts");
      const querySnapshot = await getDocs(scriptsRef);
      const scriptsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setScripts(scriptsList);
      toast.success("Foodsters script added");
    } catch (error) {
      console.error("Error adding Foodsters script:", error);
      toast.error("Failed to add Foodsters script");
    } finally {
      setIsSubmitting(false);
    }
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
        language: "en",
        voiceProvider: "11labs",
        voiceId: "bobby",
        voiceModel: "eleven_turbo_v2_5",
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
        <Loader />
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
          <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Call Script</DialogTitle>
              <DialogDescription>
                Create a script for customer calls. The AI will follow this
                script during calls.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">
                  Business Name (for AI generation)
                </Label>
                <Input
                  id="businessName"
                  placeholder="e.g., Foodsters"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
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
                <Label htmlFor="language">Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) =>
                    setFormData({ ...formData, language: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi (हिंदी)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voiceProvider">Voice Provider</Label>
                  <Select
                    value={formData.voiceProvider}
                    onValueChange={(value) =>
                      setFormData({ ...formData, voiceProvider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="11labs">11Labs</SelectItem>
                      <SelectItem value="playht">PlayHT</SelectItem>
                      <SelectItem value="azure">Azure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voiceModel">Voice Model</Label>
                  <Select
                    value={formData.voiceModel}
                    onValueChange={(value) =>
                      setFormData({ ...formData, voiceModel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eleven_turbo_v2_5">
                        Eleven Turbo v2.5
                      </SelectItem>
                      <SelectItem value="eleven_turbo_v2">
                        Eleven Turbo v2
                      </SelectItem>
                      <SelectItem value="eleven_multilingual_v2">
                        Eleven Multilingual v2
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="voiceId">Voice</Label>
                <Select
                  value={formData.voiceId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, voiceId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bobby">
                      Bobby (Indian Male) - 11Labs
                    </SelectItem>
                    <SelectItem value="pNInz6obpgDQGcFmaJgB">
                      Adam (Male) - 11Labs
                    </SelectItem>
                    <SelectItem value="EXAVITQu4vr4xnSDxMaL">
                      Bella (Female) - 11Labs
                    </SelectItem>
                    <SelectItem value="VR6AewLTigWG4xSOukaG">
                      Arnold (Male) - 11Labs
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="script">Script Content</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateScriptWithAI}
                    disabled={
                      isGeneratingScript || !businessName || !formData.callType
                    }
                  >
                    {isGeneratingScript ? (
                      <>
                        <Loader />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="script"
                  placeholder="Write your call script here or use AI generation..."
                  className="min-h-[200px] max-h-[50vh]"
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
                    <Loader />
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
                onClick={createFoodstersScript}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader />
                    Creating...
                  </>
                ) : (
                  "Foodsters Script"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={createSampleScript}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader />
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
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
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
              <Label htmlFor="edit-language">Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value) =>
                  setFormData({ ...formData, language: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi (हिंदी)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-voiceProvider">Voice Provider</Label>
                <Select
                  value={formData.voiceProvider}
                  onValueChange={(value) =>
                    setFormData({ ...formData, voiceProvider: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="11labs">11Labs</SelectItem>
                    <SelectItem value="playht">PlayHT</SelectItem>
                    <SelectItem value="azure">Azure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-voiceModel">Voice Model</Label>
                <Select
                  value={formData.voiceModel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, voiceModel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eleven_turbo_v2_5">
                      Eleven Turbo v2.5
                    </SelectItem>
                    <SelectItem value="eleven_turbo_v2">
                      Eleven Turbo v2
                    </SelectItem>
                    <SelectItem value="eleven_multilingual_v2">
                      Eleven Multilingual v2
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-voiceId">Voice</Label>
              <Select
                value={formData.voiceId}
                onValueChange={(value) =>
                  setFormData({ ...formData, voiceId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bobby">
                    Bobby (Indian Male) - 11Labs
                  </SelectItem>
                  <SelectItem value="pNInz6obpgDQGcFmaJgB">
                    Adam (Male) - 11Labs
                  </SelectItem>
                  <SelectItem value="EXAVITQu4vr4xnSDxMaL">
                    Bella (Female) - 11Labs
                  </SelectItem>
                  <SelectItem value="VR6AewLTigWG4xSOukaG">
                    Arnold (Male) - 11Labs
                  </SelectItem>
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
                  <Loader />
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
