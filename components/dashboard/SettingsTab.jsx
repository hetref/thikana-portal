"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  Copy,
  AlertCircle,
  KeyRound,
  LinkIcon,
  Shield,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Separator } from "@/components/ui/separator";
import Loader from "@/components/Loader";


export default function SettingsTab() {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [hasWebhook, setHasWebhook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [decryptedSecret, setDecryptedSecret] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserId(currentUser.uid);
        const baseUrl = window.location.origin;
        setWebhookUrl(`${baseUrl}/api/razorpay-webhook/${currentUser.uid}`);
        checkWebhookStatus(currentUser.uid);
      } else {
        setUser(null);
        setUserId("");
        setWebhookUrl("");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const checkWebhookStatus = async (uid) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const hasSecret =
          userData.razorpayInfo && userData.razorpayInfo.webhookSecret;
        setHasWebhook(hasSecret ? true : false);

        // If there's a webhook secret, get it directly
        if (hasSecret) {
          setIsDecrypting(true);
          try {
            // Store the secret directly (no decryption needed)
            const secretValue = userData.razorpayInfo.webhookSecret;
            setDecryptedSecret(secretValue);
          } catch (error) {
            console.error("Error retrieving webhook secret:", error);
            toast.error("Failed to retrieve the webhook secret");
          } finally {
            setIsDecrypting(false);
          }
        }
      }
    } catch (error) {
      console.error("Error checking webhook status:", error);
    }
  };

  const handleWebhookSecretSave = async () => {
    if (!webhookSecret.trim()) {
      toast.error("Please enter a webhook secret");
      return;
    }

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setIsSaving(true);

    try {
      // Store the webhook secret directly without encryption
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const razorpayInfo = userData.razorpayInfo || {};

        // Update the user document with the webhook secret
        await updateDoc(userDocRef, {
          razorpayInfo: {
            ...razorpayInfo,
            webhookSecret: webhookSecret, // Store directly without encryption
          },
        });

        toast.success("Webhook secret saved successfully");
        setHasWebhook(true);
        setDecryptedSecret(webhookSecret); // Store for display
        setWebhookSecret("");
      } else {
        toast.error("User document not found");
      }
    } catch (error) {
      console.error("Error saving webhook secret:", error);
      toast.error("Failed to save webhook secret");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Webhook URL copied to clipboard");
  };

  const testWebhook = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    toast.loading("Testing webhook connection...");

    try {
      const testPayload = {
        testTimestamp: new Date().toISOString(),
        testMessage: "This is a test webhook from Thikana",
      };

      const response = await fetch(`/api/razorpay-webhook-test/${user.uid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": "test-signature-not-valid", // This won't pass verification but helps test the endpoint
        },
        body: JSON.stringify(testPayload),
      });

      const result = await response.json();
      toast.dismiss();

      if (response.ok) {
        toast.success("Webhook endpoint is accessible");
        console.log("Webhook test result:", result);
      } else {
        toast.error(`Webhook test failed: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(`Error testing webhook: ${error.message}`);
      console.error("Error testing webhook:", error);
    }
  };

  const toggleSecretVisibility = () => {
    setShowSecret(!showSecret);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Shield className="mr-2 h-5 w-5 text-primary" />
            Razorpay Webhook Configuration
          </CardTitle>
          <CardDescription>
            Configure webhooks to receive real-time payment and subscription
            updates from Razorpay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Webhook Status */}
          <div className="flex items-center p-4 rounded-md bg-muted">
            <div className="flex-1">
              <h3 className="font-medium">Webhook Status</h3>
              <p className="text-sm text-muted-foreground">
                {hasWebhook
                  ? "Webhook is configured and active"
                  : "Webhook is not configured yet"}
              </p>
            </div>
            <div>
              {hasWebhook ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
            </div>
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Your Webhook URL</Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="webhook-url"
                  value={webhookUrl}
                  className="pl-10"
                  readOnly
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                className={copied ? "text-green-500" : ""}
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" onClick={testWebhook}>
                Test Endpoint
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this URL in your Razorpay dashboard to set up webhooks
            </p>
          </div>

          {/* Webhook Secret */}
          <div className="space-y-2 pt-4">
            <Label htmlFor="webhook-secret">
              {hasWebhook ? "Update Webhook Secret" : "Enter Webhook Secret"}
            </Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="webhook-secret"
                  type={showSecret ? "text" : "password"}
                  placeholder={
                    hasWebhook
                      ? "Enter new webhook secret"
                      : "Your Razorpay webhook secret"
                  }
                  className="pl-10"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                />
              </div>
              {hasWebhook && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={toggleSecretVisibility}
                >
                  {showSecret ? "Hide Secret" : "Show Secret"}
                </Button>
              )}
              <Button onClick={handleWebhookSecretSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save Secret"
                )}
              </Button>
            </div>
            {hasWebhook && !isDecrypting && (
              <div className="mt-2 text-sm">
                <span className="font-medium">Current Secret: </span>
                {showSecret
                  ? decryptedSecret
                  : `${decryptedSecret.substring(0, 3)}${"•".repeat(8)}${decryptedSecret.substring(decryptedSecret.length - 3)}`}
              </div>
            )}
            {isDecrypting && (
              <div className="mt-2 text-sm flex items-center">
                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                Loading current secret...
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {hasWebhook
                ? "To update your webhook, enter a new secret above and save it"
                : "After setting up your webhook in Razorpay, enter the webhook secret here to verify incoming requests"}
            </p>
          </div>

          <Separator className="my-6" />

          {/* Setup Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Webhook Setup Instructions</h3>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="step1">
                <AccordionTrigger className="text-base font-medium">
                  <div className="flex items-center">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">
                      1
                    </div>
                    Access Razorpay Dashboard
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-8">
                  <p className="mb-2">
                    Log in to your Razorpay Dashboard and navigate to:
                  </p>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    Settings &gt; API Keys &gt; Webhooks &gt; Add New Webhook
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step2">
                <AccordionTrigger className="text-base font-medium">
                  <div className="flex items-center">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">
                      2
                    </div>
                    Enter Webhook URL
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-8">
                  <p className="mb-2">
                    Copy your unique webhook URL from above and paste it in the
                    URL field:
                  </p>
                  <div className="p-3 bg-muted rounded-md text-sm mb-2 break-all">
                    {webhookUrl}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This URL is unique to your account and will receive all
                    webhook events from Razorpay.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step3">
                <AccordionTrigger className="text-base font-medium">
                  <div className="flex items-center">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">
                      3
                    </div>
                    Configure Required Events
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-8">
                  <p className="mb-3">
                    Select the following events to receive important
                    notifications:
                  </p>

                  <h4 className="font-medium mb-2">Payment Events:</h4>
                  <ul className="list-disc pl-5 mb-4 space-y-1 text-sm">
                    <li>payment.authorized</li>
                    <li>payment.captured</li>
                    <li>payment.failed</li>
                    <li>payment.refunded</li>
                  </ul>

                  <h4 className="font-medium mb-2">Subscription Events:</h4>
                  <ul className="list-disc pl-5 mb-4 space-y-1 text-sm">
                    <li>subscription.authenticated</li>
                    <li>subscription.activated</li>
                    <li>subscription.charged</li>
                    <li>subscription.halted</li>
                    <li>subscription.cancelled</li>
                    <li>subscription.completed</li>
                  </ul>

                  <h4 className="font-medium mb-2">Payment Link Events:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>payment_link.paid</li>
                    <li>payment_link.expired</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step4">
                <AccordionTrigger className="text-base font-medium">
                  <div className="flex items-center">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">
                      4
                    </div>
                    Set Webhook Secret
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-8">
                  <p className="mb-2">
                    Create a strong webhook secret in Razorpay:
                  </p>
                  <ol className="list-decimal pl-5 mb-4 space-y-2 text-sm">
                    <li>
                      Generate a strong webhook secret (at least 16 characters
                      recommended)
                    </li>
                    <li>
                      Add this secret to your webhook configuration in Razorpay
                    </li>
                    <li>
                      Copy the same secret and paste it in the "Enter Webhook
                      Secret" field above
                    </li>
                    <li>
                      Click "Save Secret" to securely store your webhook secret
                    </li>
                  </ol>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      Your webhook secret is used to verify that requests are
                      coming from Razorpay. Keep this secret secure and never
                      share it publicly.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step5">
                <AccordionTrigger className="text-base font-medium">
                  <div className="flex items-center">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">
                      5
                    </div>
                    Test Your Webhook
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-8">
                  <p className="mb-3">
                    After saving your webhook configuration:
                  </p>
                  <ol className="list-decimal pl-5 mb-4 space-y-2 text-sm">
                    <li>
                      Click on the "Test" button in Razorpay's webhook
                      configuration
                    </li>
                    <li>
                      If everything is set up correctly, you should see a
                      successful response
                    </li>
                    <li>
                      Your webhook is now ready to receive events from Razorpay
                    </li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">
              Troubleshooting Webhook Issues
            </h3>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="issue1">
                <AccordionTrigger className="text-base font-medium">
                  "Signature verification failed" error
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p>This is the most common webhook issue. To fix it:</p>
                  <ol className="list-decimal pl-6 space-y-2 text-sm">
                    <li>
                      Verify that you've entered the exact same webhook secret
                      in Razorpay and in this application
                    </li>
                    <li>
                      Make sure there are no extra spaces or special characters
                      in your webhook secret
                    </li>
                    <li>
                      Try regenerating the webhook secret in Razorpay and
                      updating it here
                    </li>
                    <li>
                      Check that the secret is at least 16 characters long for
                      security
                    </li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="issue2">
                <AccordionTrigger className="text-base font-medium">
                  Webhooks not being received
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p>If Razorpay is not sending events to your webhook:</p>
                  <ol className="list-decimal pl-6 space-y-2 text-sm">
                    <li>
                      Verify that your site is accessible from the internet
                    </li>
                    <li>
                      Check if you're using a local development environment -
                      webhooks need a public URL
                    </li>
                    <li>
                      Make sure you've selected the correct events in Razorpay's
                      webhook settings
                    </li>
                    <li>
                      Check Razorpay's webhook logs in their dashboard for any
                      delivery failures
                    </li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="issue3">
                <AccordionTrigger className="text-base font-medium">
                  Testing webhooks locally
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p>To test webhooks in a local development environment:</p>
                  <ol className="list-decimal pl-6 space-y-2 text-sm">
                    <li>
                      Use a service like ngrok or localtunnel to expose your
                      local server
                    </li>
                    <li>
                      Set the webhook URL to your ngrok/localtunnel URL in
                      Razorpay
                    </li>
                    <li>
                      Use Razorpay's test button to send test events to your
                      webhook
                    </li>
                    <li>
                      Check your server logs for any errors processing the
                      webhook
                    </li>
                  </ol>
                  <p className="text-sm text-muted-foreground mt-2">
                    Note: For production, always use a proper domain with HTTPS.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 flex justify-between">
          <p className="text-sm text-muted-foreground">
            Need more help? Check Razorpay's{" "}
            <a
              href="https://razorpay.com/docs/webhooks/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center"
            >
              webhook documentation
              <ChevronRight className="h-3 w-3 ml-1" />
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
