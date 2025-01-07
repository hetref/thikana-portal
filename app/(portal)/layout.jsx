"use client";

import TopNavbar from "@/components/TopNavbar";
import { useAuth } from "@/context/AuthContext";
import { redirect } from "next/navigation";
import React from "react";

const layout = ({ children }) => {
  const { user } = useAuth();

  if (user === false) {
    // TODO: Add the popup for better UX.
    console.log(user);
    redirect("/");
  }

  return (
    <div>
      <TopNavbar type="authenticated" />
      {children}
    </div>
  );
};

export default layout;
