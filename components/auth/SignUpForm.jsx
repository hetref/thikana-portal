"use client";

import React from "react";
import classNames from "classnames";
import { redirect, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { getDoc, setDoc } from "firebase/firestore";
import { doc } from "firebase/firestore";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { ref, set } from "firebase/database";

export function SignUpForm({ className, ...props }) {
  const [isLoading, setIsLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [passwordShow, setPasswordShow] = useState(false);

  const router = useRouter();

  // Register Details:
  // 1. First Name
  // 2. Last Name
  // 3. Phone
  // 4. Email
  // 5. Password

  const fetchUserData = async (uid) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    return docSnap.exists() ? docSnap.data() : null;
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);

      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider).then(async (result) => {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const token = credential.accessToken;
          const user = result.user;
          const uid = user.uid;

          console.log("User signed in with Google:", user, token);

          const prevDoc = await fetchUserData(uid);
          console.log("PREVDOC", prevDoc);
          if (prevDoc) {
            redirect("/feed");
          }
          await setDoc(doc(db, "users", uid), {
            name: user.displayName || "",
            email: user.email,
            phone: user.phone || "",
            role: "user",
            username: `${user.displayName.split(" ").join("-").toLowerCase()}-${
              Math.floor(Math.random() * 90000) + 10000
            }`,
            createdAt: new Date(),
            profilePic: user.photoURL,
            uid: uid,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
            .then(() => {
              redirect("/feed");
            })
            .catch((error) => {
              console.log("GERROR", error);
              throw new Error(
                "User signed in with Google, but data not added in DB."
              );
            });
        });
      } catch (error) {
        console.error("Google Sign In Error:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error signing up with Google:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    console.log("Signing up...");
    setIsLoading(true);

    await createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const uid = userCredential.user.uid;
        console.log("User created and signed in:", userCredential, uid);
        await setDoc(doc(db, "users", userCredential.user.uid), {
          name: firstName + " " + lastName,
          email: email,
          phone: phone,
          role: "user",
          username: `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${
            Math.floor(Math.random() * 90000) + 10000
          }`,
          createdAt: new Date(),
          profilePic: "https://via.placeholder.com/600x600",
          uid: uid,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignIn: new Date(),
        });
        router.push("/feed");
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;

        console.log(errorCode, errorMessage);
        if (errorCode === "auth/email-already-in-use") {
          alert("Email already in use! Please use a different email.");
        } else if (errorCode === "auth/weak-password") {
          alert("Password should be at least 6 characters long!");
        } else {
          alert(errorMessage);
        }
        setIsLoading(false);
      });
  };

  return (
    <div className={classNames("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign Up with your Google account</CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignUp}
                  disabled={isLoading}
                  type="button"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading...
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mr-2 h-4 w-4"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Sign Up with Google
                    </>
                  )}
                </Button>
                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                  <span className="relative z-10 bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="firstname">First Name</Label>
                    <Input
                      id="firstname"
                      type="text"
                      placeholder="First Name"
                      required
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
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
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
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <div className="absolute right-2 top-0 bottom-0 flex items-center">
                        <Button
                          onClick={() => setPasswordShow(!passwordShow)}
                          variant="ghost"
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
                  Have an account?{" "}
                  <Link href="/login" className="underline underline-offset-4">
                    Login
                  </Link>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
