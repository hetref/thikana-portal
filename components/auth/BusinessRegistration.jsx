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

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }) => (
  <div className="rounded-2xl border border-gray-200 bg-gray-50/50 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
    {children}
  </div>
);

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
    <div className="space-y-5">
      <form className="space-y-5" onSubmit={handleSignUp}>
        {/* Business Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="animate-element animate-delay-300">
            <label className="text-sm font-medium text-gray-600">Business Name</label>
            <GlassInputWrapper>
              <input 
                name="businessname" 
                type="text" 
                placeholder="Enter your business name" 
                className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-gray-900" 
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </GlassInputWrapper>
          </div>

          <div className="animate-element animate-delay-400">
            <label className="text-sm font-medium text-gray-600">Business Type</label>
            <Select
              value={businessType}
              onValueChange={handleBusinessTypeChange}
            >
              <SelectTrigger className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10 p-4">
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
          </div>
        </div>

        {/* Custom Business Type - Full Width */}
        {businessType === "Other" && (
          <div className="animate-element animate-delay-450">
            <label className="text-sm font-medium text-gray-600">Custom Business Type</label>
            <GlassInputWrapper>
              <input 
                name="customBusinessType" 
                type="text" 
                placeholder="Specify your business type" 
                className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-gray-900" 
                required
                value={customBusinessType}
                onChange={(e) => setCustomBusinessType(e.target.value)}
              />
            </GlassInputWrapper>
          </div>
        )}

        {/* Business Category - Full Width */}
        <div className="animate-element animate-delay-500">
          <label className="text-sm font-medium text-gray-600 mb-2">Business Category</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 rounded-2xl bg-gray-50/50">
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
                className="cursor-pointer text-sm text-gray-700"
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
                className="cursor-pointer text-sm text-gray-700"
              >
                Product-Based Business
              </Label>
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="animate-element animate-delay-600">
            <label className="text-sm font-medium text-gray-600">Mobile Number</label>
            <GlassInputWrapper>
              <input 
                name="phone" 
                type="tel" 
                placeholder="Enter your mobile number" 
                className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-gray-900" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </GlassInputWrapper>
          </div>

          <div className="animate-element animate-delay-700">
            <label className="text-sm font-medium text-gray-600">Email Address</label>
            <GlassInputWrapper>
              <input 
                name="email" 
                type="email" 
                placeholder="Enter your email address" 
                className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-gray-900" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </GlassInputWrapper>
          </div>
        </div>

        {/* PAN Number Section - Full Width */}
        <div className="animate-element animate-delay-800">
          <label className="text-sm font-medium text-gray-600">
            PAN Number <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <GlassInputWrapper>
              <input 
                name="panCard" 
                type="text" 
                placeholder="ABCDE1234F" 
                className={`w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-gray-900 ${panVerified ? "border-green-500" : ""}`} 
                required
                value={panCard}
                onChange={(e) => {
                  setPanCard(e.target.value.toUpperCase());
                  setPanVerified(false);
                }}
                maxLength={10}
              />
            </GlassInputWrapper>
            <button
              type="button"
              onClick={handlePanCheck}
              className={`px-4 py-4 rounded-2xl font-medium transition-colors ${
                panVerified 
                  ? "border border-green-500 text-green-600 bg-green-50" 
                  : "bg-black text-white hover:bg-gray-800"
              }`}
              disabled={isPanVerifying || !panCard || panCard.length !== 10}
            >
              {isPanVerifying
                ? "Verifying..."
                : panVerified
                  ? "Verified"
                  : "CHECK"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Please enter your 10-character PAN Card number
          </p>
        </div>

        {/* Personal Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="animate-element animate-delay-900">
            <label className="text-sm font-medium text-gray-600">First Name</label>
            <GlassInputWrapper>
              <input 
                name="firstname" 
                type="text" 
                placeholder="Enter your first name" 
                className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-gray-900" 
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </GlassInputWrapper>
          </div>

          <div className="animate-element animate-delay-1000">
            <label className="text-sm font-medium text-gray-600">Last Name</label>
            <GlassInputWrapper>
              <input 
                name="lastname" 
                type="text" 
                placeholder="Enter your last name" 
                className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-gray-900" 
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </GlassInputWrapper>
          </div>
        </div>

        {/* Password Section - Full Width */}
        <div className="animate-element animate-delay-1100">
          <label className="text-sm font-medium text-gray-600">Password</label>
          <GlassInputWrapper>
            <div className="relative">
              <input 
                name="password" 
                type={passwordShow ? 'text' : 'password'} 
                placeholder="Enter your password" 
                className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-gray-900" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                onClick={() => setPasswordShow(!passwordShow)} 
                className="absolute inset-y-0 right-3 flex items-center"
              >
                {passwordShow ? <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" /> : <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />}
              </button>
            </div>
          </GlassInputWrapper>
        </div>

        <button 
          type="submit" 
          className="animate-element animate-delay-1200 w-full rounded-2xl bg-black py-4 font-medium text-white hover:bg-gray-800 transition-colors"
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
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Registering...
            </div>
          ) : (
            "Register Business"
          )}
        </button>
      </form>

      <div className="animate-element animate-delay-1300 text-center space-y-2">
        <p className="text-sm text-gray-600">
          Want to join as User?{" "}
          <Link
            href="/register"
            className="text-violet-600 hover:underline transition-colors"
          >
            Register as User
          </Link>
        </p>
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-violet-600 hover:underline transition-colors"
          >
            Login
          </Link>
        </p>
      </div>

      <div className="text-balance text-center text-xs text-gray-500 [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-violet-600">
        By clicking continue, you agree to our{" "}
        <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
};

export default BusinessRegistration;
