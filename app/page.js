import TopNavbar from "@/components/TopNavbar";

export default function Home() {
  return (
    <div>
      <TopNavbar />
      <div className="flex h-[300px] flex-col items-center justify-center gap-6 text-xl font-semibold p-6 md:p-10">
        Landing Page
      </div>
    </div>
  );
}
