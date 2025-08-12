"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
// import { foodstersMarketingScript } from "@/app/(portal)/profile/calls/foodsters-script";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const callScriptSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  script: z.string().min(20, "Script must be at least 20 characters"),
  language: z.enum(["en", "hi"]),
  voiceProvider: z.string(),
  voiceId: z.string(),
  voiceModel: z.string().optional(),
  callType: z.enum(["appointment", "followup", "marketing", "support"]),
});

const makeCallSchema = z.object({
  scriptId: z.string().min(1, "Please select a script"),
  phoneNumber: z
    .string()
    .min(10, "Please enter a valid phone number")
    .refine(
      (val) => {
        // Basic validation for phone number format
        // Should contain only digits, possibly a leading +
        return /^\+?[0-9]{10,15}$/.test(val.replace(/[\s()-]/g, ""));
      },
      {
        message:
          "Phone number should be in E.164 format (e.g., +14155552671) or at least contain 10 digits",
      }
    ),
});

export default function CallAutomationSettings() {
  const [scripts, setScripts] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("scripts");
  const [isMakingCall, setIsMakingCall] = useState(false);
  const [showFoodstersDemo, setShowFoodstersDemo] = useState(false);

  const user = auth.currentUser;

  const form = useForm({
    resolver: zodResolver(callScriptSchema),
    defaultValues: {
      name: "",
      script: "",
      language: "en",
      voiceProvider: "11labs",
      voiceId: "bobby", // Bobby from 11Labs
      voiceModel: "eleven_turbo_v2_5",
      callType: "appointment",
    },
  });

  const makeCallForm = useForm({
    resolver: zodResolver(makeCallSchema),
    defaultValues: {
      scriptId: "",
      phoneNumber: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch call scripts
        const scriptsRef = collection(db, "users", user.uid, "callScripts");
        const scriptsSnap = await getDocs(scriptsRef);
        const scriptsData = scriptsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setScripts(scriptsData);

        // Fetch call history
        const historyRef = collection(db, "users", user.uid, "callHistory");
        const historySnap = await getDocs(historyRef);
        const historyData = historySnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCallHistory(historyData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load call automation data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const onSubmit = async (data) => {
    try {
      if (!user) throw new Error("User not authenticated");

      const scriptRef = doc(collection(db, "users", user.uid, "callScripts"));
      await setDoc(scriptRef, {
        ...data,
        createdAt: new Date().toISOString(),
      });

      toast.success("Call script saved successfully");
      form.reset();

      // Refresh scripts list
      const scriptsRef = collection(db, "users", user.uid, "callScripts");
      const scriptsSnap = await getDocs(scriptsRef);
      const scriptsData = scriptsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setScripts(scriptsData);
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Failed to save call script");
    }
  };

  const handleMakeCall = async (data) => {
    try {
      setIsMakingCall(true);
      const script = scripts.find((s) => s.id === data.scriptId);

      if (!script) throw new Error("Script not found");
      if (!data.phoneNumber) throw new Error("Phone number is required");

      const response = await fetch("/api/vapi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callType: script.callType,
          phoneNumber: data.phoneNumber,
          businessId: user.uid,
          scriptData: {
            script: script.script,
            language: script.language,
            voiceProvider: script.voiceProvider,
            voiceId: script.voiceId,
            voiceModel: script.voiceModel,
            userId: user.uid,
            scriptId: script.id,
            callType: script.callType,
            enableDataExtraction: true,
          },
        }),
      });

      const responseData = await response.json();

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      toast.success("Call initiated successfully");
      makeCallForm.reset();
    } catch (error) {
      console.error("Error making call:", error);
      toast.error(error.message || "Failed to initiate call");
    } finally {
      setIsMakingCall(false);
    }
  };

  // const importFoodstersDemo = () => {
  //   form.setValue("name", "Foodsters New Menu Promotion");
  //   form.setValue("callType", "marketing");
  //   form.setValue("voiceId", "clara");
  //   form.setValue("script", "");
  //   setShowFoodstersDemo(false);
  //   toast.success("Demo script imported!");
  // };

  if (isLoading) return <div>Loading call automation settings...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Make a Call</h2>
      <p className="text-muted-foreground">Manually place an AI call using your saved scripts.</p>

      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>API Key Required</AlertTitle>
        <AlertDescription>
          To make real calls, add your VAPI Private API key to the .env file as
          VAPI_PRIVATE_API_KEY. Phone numbers should be in E.164 format (e.g., +14155552671).
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Make an AI Call</CardTitle>
          <CardDescription>Use your scripts to initiate calls to customers.</CardDescription>
        </CardHeader>
        <CardContent>
          {scripts.length > 0 ? (
            <Form {...makeCallForm}>
              <form onSubmit={makeCallForm.handleSubmit(handleMakeCall)} className="space-y-4">
                <FormField
                  control={makeCallForm.control}
                  name="scriptId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select a Script</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a script" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {scripts.map((script) => (
                            <SelectItem key={script.id} value={script.id}>
                              {script.name} ({script.callType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={makeCallForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isMakingCall}>
                  {isMakingCall ? "Initiating Call..." : "Start Call"}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">You need to create a call script before making calls.</p>
              {/* In this view, scripts are managed in the Call Scripts tab on the Calls page */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
