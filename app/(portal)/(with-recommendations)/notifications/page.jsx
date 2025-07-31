import NotificationsSkeleton from "@/components/NotificationsSkeleton";
import Sidebar from "@/components/Sidebar";
import NotificationsClient from "./notifications-client";

export default function NotificationsPage() {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="max-w-[1400px] w-full">
        <div className="container grid grid-cols-1 gap-6">
          <main>
            <NotificationsClient />
          </main>
        </div>
      </div>
    </div>
  );
}
