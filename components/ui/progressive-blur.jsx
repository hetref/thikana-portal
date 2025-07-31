"use client"
import { cn } from "@/lib/utils"

export function ProgressiveBlur({ direction, blurIntensity = 1, className }) {
  const gradientClass =
    direction === "left"
      ? `bg-gradient-to-r from-black via-black/50 to-transparent`
      : `bg-gradient-to-l from-black via-black/50 to-transparent`

  const opacityStyle = { opacity: blurIntensity }

  return <div className={cn(gradientClass, className)} style={opacityStyle} aria-hidden="true" />
}
