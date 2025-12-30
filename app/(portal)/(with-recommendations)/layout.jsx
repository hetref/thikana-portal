"use client";

import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
import NearbyBusinessMap from "@/components/NearbyBusinessMap";
import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/lib/context/SidebarContext";

const WithRecommendationsLayoutInner = ({ children }) => {
  const pathname = usePathname();
  const { rightSidebarContent } = useSidebar();

  // Detect profile routes (main and sub-routes)
  const isProfileRoute = pathname === "/profile" || pathname.startsWith("/profile/");

  // Detect username routes like "/@username" which live at this segment root
  const pathSegments = pathname.split("/").filter(Boolean);
  const isUsernameRoute =
    pathSegments.length === 1 &&
    !["feed", "profile", "notifications", "search"].includes(pathSegments[0]);

  // Check if we're on the feed page
  const isFeedPage = pathname === "/feed";

  // Check for other pages that need constrained width
  const isSearchPage = pathname === "/search";
  const isNotificationsPage = pathname === "/notifications";
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

  // Hide sidebars on profile routes only; show sidebars on username routes
  const hideSidebars = isProfileRoute;

  // Adjust grid layout based on page type
  const getGridColsClass = () => {
    if (hideSidebars) return "grid-cols-1";
    if (isUsernameRoute) return "grid-cols-1 lg:grid-cols-[500px_1fr_350px]";
    if (isFeedPage || isSearchPage || isNotificationsPage) {
      // Tighter layout for constrained content pages with wider WhoToFollow
      return "grid-cols-1 lg:grid-cols-[500px_1fr_500px]";
    }
    return "grid-cols-1 lg:grid-cols-[300px_1fr_300px]";
  };

  const gridColsClass = getGridColsClass();

  return (
    <div className="w-full">
      <div className={`grid ${gridColsClass} ${(isFeedPage || isSearchPage || isNotificationsPage) && !hideSidebars ? 'gap-6 px-4 lg:px-8 max-w-[2200px]' : 'gap-4 px-4 lg:px-6 max-w-[1900px]'} mx-auto`}>
        {!hideSidebars && (
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <div>
                <Sidebar />
              </div>
              {isFeedPage && (
                <div className="h-[400px]">
                  <NearbyBusinessMap
                    height="280px"
                    width="280px"
                    cardHeight="400px"
                  />
                </div>
              )}
              {isUsernameRoute && (
                <div>
                  <WhoToFollow />
                </div>
              )}
            </div>
          </aside>
        )}
        <main className={`${hideSidebars ? 'w-full' : 'w-full'} ${isFeedPage ? 'max-h-screen overflow-y-auto' : ''} ${(isFeedPage || isSearchPage || isNotificationsPage) && !hideSidebars ? 'max-w-4xl mx-auto' : ''}`}>{children}</main>
        {!hideSidebars && (
          <aside className={`hidden lg:block ${isUsernameRoute ? 'w-[350px]' : (isFeedPage || isSearchPage || isNotificationsPage) ? 'w-[500px]' : 'w-[300px]'}`}>
            <div className="sticky top-20">
              {!isUsernameRoute && <WhoToFollow />}
              {isUsernameRoute && rightSidebarContent}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

const WithRecommendationsLayout = ({ children }) => {
  return (
    <SidebarProvider>
      <WithRecommendationsLayoutInner>{children}</WithRecommendationsLayoutInner>
    </SidebarProvider>
  );
};

export default WithRecommendationsLayout;
