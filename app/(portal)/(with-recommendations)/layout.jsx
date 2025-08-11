"use client";

import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
import NearbyBusinessMap from "@/components/NearbyBusinessMap";
import { usePathname } from "next/navigation";

const WithRecommendationsLayout = ({ children }) => {
  const pathname = usePathname();

  // Detect profile routes (main and sub-routes)
  const isProfileRoute = pathname === "/profile" || pathname.startsWith("/profile/");

  // Check if we're on the feed page
  const isFeedPage = pathname === "/feed";
  // Hide both sidebars on notifications page
  // Previously used to hide on notifications; not needed now

  // Disable body scroll on feed page
  useEffect(() => {
    if (isFeedPage) {
      // Disable body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll
      document.body.style.overflow = 'auto';
    }

    // Cleanup function to re-enable scroll when component unmounts
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isFeedPage]);

  // Use 2-column layout for profile sub-routes, 3-column for others
  // Increased sidebar widths from 300px to 400px
  const gridColsClass = isProfileRoute
    ? "grid-cols-1"
    : "grid-cols-1 lg:grid-cols-[500px_1fr_500px]";

  return (
    <div className="w-full">
      <div className={`grid ${gridColsClass} gap-4 px-4 lg:px-6 max-w-[1900px] mx-auto`}>
        {!isProfileRoute && (
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <div className="mb-4">
                <Sidebar /> 
              </div>
              {isFeedPage && (  
                <div className="h-[400px]">
                  <NearbyBusinessMap 
                    height="280px" 
                    width="450px" 
                    cardHeight="400px"
                  />
                </div>
              )}
            </div>
          </aside>
        )}
        <main className={`${isProfileRoute ? 'w-full' : 'w-[900px] justify-self-start'} ${isFeedPage ? 'max-h-screen overflow-y-auto' : ''}`}>{children}</main>
        {!isProfileRoute && (
          <aside className="hidden lg:block w-[500px]">
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
