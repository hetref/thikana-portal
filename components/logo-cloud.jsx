"use client"

import Image from "next/image"
import { InfiniteSlider } from "@/components/ui/infinite-slider"
import { ProgressiveBlur } from "@/components/ui/progressive-blur"

export function LogoCloud() {
  return (
    <section className="bg-black overflow-hidden py-16">
      <div className="group relative m-auto max-w-[1400px] px-6">
        <div className="flex flex-col items-center md:flex-row">
          <div className="md:max-w-44 md:border-r md:pr-6">
            <p className="text-end text-xl font-bold text-white">{"Powering the best teams"}</p>
          </div>
          <div className="relative py-12 min-h-[80px] md:w-[calc(100%-11rem)]">
            <InfiniteSlider speedOnHover={20} speed={40} gap={112}>
              <div className="flex">
                <Image
                  className="mx-auto h-10 w-fit invert dark:invert"
                  src="https://html.tailus.io/blocks/customers/nvidia.svg"
                  alt="Nvidia Logo"
                  height={40}
                  width={160}
                />
              </div>
              <div className="flex">
                <Image
                  className="mx-auto h-8 w-fit dark:invert"
                  src="https://html.tailus.io/blocks/customers/column.svg"
                  alt="Column Logo"
                  height={32}
                  width={160}
                />
              </div>
              <div className="flex">
                <Image
                  className="mx-auto h-8 w-fit dark:invert"
                  src="https://html.tailus.io/blocks/customers/github.svg"
                  alt="GitHub Logo"
                  height={32}
                  width={160}
                />
              </div>
              <div className="flex">
                <Image
                  className="mx-auto h-10 w-fit dark:invert"
                  src="https://html.tailus.io/blocks/customers/nike.svg"
                  alt="Nike Logo"
                  height={40}
                  width={160}
                />
              </div>
              <div className="flex">
                <Image
                  className="mx-auto h-10 w-fit dark:invert"
                  src="https://html.tailus.io/blocks/customers/lemonsqueezy.svg"
                  alt="Lemon Squeezy Logo"
                  height={40}
                  width={240}
                />
              </div>
              <div className="flex">
                <Image
                  className="mx-auto h-8 w-fit dark:invert"
                  src="https://html.tailus.io/blocks/customers/laravel.svg"
                  alt="Laravel Logo"
                  height={32}
                  width={160}
                />
              </div>
              <div className="flex">
                <Image
                  className="mx-auto h-14 w-fit dark:invert"
                  src="https://html.tailus.io/blocks/customers/lilly.svg"
                  alt="Lilly Logo"
                  height={56}
                  width={160}
                />
              </div>
              <div className="flex">
                <Image
                  className="mx-auto h-12 w-fit dark:invert"
                  src="https://html.tailus.io/blocks/customers/openai.svg"
                  alt="OpenAI Logo"
                  height={48}
                  width={160}
                />
              </div>
            </InfiniteSlider>
            <ProgressiveBlur
              className="pointer-events-none absolute left-0 top-0 h-full w-20"
              direction="left"
              blurIntensity={0.8}
            />
            <ProgressiveBlur
              className="pointer-events-none absolute right-0 top-0 h-full w-20"
              direction="right"
              blurIntensity={0.8}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
