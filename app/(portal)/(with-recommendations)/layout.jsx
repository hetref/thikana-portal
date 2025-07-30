"use client";

import WhoToFollow from "@/components/WhoToFollow";

const WithRecommendationsLayout = ({ children }) => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="container grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
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
