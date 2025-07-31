"use client";

import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";

const WithRecommendationsLayout = ({ children }) => {
  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="container grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <Sidebar />
          </div>
        </aside>
        <main>{children}</main>
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <WhoToFollow />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default WithRecommendationsLayout;
