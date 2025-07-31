import Sidebar from "@/components/Sidebar";
import React from "react";

const Layout = ({ children }) => {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="max-w-[1400px] w-full flex justify-center gap-6 px-2 md:px-4">
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
