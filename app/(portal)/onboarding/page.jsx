"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { redirec, useRoutert } from "next/navigation";
import React, { useEffect, useState } from "react";

const OnboardingUserPage = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const handleUpdateData = async (e) => {
    e.preventDefault();
    console.log("Updating Data...", firstName, lastName, phone, email);

    if (firstName && lastName && phone && email) {
      const user = auth.currentUser;
      if (user) {
        const userDoc = doc(db, "users", user.uid);
        await updateDoc(userDoc, {
          name: firstName + " " + lastName,
          phone: phone,
        });
        router.push("/feed");
      }
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = doc(db, "users", user.uid);
        const userData = await getDoc(userDoc);
        if (userData.exists()) {
          const data = userData.data();

          // check if user has already completed onboarding
          if (data.name && data.phone) {
            redirect("/feed");
          }

          console.log("USERDATAs", data, data.name.split(" "));
          setFirstName(data.name.split(" ")[0] || "");
          setLastName(data.name.split(" ")[1] || "");
          setPhone(data.phone || "");
          setEmail(data.email || "");
        }
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="flex h-[calc(100svh-65px)] flex-col items-center justify-center gap-2 bg-muted p-6 md:p-10">
      <h2 className="text-2xl font-semibold">Onboarding Form</h2>
      <p className="mb-6">
        You need to fill this onboarding form, in order to gain the complete
        access of our platform
      </p>
      <div className="grid gap-6 min-w-[200px] max-w-[500px] w-full">
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
            disabled
            required
          />
        </div>

        <Button type="submit" onClick={handleUpdateData} className="w-full">
          Complete Profie
        </Button>
      </div>
    </div>
  );
};

export default OnboardingUserPage;
