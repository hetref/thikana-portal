import Sidebar from "@/components/Sidebar";
import WhoToFollow from "@/components/WhoToFollow";
import PostCard from "@/components/PostCard";
import Chatbot from "@/components/Chatbot";

const FeedPage = () => {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="max-w-7xl w-full">
        <div className="container grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6 py-8">
          <aside className="hidden md:block">
            <Sidebar />
          </aside>
          <main className="space-y-6">
            <PostCard />
            <PostCard />
            <PostCard />
          </main>
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <WhoToFollow />
            </div>
          </aside>
          <aside>
            <div className="fixed bottom-4 right-4">
              <Chatbot />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
