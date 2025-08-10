"use client";

import * as React from "react";
import {
  Home, Search, Bell, User,
  HelpCircle, LogOut, ChevronRight, Globe
} from 'lucide-react';
import {
  Avatar, AvatarFallback, AvatarImage
} from "@/components/ui/avatar";
import Image from "next/image";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarTrigger
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import useGetUser from "@/hooks/useGetUser";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getUnreadNotificationCount } from "@/lib/notifications";
import AddPhotoModal from "./AddPhotoModal";
import { CartProvider } from "@/components/CartContext";
import { useTheme } from "@/context/ThemeContext";

// Shared state and functionality
const useNavigationState = () => {
  const [authUser, setAuthUser] = useState(null);
  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [mounted, setMounted] = useState(false);
  const { isDark } = useTheme();
  const userData = useGetUser(authUser?.uid);
  const router = useRouter();

  const languages = [
    { code: "en", name: "English" },
    { code: "hi", name: "हिन्दी (Hindi)" },
    { code: "mr", name: "मराठी (Marathi)" },
    { code: "gu", name: "ગુજરાતી (Gujarati)" },
    { code: "ta", name: "தமிழ் (Tamil)" },
    { code: "te", name: "తెలుగు (Telugu)" },
    { code: "kn", name: "ಕನ್ನಡ (Kannada)" },
    { code: "es", name: "Español (Spanish)" },
    { code: "fr", name: "Français (French)" },
    { code: "de", name: "Deutsch (German)" },
    { code: "ja", name: "日本語 (Japanese)" },
    { code: "zh-CN", name: "中文 (Chinese)" },
    { code: "ar", name: "العربية (Arabic)" },
  ];

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedLanguage = localStorage.getItem("preferredLanguage");
      if (savedLanguage) setCurrentLanguage(savedLanguage);
    } catch {}
  }, []);

  const changeLanguage = (langCode) => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem("preferredLanguage", langCode);
      setCurrentLanguage(langCode);
      if (langCode === "en") {
        window.location.hash = "";
      } else {
        window.location.hash = `#googtrans(en|${langCode})`;
      }
      window.location.reload();
    } catch {}
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentLanguage !== "en") {
      const script = document.createElement("script");
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: languages.map((lang) => lang.code).join(","),
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.HORIZONTAL,
          },
          "google_translate_element"
        );
        const googleFrame = document.getElementsByClassName("goog-te-banner-frame")[0];
        if (googleFrame) googleFrame.style.display = "none";
        document.body.style.top = "0px";
      };
      document.body.appendChild(script);
    }
  }, [currentLanguage]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setAuthUser(user);
      else setAuthUser(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    if (authUser?.uid) {
      unsubscribe = getUnreadNotificationCount((count) => {
        setNotificationCount(count);
      }, authUser.uid);
    } else {
      setNotificationCount(0);
    }
    return () => unsubscribe();
  }, [authUser]);

  const logoutHandler = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return {
    authUser, userData, isAddPhotoModalOpen, setIsAddPhotoModalOpen,
    notificationCount, currentLanguage, mounted, isDark,
    languages, changeLanguage, logoutHandler
  };
};

const navigationData = [
  {
    type: "section",
    label: "MAIN",
    items: [
      { title: "Home", icon: Home, url: "/feed" },
      { title: "Search", icon: Search, url: "/search" },
      { title: "Notifications", icon: Bell, url: "/notifications" },
      { title: "Profile", icon: User, url: "/profile" },
    ],
  },
];

const bottomNavigationData = [
  { title: "Help", icon: HelpCircle, url: "#" },
  { title: "Logout Account", icon: LogOut, url: "#", className: "text-red-500 hover:text-red-600" },
];

export function SidebarNav({ ...props }) {
  const {
    authUser, userData, isAddPhotoModalOpen, setIsAddPhotoModalOpen,
    notificationCount, currentLanguage, mounted, languages,
    changeLanguage, logoutHandler
  } = useNavigationState();
  const pathname = usePathname();

  if (!mounted) return null;

  return (
    <CartProvider>
      <div id="google_translate_element" className="hidden"></div>

      <Sidebar
        {...props}
        className="fixed left-2 top-4 h-[calc(100vh-2rem)] w-64 bg-white dark:bg-gray-900 shadow-xl rounded-s-3xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col"
      >
        {/* Header */}
        <SidebarHeader className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Image src="/logo/logo_text.png" alt="Thikana" width={128} height={64} />
          </div>
        </SidebarHeader>

        {/* Main Content */}
        <SidebarContent className="flex-1 overflow-y-auto py-4 px-0">
          {navigationData.map((section, sectionIndex) => (
            <React.Fragment key={section.label || `section-${sectionIndex}`}>
              {section.type === "section" && (
                <SidebarGroup className="mb-4">
                  <SidebarGroupLabel className="px-4 py-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                    {section.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map((item) => {
                        const isActive = pathname ? pathname.startsWith(item.url) : false;
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={isActive}>
                              <a
                                href={item.url}
                                className={cn(
                                  "flex items-center justify-start gap-3 rounded-md px-4 py-2 text-sm font-medium w-full",
                                  isActive
                                    ? "bg-[#F28C28]/15 text-[#F28C28] hover:bg-[#F28C28]/20 hover:text-[#F28C28] dark:bg-[#F28C28]/20"
                                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                                )}
                              >
                                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-[#F28C28]" : "text-gray-500 dark:text-gray-400")} />
                                <span className="truncate">{item.title}</span>
                                {item.title === "Notifications" && notificationCount > 0 && (
                                  <Badge variant="destructive" className="ml-auto text-xs px-1 py-0 h-5 w-5 flex items-center justify-center rounded-full">
                                    {notificationCount}
                                  </Badge>
                                )}
                              </a>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </React.Fragment>
          ))}
        </SidebarContent>

        {/* Bottom */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <SidebarMenu className="space-y-2">
            <SidebarMenuItem>
              <SidebarTrigger className="w-full justify-start px-4 py-2" />
            </SidebarMenuItem>

            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="w-full justify-start px-4">
                    <Globe className="h-5 w-5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                    <span className="truncate ml-3">Language</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Select Language</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      className={currentLanguage === lang.code ? "bg-muted" : ""}
                      onClick={() => changeLanguage(lang.code)}
                    >
                      <span className="flex-1 truncate">{lang.name}</span>
                      {currentLanguage === lang.code && (
                        <span className="text-primary flex-shrink-0">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>

            {bottomNavigationData.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <a
                    href={item.url}
                    className={cn(
                      "flex items-center justify-start gap-3 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 w-full",
                      item.className
                    )}
                    onClick={item.title === "Logout Account" ? logoutHandler : undefined}
                  >
                    <item.icon className={cn("h-5 w-5 flex-shrink-0", item.className?.includes("text-red") ? "text-red-500" : "text-gray-500 dark:text-gray-400")} />
                    <span className="truncate">{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      </Sidebar>

      {authUser && (
        <AddPhotoModal
          isOpen={isAddPhotoModalOpen}
          onClose={() => setIsAddPhotoModalOpen(false)}
          userId={authUser.uid}
        />
      )}
    </CartProvider>
  );
}

export default SidebarNav;
