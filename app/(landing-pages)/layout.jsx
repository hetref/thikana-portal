"use client"

import TopNavbar from "@/components/TopNavbar";
import Footer from "@/components/Footer"
import { motion, AnimatePresence } from "framer-motion"
const LandingPageLayout = ({ children }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white dark:bg-black transition-colors duration-300"
      >
        <TopNavbar />
        <motion.main
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {children}
        </motion.main>
        <Footer />
      </motion.div>
    </AnimatePresence>
  );
};

export default LandingPageLayout;
