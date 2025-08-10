import NotificationsSkeleton from "@/components/NotificationsSkeleton";
import Sidebar from "@/components/Sidebar";
import NotificationsClient from "./notifications-client";

export default function NotificationsPage() {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="w-full max-w-[1400px]">
        <div className="py-8 px-4">
          <NotificationsClient />
        </div>
      </div>
    </div>
  );
}
