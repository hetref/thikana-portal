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
// import { foodstersMarketingScript } from "foodsters-script";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const foodstersMarketingScript = `Hello! My name is [AI Assistant], calling on behalf of Foodsters. I hope I'm not catching you at a busy time?

[Wait for response]

Great! I'm reaching out today because Foodsters has just launched an exciting new seasonal menu, and we wanted our valued customers to be the first to know. 

Our chef has created five new signature dishes featuring locally-sourced ingredients. The star of our new menu is the Spiced Mango Curry with coconut rice - it's already become a customer favorite!

[If customer shows interest]
Would you like to hear about our limited-time promotion for these new dishes?

[If yes]
Wonderful! For the next two weeks, we're offering 20% off any of our new menu items when you dine in. And if you bring a friend who hasn't tried Foodsters before, you'll both receive a complimentary dessert from our artisan bakery selection.

[If customer asks about other menu items]
We still have all your favorites! Our classic butter chicken and hand-rolled samosas remain on the menu, along with our vegetarian and vegan options. Everything is made fresh daily with authentic spices and techniques.

[If customer asks about hours/location]
We're open Monday through Thursday from 11am to 9pm, and Friday through Sunday from 11am to 10pm. You can find us at 123 Main Street in the downtown area. We also offer online ordering through our website for takeout and delivery.

[Closing]
Would you like me to send you a text message with a link to view our new menu and the special promotion details?

[If yes]
Perfect! I'll send that to this number right away. The promotion code "NEWMENU" will be included in the message - just mention it to your server when you visit.

[If no]
No problem at all. You can always check out our menu and promotions at foodsters.com or follow us on social media @foodsters for the latest updates.

Thank you so much for your time today! We hope to see you at Foodsters soon to try our exciting new dishes. Have a wonderful day!`;

const callScriptSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  script: z.string().min(20, "Script must be at least 20 characters"),
  voiceId: z.string(),
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
      voiceId: "clara",
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

      const response = await fetch("/api/bland-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callType: script.callType,
          phoneNumber: data.phoneNumber,
          businessId: user.uid,
          scriptData: {
            task: script.script,
            voiceId: script.voiceId,
            userId: user.uid,
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

  const importFoodstersDemo = () => {
    form.setValue("name", "Foodsters New Menu Promotion");
    form.setValue("callType", "marketing");
    form.setValue("voiceId", "clara");
    form.setValue("script", foodstersMarketingScript);
    setShowFoodstersDemo(false);
    toast.success("Demo script imported!");
  };

  if (isLoading) return <div>Loading call automation settings...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Call Automation</h2>
      <p className="text-muted-foreground">
        Set up AI-powered calls for your business using Bland AI technology.
      </p>

      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>API Key Required</AlertTitle>
        <AlertDescription>
          To make real calls, add your Bland AI API key to the .env file as
          BLAND_AI_API_KEY and set NEXT_PUBLIC_BASE_URL to your application URL.
          Phone numbers should be in E.164 format (e.g., +14155552671).
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scripts">Call Scripts</TabsTrigger>
          <TabsTrigger value="make-call">Make a Call</TabsTrigger>
          <TabsTrigger value="history">Call History</TabsTrigger>
        </TabsList>

        <TabsContent value="scripts" className="space-y-4">
          <div className="flex justify-between items-center">
            <Button
              onClick={() => setShowFoodstersDemo(!showFoodstersDemo)}
              variant="outline"
            >
              {showFoodstersDemo ? "Hide Demo Script" : "Load Demo Script"}
            </Button>
          </div>

          {showFoodstersDemo && (
            <Card className="border-dashed border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>Foodsters Marketing Script Demo</CardTitle>
                <CardDescription>
                  A professionally designed script for restaurant marketing
                  calls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line mb-4">
                  {foodstersMarketingScript.substring(0, 200)}...
                </p>
                <Button onClick={importFoodstersDemo}>
                  Import This Demo Script
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Create New Call Script</CardTitle>
              <CardDescription>
                Design scripts for your AI voice agent to use during calls.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Script Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Appointment Reminder"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="callType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Call Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select call type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="appointment">
                              Appointment
                            </SelectItem>
                            <SelectItem value="followup">Follow-up</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="voiceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voice</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select voice" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="clara">
                              Clara (Female)
                            </SelectItem>
                            <SelectItem value="james">James (Male)</SelectItem>
                            <SelectItem value="sophia">
                              Sophia (Female)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="script"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Call Script</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Hello, I'm calling from [Business Name] to confirm your appointment..."
                            {...field}
                            className="min-h-[150px]"
                          />
                        </FormControl>
                        <FormDescription>
                          Be natural and conversational. Include variables like
                          [Customer Name] that you'll replace when making calls.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit">Save Call Script</Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {scripts.map((script) => (
              <Card key={script.id}>
                <CardHeader>
                  <CardTitle>{script.name}</CardTitle>
                  <CardDescription>{script.callType} call</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {script.script.substring(0, 100)}...
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      makeCallForm.setValue("scriptId", script.id);
                      setActiveTab("make-call");
                    }}
                  >
                    Use This Script
                  </Button>
                </CardFooter>
              </Card>
            ))}

            {scripts.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    You haven't created any call scripts yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="make-call">
          <Card>
            <CardHeader>
              <CardTitle>Make an AI Call</CardTitle>
              <CardDescription>
                Use your scripts to initiate calls to customers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scripts.length > 0 ? (
                <Form {...makeCallForm}>
                  <form
                    onSubmit={makeCallForm.handleSubmit(handleMakeCall)}
                    className="space-y-4"
                  >
                    <FormField
                      control={makeCallForm.control}
                      name="scriptId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select a Script</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
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
                  <p className="text-muted-foreground mb-4">
                    You need to create a call script before making calls.
                  </p>
                  <Button onClick={() => setActiveTab("scripts")}>
                    Create Your First Script
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
              <CardDescription>
                View records of your past automated calls.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {callHistory.length > 0 ? (
                <div className="space-y-4">
                  {callHistory.map((call) => (
                    <Card key={call.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle className="text-base">
                            {call.phoneNumber}
                          </CardTitle>
                          <span className="text-sm text-muted-foreground">
                            {new Date(call.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <CardDescription>{call.callType} call</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm font-medium mb-1">Transcript:</p>
                        <p className="text-sm text-muted-foreground">
                          {call.transcript || "No transcript available"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  You haven't made any automated calls yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
