import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { setDoc } from "firebase/firestore";
import { doc } from "firebase/firestore";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BusinessRegistration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPanVerifying, setIsPanVerifying] = useState(false);
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordShow, setPasswordShow] = useState(false);
  const [businessType, setBusinessType] = useState("");
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [businessCategories, setBusinessCategories] = useState([]);
  const [panCard, setPanCard] = useState("");
  const [panVerified, setPanVerified] = useState(false);
  const [panDetails, setPanDetails] = useState(null);

  const router = useRouter();

  const businessTypes = [
    "Retail",
    "Restaurant",
    "Salon",
    "Grocery",
    "Electronics",
    "Clothing",
    "Healthcare",
    "Education",
    "Fitness",
    "Technology",
    "Professional Services",
    "Other",
  ];

  const handleBusinessTypeChange = (value) => {
    setBusinessType(value);
    if (value !== "Other") {
      setCustomBusinessType("");
    }
  };

  const handlePanCheck = async () => {
    if (!panCard || panCard.length !== 10) {
      toast.error("Please enter a valid 10-character PAN number");
      return;
    }

    setIsPanVerifying(true);
    try {
      // First, get the access token
      const authResponse = await fetch("/api/authorize-deepvue", {
        method: "POST",
      });

      if (!authResponse.ok) {
        throw new Error("Failed to get authorization token");
      }

      const authData = await authResponse.json();

      // Now use the token to verify PAN
      const verifyResponse = await fetch("/api/pan-udyam-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pan_number: panCard,
          ACCESS_TOKEN: authData.access_token,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify PAN");
      }

      const verifyData = await verifyResponse.json();

      if (
        !verifyData.data?.udyam_exists ||
        verifyData.data?.pan_details?.status !== "valid"
      ) {
        toast.error(
          "The PAN number is not associated with a valid UDYAM registration"
        );
        setPanVerified(false);
        return;
      }

      // Store relevant details
      setPanDetails({
        dob: verifyData.data.pan_details.dob,
        gender: verifyData.data.pan_details.gender,
        fullName: verifyData.data.pan_details.full_name,
      });

      setPanVerified(true);
      toast.success(verifyData.message || "PAN verified successfully");
    } catch (error) {
      console.error("PAN verification error:", error);
      toast.error("Failed to verify PAN number. Please try again.");
      setPanVerified(false);
    } finally {
      setIsPanVerifying(false);
    }
  };

  const handleBusinessCategoryChange = (category) => {
    if (businessCategories.includes(category)) {
      setBusinessCategories(
        businessCategories.filter((item) => item !== category)
      );
    } else {
      setBusinessCategories([...businessCategories, category]);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!panVerified) {
      toast.error("Please verify your PAN number before registering");
      setIsLoading(false);
      return;
    }

    // Determine the final business type to save
    const finalBusinessType =
      businessType === "Other" && customBusinessType
        ? customBusinessType
        : businessType;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = userCredential.user.uid;

      const username = `${businessName.toLowerCase()}-${
        Math.floor(Math.random() * 90000) + 10000
      }`;

      const businessData = {
        businessName,
        business_type: finalBusinessType,
        business_categories: businessCategories,
        name: firstName + " " + lastName,
        email,
        phone,
        role: "business",
        username,
        profilePic:
          "https://firebasestorage.googleapis.com/v0/b/recommendation-system-62a42.appspot.com/o/assets%2Favatar.png?alt=media&token=7782c79f-c178-4b02-8778-bb3b93965aa5",
        uid,
        plan: "free",
        panCard,
        panVerified: true,
        panDetails,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignIn: new Date(),
      };

      const business = {
        businessName,
        business_type: finalBusinessType,
        business_categories: businessCategories,
        adminName: firstName + " " + lastName,
        email,
        phone,
        plan: "free",
        username,
        adminId: uid,
        panCard,
        panVerified: true,
        panDetails,
        createdAt: new Date(),
      };

      await Promise.all([
        setDoc(doc(db, "users", uid), businessData),
        setDoc(doc(db, "businesses", uid), business),
      ]);

      toast.success("Registration successful!");
      router.push("/map");
    } catch (error) {
      const { code, message } = error;
      console.error(code, message);

      if (code === "auth/email-already-in-use") {
        toast.error("Email already in use! Please use a different email.");
      } else if (code === "auth/weak-password") {
        toast.error("Password should be at least 6 characters long!");
      } else {
        toast.error(message);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-xl md:text-3xl font-extrabold text-gray-900">
            Business Registration
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Register your business with Thikana
          </p>
        </div>
        <form className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-4">
            {/* Business Name */}
            <div>
              <Label
                htmlFor="businessname"
                className="block text-sm font-medium"
              >
                Business Name
              </Label>
              <Input
                id="businessname"
                type="text"
                placeholder="Enter your business name"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Business Type with Dropdown */}
            <div>
              <Label
                htmlFor="businessType"
                className="block text-sm font-medium"
              >
                Business Type
              </Label>
              <Select
                value={businessType}
                onValueChange={handleBusinessTypeChange}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {businessType === "Other" && (
                <Input
                  id="customBusinessType"
                  type="text"
                  placeholder="Specify your business type"
                  required
                  value={customBusinessType}
                  onChange={(e) => setCustomBusinessType(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Business Category */}
            <div>
              <Label className="block text-sm font-medium mb-2">
                Business Category
              </Label>
              <div className="space-y-2 p-4 border rounded-md">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="serviceBasedBusiness"
                    checked={businessCategories.includes("service")}
                    onCheckedChange={() =>
                      handleBusinessCategoryChange("service")
                    }
                  />
                  <Label
                    htmlFor="serviceBasedBusiness"
                    className="cursor-pointer text-sm"
                  >
                    Service-Based Business
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="productBasedBusiness"
                    checked={businessCategories.includes("product")}
                    onCheckedChange={() =>
                      handleBusinessCategoryChange("product")
                    }
                  />
                  <Label
                    htmlFor="productBasedBusiness"
                    className="cursor-pointer text-sm"
                  >
                    Product-Based Business
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="realEstateBasedBusiness"
                    checked={businessCategories.includes("real-estate")}
                    onCheckedChange={() =>
                      handleBusinessCategoryChange("real-estate")
                    }
                  />
                  <Label
                    htmlFor="realEstateBasedBusiness"
                    className="cursor-pointer text-sm"
                  >
                    Real Estate-Based Business
                  </Label>
                </div>
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <Label htmlFor="phone" className="block text-sm font-medium">
                Mobile Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 1234567890"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* PAN Number with Check Button */}
            <div>
              <Label htmlFor="panCard" className="block text-sm font-medium">
                PAN Number <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="panCard"
                  type="text"
                  placeholder="ABCDE1234F"
                  required
                  value={panCard}
                  onChange={(e) => {
                    setPanCard(e.target.value.toUpperCase());
                    setPanVerified(false);
                  }}
                  maxLength={10}
                  className={`mt-1 ${panVerified ? "border-green-500" : ""}`}
                />
                <Button
                  type="button"
                  onClick={handlePanCheck}
                  className="mt-1 whitespace-nowrap"
                  variant={panVerified ? "outline" : "default"}
                  disabled={isPanVerifying || !panCard || panCard.length !== 10}
                >
                  {isPanVerifying
                    ? "Verifying..."
                    : panVerified
                      ? "Verified"
                      : "CHECK"}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Please enter your 10-character PAN Card number
              </p>
            </div>

            {/* First Name */}
            <div>
              <Label htmlFor="firstname" className="block text-sm font-medium">
                First Name
              </Label>
              <Input
                id="firstname"
                type="text"
                placeholder="Enter your first name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Last Name */}
            <div>
              <Label htmlFor="lastname" className="block text-sm font-medium">
                Last Name
              </Label>
              <Input
                id="lastname"
                type="text"
                placeholder="Enter your last name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="block text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="block text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={passwordShow ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setPasswordShow(!passwordShow)}
                  className="absolute right-2 top-[6px] p-1"
                >
                  {passwordShow ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              onClick={handleSignUp}
              className="w-full"
              disabled={
                !businessName ||
                !firstName ||
                !lastName ||
                !phone ||
                !email ||
                !password ||
                !panCard ||
                panCard.length !== 10 ||
                isLoading
              }
            >
              {isLoading ? "Registering..." : "Register Business"}
            </Button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Want to join as User?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:text-primary/80"
              >
                Register as User
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:text-primary/80"
              >
                Login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BusinessRegistration;
