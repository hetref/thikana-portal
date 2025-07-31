"use client"

import React, { useRef, useEffect, useState } from "react"
import { motion, useMotionValue, useAnimationFrame, useTransform } from "framer-motion"
import { cn } from "@/lib/utils"

export function InfiniteSlider({ children, speed = 50, speedOnHover = 20, gap = 0, className }) {
  const sliderRef = useRef(null)
  const x = useMotionValue(0)
  const [width, setWidth] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const childrenArray = React.Children.toArray(children)
  const duplicatedChildren = childrenArray.concat(childrenArray)

  useEffect(() => {
    if (sliderRef.current) {
      const totalContentWidth = sliderRef.current.scrollWidth
      setWidth(totalContentWidth / 2)
    }
  }, [childrenArray.length, gap])

  useAnimationFrame((t, delta) => {
    const currentSpeed = isHovered ? speedOnHover : speed
    const moveBy = (currentSpeed / 1000) * delta

    let currentX = x.get()
    currentX -= moveBy

    if (width > 0 && currentX <= -width) {
      currentX += width
    }
    x.set(currentX)
  })

  const translateX = useTransform(x, (val) => `${val}px`)

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div ref={sliderRef} className="flex w-max" style={{ x: translateX, gap: `${gap}px` }}>
        {duplicatedChildren.map((child, index) => (
          <div key={`${index}-${Math.floor(index / childrenArray.length)}`} className="flex-shrink-0">
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  )
}
