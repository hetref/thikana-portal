"use client"

import { Instagram, Linkedin, Twitter, Youtube } from "lucide-react"
import Image from "next/image"

const footerColumns = [
  {
    title: "Solutions",
    links: ["Features", "Pricing", "Search", "Contact Us"],
  },
  {
    title: "Resources",
    links: ["Documentation", "Blog", "Support"],
  },
  {
    title: "Company",
    links: ["About Us", "Privacy Policy", "Terms of Service"],
  },
]

const legalLinks = ["Privacy Policy", "Terms of Service"]

const socialIcons = [
  { icon: <Instagram className="h-5 w-5" />, href: "#" },
  { icon: <Twitter className="h-5 w-5" />, href: "#" },
  { icon: <Linkedin className="h-5 w-5" />, href: "#" },
  { icon: <Youtube className="h-5 w-5" />, href: "#" },
]

export default function Footer() {
  return (
    <footer className="bg-black text-white relative w-full pt-20 pb-10">
      <div className="pointer-events-none absolute top-0 left-0 z-0 h-full w-full overflow-hidden">
        <div className="bg-white/5 absolute top-1/3 left-1/4 h-64 w-64 rounded-full opacity-10 blur-3xl" />
        <div className="bg-white/5 absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full opacity-10 blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        
        <div className="mb-16 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <div className="mb-6 flex items-center space-x-2">
              <Image 
                src="/logo/white-logo.png" 
                alt="logo" 
                width={100} 
                height={100} 
              />
            </div>
            <p className="text-gray-300 mb-6">
              Empowering businesses with reliable, scalable, and innovative solutions.
            </p>
            <div className="flex space-x-4">
              {socialIcons.map((item, i) => (
                <a
                  key={i}
                  href={item.href}
                  className="glass-effect hover:bg-white/10 flex h-10 w-10 items-center justify-center rounded-full transition text-white"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-lg font-semibold text-white">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((text) => (
                  <li key={text}>
                    <a href="#" className="text-gray-300 hover:text-white transition">
                      {text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-white/10 flex flex-col items-center justify-between border-t pt-8 md:flex-row">
          <p className="text-gray-300 mb-4 text-sm md:mb-0">© 2025 Thikana INC. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-6">
            {legalLinks.map((text) => (
              <a key={text} href="#" className="text-gray-300 hover:text-white text-sm">
                {text}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
