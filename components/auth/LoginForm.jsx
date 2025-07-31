"use client";

import React from "react";
import classNames from "classnames";
import { redirect, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Eye, EyeOff } from 'lucide-react';
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import Image from "next/image";

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
    </svg>
);

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }) => (
  <div className="rounded-2xl border border-gray-200 bg-gray-50/50 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
    {children}
  </div>
);

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogleSignIn = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        console.log("User signed in with Google:", result.user);
        router.push("/feed");
      } catch (error) {
        console.error("Google Sign In Error:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    console.log("Signing up...", email, password);
    setIsLoading(true);

    await signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in
        const user = userCredential.user;
        // ...
        console.log("User signed in:", user);
        toast.success("Signed in successfully");
        router.push("/feed");
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorCode, errorMessage);
        toast.error("Error signing in");
      });
  };

  const handleResetPassword = () => {
    // Handle password reset
    console.log("Reset password clicked");
  };

  return (
    <div className="space-y-5">
      <form className="space-y-5" onSubmit={handleLogin}>
        <div className="animate-element animate-delay-300">
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

        <div className="animate-element animate-delay-400">
          <label className="text-sm font-medium text-gray-600">Password</label>
          <GlassInputWrapper>
            <div className="relative">
              <input 
                name="password" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Enter your password" 
                className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-gray-900" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute inset-y-0 right-3 flex items-center"
              >
                {showPassword ? <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" /> : <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />}
              </button>
            </div>
          </GlassInputWrapper>
        </div>

        <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="rememberMe" className="custom-checkbox" />
            <span className="text-gray-700">Keep me signed in</span>
          </label>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); handleResetPassword(); }} 
            className="hover:underline text-violet-600 transition-colors"
          >
            Reset password
          </a>
        </div>

        <button 
          type="submit" 
          className="animate-element animate-delay-600 w-full rounded-2xl bg-black py-4 font-medium text-white hover:bg-black transition-colors"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Loading...
            </div>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="animate-element animate-delay-700 relative flex items-center justify-center">
        <span className="w-full border-t border-gray-200"></span>
        <span className="px-4 text-sm text-gray-500 bg-white absolute">Or continue with</span>
      </div>

      <button 
        onClick={handleGoogleSignIn} 
        className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-gray-200 rounded-2xl py-4 hover:bg-gray-50 transition-colors text-gray-700"
        disabled={isLoading}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <p className="animate-element animate-delay-900 text-center text-sm text-gray-600">
        New to our platform? <a href="/register" className="text-violet-600 hover:underline transition-colors">Create Account</a>
      </p>

      <div className="text-balance text-center text-xs text-gray-500 [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-violet-600">
        By clicking continue, you agree to our{" "}
        <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
