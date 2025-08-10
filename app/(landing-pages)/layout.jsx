"use client"
import LandingNav from "@/components/landing_nav"
import Footer from "@/components/Footer"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "@/context/ThemeContext"
import { useEffect, useState } from "react"

const LandingPageLayout = ({ children }) => {
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={`transition-colors duration-300 flex flex-col min-h-screen ${
          isDark ? 'bg-black' : 'bg-white'
        }`}
      >
        <LandingNav />
        <motion.main
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex-grow"
        >
          {children}
        </motion.main>
        <Footer />
      </motion.div>
    </AnimatePresence>
  )
}

export default LandingPageLayout
