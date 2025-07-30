import NotificationsSkeleton from "@/components/NotificationsSkeleton";
import Sidebar from "@/components/Sidebar";
import NotificationsClient from "./notifications-client";

export default function NotificationsPage() {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="max-w-7xl w-full">
        <div className="container grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 py-8">
          <aside className="hidden lg:block">
            <Sidebar />
          </aside>
          <main>
            <NotificationsClient />
          </main>
        </div>
      </div>
    </div>
  );
}
