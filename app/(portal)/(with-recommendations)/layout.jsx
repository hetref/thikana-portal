"use client";

import { SidebarNav } from "@/components/main_nav";
import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
import Chatbot from "@/components/Chatbot";
import Header from "@/components/header";
import NearbyBusinessMap from "@/components/NearbyBusinessMap";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const WithRecommendationsLayout = ({ children }) => {
  const pathname = usePathname();
  const isFeedPage = pathname?.startsWith("/feed");
  const isNotificationsPage = pathname?.startsWith("/notifications");
  const isProfilePage = pathname?.startsWith("/profile");
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);
  return (
    <div className="w-full mx-auto h-screen overflow-hidden overscroll-none bg-[#F8F8F8]">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header />
      </div>

      {/* Fixed positioned main navigation */}
      <div className="hidden lg:block">
        <SidebarNav />
      </div>

      {/* Content area */}
      <div className="flex w-full pt-24 h-[calc(100vh-64px)]">
        {/* Posts Section - reduced width on notifications; expand otherwise */}
        <main className={`${isNotificationsPage ? "w-[1000px]" : "flex-1"} pr-0 h-full overflow-y-auto`}>{children}</main>

        {/* Right Sidebar - hidden on profile page */}
        {!isProfilePage && (
          <aside>
            <div className="sticky top-20">
              <div className={`grid grid-cols-2 gap-2`}>
                <Sidebar />
                <WhoToFollow showSidebar={false} className={`${isNotificationsPage ? "w-full" : "w-[350px]"}`} />
                {isFeedPage && (
                  <div className="h-[500px] col-span-2">
                    <NearbyBusinessMap className="w-[700px]" heightClass="h-[260px]" />
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Fixed Chatbot */}
      <div className="fixed bottom-4 right-4">
        <Chatbot />
      </div>
    </div>
  );
};

export default WithRecommendationsLayout;
