"use client";
import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Phone } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export default function RequestCallButton({ businessId, businessName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [callTypes, setCallTypes] = useState([]);
  const [scripts, setScripts] = useState({});
  const [selectedCallType, setSelectedCallType] = useState("");
  const [onCooldown, setOnCooldown] = useState(false);
  const [cooldownTimeRemaining, setCooldownTimeRemaining] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneNumberError, setPhoneNumberError] = useState("");
  const [hasScripts, setHasScripts] = useState(false);
  const router = useRouter();
  const user = auth.currentUser;

  // Function to validate E.164 format
  const validatePhoneNumberE164 = (number) => {
    // Basic E.164 validation: starts with +, followed by digits only, reasonable length
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(number);
  };

  useEffect(() => {
    const fetchCallTypes = async () => {
      if (!businessId) return;

      try {
        // First fetch the call types
        const callTypesRef = collection(db, "users", businessId, "callTypes");
        const typesSnapshot = await getDocs(callTypesRef);

        const types = typesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Then fetch scripts for each type
        const scriptsRef = collection(db, "users", businessId, "callScripts");
        const scriptsSnapshot = await getDocs(scriptsRef);

        // Create a map of callTypeId -> scriptId
        const scriptsMap = {};
        let scriptsFound = false;

        scriptsSnapshot.docs.forEach((doc) => {
          const scriptData = doc.data();
          if (scriptData.callTypeId) {
            scriptsMap[scriptData.callTypeId] = doc.id;
            scriptsFound = true;
          }
        });

        setCallTypes(types);
        setScripts(scriptsMap);
        setHasScripts(scriptsFound);

        // Select first call type if available
        if (types.length > 0) {
          setSelectedCallType(types[0].id);
        }
      } catch (error) {
        console.error("Error fetching call types:", error);
      }
    };

    fetchCallTypes();
  }, [businessId]);

  // Check cooldown status when component mounts
  useEffect(() => {
    checkCooldown();
  }, [user, businessId]);

  // Separate the checkCooldown function to call it after making a request
  const checkCooldown = async () => {
    if (!user || !businessId) return;

    try {
      // Query for recent call requests
      const requestCallsRef = collection(
        db,
        "users",
        businessId,
        "requestCalls"
      );
      const q = query(requestCallsRef, where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Sort by timestamp to get the most recent request
        const requests = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => b.requestedAt.toMillis() - a.requestedAt.toMillis());

        const latestRequest = requests[0];
        const requestTime = latestRequest.requestedAt.toMillis();
        const currentTime = Date.now();
        const sixHoursInMs = 6 * 60 * 60 * 1000;

        if (currentTime - requestTime < sixHoursInMs) {
          // User is on cooldown
          setOnCooldown(true);
          const remainingTime = sixHoursInMs - (currentTime - requestTime);
          setCooldownTimeRemaining(Math.ceil(remainingTime / (60 * 60 * 1000)));
        } else {
          setOnCooldown(false);
        }
      } else {
        setOnCooldown(false);
      }
    } catch (error) {
      console.error("Error checking cooldown:", error);
    }
  };

  // Fetch user's phone number when dialog opens
  useEffect(() => {
    const fetchUserPhone = async () => {
      if (!user || !isOpen) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.phone) {
            setPhoneNumber(userData.phone);
            // Validate the phone number
            if (!validatePhoneNumberE164(userData.phone)) {
              setPhoneNumberError(
                "Your phone number is not in E.164 format (e.g., +1234567890). Please update it in your profile."
              );
            } else {
              setPhoneNumberError("");
            }
          } else {
            setPhoneNumberError(
              "No phone number found in your profile. Please add one to receive calls."
            );
          }
        }
      } catch (error) {
        console.error("Error fetching user phone number:", error);
      }
    };

    fetchUserPhone();
  }, [user, isOpen]);

  const handleRequestCall = async () => {
    if (!user) {
      toast.error("Please sign in to request a call");
      router.push("/login");
      return;
    }

    if (!selectedCallType) {
      toast.error("Please select a call type");
      return;
    }

    // Check if there's a script for this call type
    const scriptId = scripts[selectedCallType];
    if (!scriptId) {
      toast.error(
        "No script is configured for this call type. Please try another one or contact the business."
      );
      return;
    }

    // Validate phone number
    if (!phoneNumber) {
      toast.error("Please add a phone number to your profile to receive calls");
      return;
    }

    if (!validatePhoneNumberE164(phoneNumber)) {
      toast.error(
        "Your phone number must be in E.164 format (e.g., +1234567890). Please update it in your profile."
      );
      return;
    }

    setIsLoading(true);
    try {
      // Get the user's data
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      // Get the selected call type
      const selectedTypeObj = callTypes.find(
        (type) => type.id === selectedCallType
      );

      // Get business data to check for Twilio number
      const businessDoc = await getDoc(doc(db, "users", businessId));
      const businessData = businessDoc.exists() ? businessDoc.data() : {};
      const twilioNumber = businessData.twilioNumber || "+12344145236"; // Use default if not set

      // Create the request call entry
      const requestId = `${user.uid}_${Date.now()}`;
      await setDoc(doc(db, "users", businessId, "requestCalls", requestId), {
        userId: user.uid,
        userName: userData.name || "Unknown User",
        userPhone: phoneNumber,
        userEmail: userData.email || user.email || "",
        businessId: businessId,
        callTypeId: selectedCallType,
        callTypeName: selectedTypeObj.name,
        callType: selectedTypeObj.typeId,
        scriptId: scriptId,
        requestedAt: Timestamp.now(),
        status: "pending",
        autoProcessing: true,
        callerNumber: twilioNumber, // Store the Twilio number that should be used
      });

      // Automatically trigger the call
      try {
        const autoCallResponse = await fetch(
          "/api/bland-ai/auto-call-handler",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId: requestId,
              businessId: businessId,
            }),
          }
        );

        if (!autoCallResponse.ok) {
          console.warn(
            "Auto-call system will retry later:",
            await autoCallResponse.text()
          );
        }
      } catch (autoCallError) {
        console.error("Error automatically initiating call:", autoCallError);
      }

      // Immediately update cooldown status - don't wait for reload
      setOnCooldown(true);
      setCooldownTimeRemaining(6); // 6 hours

      toast.success("Call requested and will be made shortly!");
      setIsOpen(false);
    } catch (error) {
      console.error("Error requesting call:", error);
      toast.error("Failed to request call. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (callTypes.length === 0 || !hasScripts) {
    return null; // Don't show button if business has no call types or scripts
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-1"
          disabled={onCooldown}
        >
          <Phone className="w-4 h-4" />
          {onCooldown
            ? `Request again in ${cooldownTimeRemaining}h`
            : "Request a Call"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a Call from {businessName}</DialogTitle>
          <DialogDescription>
            Select the type of call you'd like to receive from this business.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Your Phone Number</Label>
            <Input
              id="phoneNumber"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (!validatePhoneNumberE164(e.target.value)) {
                  setPhoneNumberError(
                    "Phone number must be in E.164 format (e.g., +1234567890)"
                  );
                } else {
                  setPhoneNumberError("");
                }
              }}
              className={phoneNumberError ? "border-red-500" : ""}
            />
            {phoneNumberError && (
              <p className="text-xs text-red-500">{phoneNumberError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Please ensure your phone number is in E.164 format (e.g.,
              +1234567890).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="callType">Call Type</Label>
            <Select
              value={selectedCallType}
              onValueChange={setSelectedCallType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select call type" />
              </SelectTrigger>
              <SelectContent>
                {callTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                    {type.description ? (
                      <span className="text-muted-foreground text-xs block ml-1">
                        {type.description}
                      </span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleRequestCall}
            disabled={
              isLoading ||
              !selectedCallType ||
              !phoneNumber ||
              Boolean(phoneNumberError)
            }
          >
            {isLoading ? "Requesting..." : "Request Call"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
