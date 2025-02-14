"use client";
import React, { useRef, useEffect, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { cn } from "@/lib/utils";

export const TextHoverEffect = ({ children, className }) => {
  const controls = useAnimationControls();

  const rubberBand = () => {
    controls.start({
      transform: [
        "scale3d(1, 1, 1)",
        "scale3d(1.4, .55, 1)",
        "scale3d(.75, 1.25, 1)",
        "scale3d(1.25, .85, 1)",
        "scale3d(.9, 1.05, 1)",
        "scale3d(1, 1, 1)",
      ],
    });
  };

  return (
    <motion.span
      animate={controls}
      onMouseOver={() => rubberBand()}
      className={cn("dark:text-white text-black cursor-pointer inline-block", className)}
    >
      {children}
    </motion.span>
  );
};
