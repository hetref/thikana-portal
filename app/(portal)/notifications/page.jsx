import NotificationsSkeleton from "@/components/NotificationsSkeleton"
import Sidebar from "@/components/Sidebar"
import WhoToFollow from "@/components/WhoToFollow"

export default function NotificationsPage() {
  return (
    <div className='flex items-center justify-center w-full'>
      <div className='max-w-7xl w-full'>
        <div className="container grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6 py-8">
          <aside>
            <Sidebar />
          </aside>
          <main>
            <NotificationsSkeleton />
          </main>
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <WhoToFollow />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
} 