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

const BusinessRegistration = () => {
  const [isLoading, setIsLoading] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordShow, setPasswordShow] = useState(false);
  const [businessType, setBusinessType] = useState("");

  const router = useRouter();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = userCredential.user.uid;
      const businessData = {
        businessName,
        business_type: businessType,
        name: firstName + " " + lastName,
        email,
        phone,
        role: "business",
        username: `${businessName.toLowerCase()}-${
          Math.floor(Math.random() * 90000) + 10000
        }`,
        profilePic:
          "https://firebasestorage.googleapis.com/v0/b/recommendation-system-62a42.appspot.com/o/assets%2Favatar.png?alt=media&token=7782c79f-c178-4b02-8778-bb3b93965aa5",
        uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignIn: new Date(),
      };
      const business = {
        businessName,
        business_type: businessType,
        adminName: firstName + " " + lastName,
        email,
        phone,
        plan: "free",
        username: `${businessName.toLowerCase()}-${
          Math.floor(Math.random() * 90000) + 10000
        }`,
        adminId: uid,
        createdAt: new Date(),
      };

      await Promise.all([
        setDoc(doc(db, "users", uid), businessData),
        setDoc(doc(db, "businesses", uid), business),
      ]);
      router.push("/feed");
    } catch (error) {
      const { code, message } = error;
      console.error(code, message);
      if (code === "auth/email-already-in-use") {
        alert("Email already in use! Please use a different email.");
      } else if (code === "auth/weak-password") {
        alert("Password should be at least 6 characters long!");
      } else {
        alert(message);
      }
      setIsLoading(false);
    }
  };

  return (
    <form>
      <div className="grid gap-6">
        <div className="flex flex-col gap-4">
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="businesname">Business Name</Label>
              <Input
                id="businesname"
                type="text"
                placeholder="Business Name"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Input
                id="businessType"
                type="text"
                placeholder="Business Type"
                required
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="firstname">First Name</Label>
              <Input
                id="firstname"
                type="text"
                placeholder="First Name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lastname">Last Name</Label>
              <Input
                id="lastname"
                type="text"
                placeholder="Last Name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 1234567890"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={passwordShow ? "text" : "password"}
                  placeholder="* * * * * *"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <div className="absolute right-2 top-0 bottom-0 flex items-center">
                  <Button
                    onClick={() => setPasswordShow(!passwordShow)}
                    variant="ghost"
                    type="button"
                  >
                    {passwordShow ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              onClick={handleSignUp}
              className="w-full"
              disabled={
                !firstName ||
                !lastName ||
                !phone ||
                !email ||
                !password ||
                isLoading
              }
            >
              Sign Up
            </Button>
          </div>
          <div className="text-center text-sm">
            Wanna join as User?{" "}
            <Link href="/register" className="underline underline-offset-4">
              Register as User
            </Link>
          </div>
          <div className="text-center text-sm">
            Have an account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Login
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
};

export default BusinessRegistration;
