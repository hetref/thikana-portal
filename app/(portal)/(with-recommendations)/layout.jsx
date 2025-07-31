"use client";

import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
import { usePathname } from "next/navigation";

const WithRecommendationsLayout = ({ children }) => {
  const pathname = usePathname();
  
  // Hide WhoToFollow on profile sub-routes but show it on main /profile page
  const shouldHideWhoToFollow = pathname.startsWith('/profile/');
  
  // Use 2-column layout for profile sub-routes, 3-column for others
  const gridColsClass = shouldHideWhoToFollow 
    ? "grid-cols-1 lg:grid-cols-[300px_1fr]" 
    : "grid-cols-1 lg:grid-cols-[300px_1fr_300px]";

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className={`container grid ${gridColsClass} gap-6`}>
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <Sidebar />
          </div>
        </aside>
        <main>{children}</main>
        {!shouldHideWhoToFollow && (
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <WhoToFollow />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default WithRecommendationsLayout;
