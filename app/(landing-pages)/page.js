import SparklesText from "@/components/ui/sparkles-text";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center text-black">
        <SparklesText text="Thikana Portal" />
        <TextGenerateEffect words="Aurora Text Effect" />
      </div>
    </div>
  );

}

