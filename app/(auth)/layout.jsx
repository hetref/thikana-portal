"use client";

import { useAuth } from "@/context/AuthContext";
import { redirect } from "next/navigation";
import React from "react";

const layout = ({ children }) => {
  const { user } = useAuth();

  if (user) {
    console.log(user);
    redirect("/");
  }

  return <div>{children}</div>;
};

export default layout;
