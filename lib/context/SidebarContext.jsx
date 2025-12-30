"use client";
import { createContext, useContext, useState } from "react";

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [rightSidebarContent, setRightSidebarContent] = useState(null);

  return (
    <SidebarContext.Provider value={{ rightSidebarContent, setRightSidebarContent }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};