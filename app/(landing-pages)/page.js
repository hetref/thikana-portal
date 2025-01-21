import TopNavbar from "@/components/TopNavbar";
import Particles from "@/components/ui/particles";
import BoxReveal from "@/components/ui/box-reveal";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import SparklesText from "@/components/ui/sparkles-text";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Particles className="w-full h-full" />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center text-black">
        <SparklesText text="Thikana Portal" />
      </div>
    </div>
  );

}

