import Sidebar from "@/components/Sidebar";
import React from "react";

const Layout = ({ children }) => {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="max-w-7xl w-full flex justify-center gap-6">
        <aside className="hidden lg:block md:w-[30%] w-full">
          <div className="sticky top-[80px]">
            <Sidebar />
          </div>
        </aside>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
