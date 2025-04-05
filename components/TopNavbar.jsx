"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import useGetUser from "@/hooks/useGetUser";
import { auth } from "@/lib/firebase";
import { authenticatedItems, unauthenticatedItems } from "@/constants/navLinks";
import Image from "next/image";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { redirect, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Menu, X, Plus, MapPin, Search, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getUnreadNotificationCount } from "@/lib/notifications";
import AddPhotoModal from "./AddPhotoModal";
import CartIcon from "@/components/cart/CartIcon";
import { CartProvider } from "@/components/CartContext";

const TopNavbar = ({ type = "unauthenticated" }) => {
  const [authUser, setAuthUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentLanguage, setCurrentLanguage] = useState("en");

  // Get the complete user data from Firestore
  const userData = useGetUser(authUser?.uid);

  const router = useRouter();

  // Languages supported by our app
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

  // Initialize language preference from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedLanguage = localStorage.getItem("preferredLanguage");
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
    }
  }, []);

  // Function to change the language
  const changeLanguage = (langCode) => {
    try {
      if (typeof window === "undefined") return;

      // Save language preference
      localStorage.setItem("preferredLanguage", langCode);
      setCurrentLanguage(langCode);

      // Apply language change using the most reliable approach - direct URL parameters
      if (langCode === "en") {
        // Remove translation parameter
        window.location.hash = "";
      } else {
        // Set Google Translate hash parameter
        window.location.hash = `#googtrans(en|${langCode})`;
      }

      // Reload the page to apply the translation
      window.location.reload();
    } catch (error) {
      console.error("Error changing language:", error);
    }
  };

  // Add Google Translate script on initial load
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only add script if we're not in English mode
    if (currentLanguage !== "en") {
      // Create script element
      const script = document.createElement("script");
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;

      // Create function to initialize Google Translate
      window.googleTranslateElementInit = function () {
        // Initialize translation but don't show the widget
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: languages.map((lang) => lang.code).join(","),
            autoDisplay: false,
            layout:
              window.google.translate.TranslateElement.InlineLayout.HORIZONTAL,
          },
          "google_translate_element"
        );
        const googleFrame = document.getElementsByClassName('goog-te-banner-frame')[0];
        if (googleFrame) {
          googleFrame.style.display = 'none';
        }
        document.body.style.top = '0px';
      };

      // Add script to page
      document.body.appendChild(script);
    }
  }, [currentLanguage]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Set up notification count listener
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
      throw error;
    }
  };

  return (
    <CartProvider>
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200 transition-colors duration-300">
        {/* Hidden Google Translate element - not interactive, just for initialization */}
        <div id="google_translate_element" className="hidden"></div>

        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Image
              src="/logo/black-logo.png"
              alt="Thikana Logo"
              width={150}
              height={64}
              className="h-16 object-contain"
              priority
            />
          </Link>

          <button
            className="flex items-center sm:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          <div
            className={`${
              isMenuOpen ? "flex" : "hidden"
            } flex-col sm:flex sm:flex-row sm:items-center gap-4 bg-background sm:bg-transparent 
            sm:gap-6 fixed sm:relative top-14 sm:top-auto right-0 sm:right-auto w-full sm:w-auto p-6`}
          >
            <div className="flex items-center gap-2">
              {/* Translation dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="border group relative"
                  >
                    <Globe className="h-5 w-5 group-hover:text-primary transition-colors" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Select Language</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      className={
                        currentLanguage === lang.code ? "bg-muted" : ""
                      }
                      onClick={() => changeLanguage(lang.code)}
                    >
                      <span className="flex-1">{lang.name}</span>
                      {currentLanguage === lang.code && (
                        <span className="text-primary">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" className="border" asChild>
                <Link href="/search">
                  <Search className="h-5 w-5" />
                </Link>
              </Button>
              {type === "authenticated" && userData?.role === "user" && (
                <CartIcon userData={userData} />
              )}
            </div>

            {authUser &&
              type === "authenticated" &&
              authenticatedItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  {item.icon && <item.icon className="h-5 w-5" />}
                  <span className="block">{item.title}</span>
                  {item.title === "Notifications" && notificationCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-[10px] h-5 min-w-5 flex items-center justify-center px-1"
                    >
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </Badge>
                  )}
                </Link>
              ))}

            {authUser && userData && type === "authenticated" && (
              <>
                {/* Only show Create dropdown if user role is not "user" */}
                {userData.role !== "user" && (
                  <>
                    <Link
                      key="Map"
                      href="/map"
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
                    >
                      <MapPin /> Set Location
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary">
                          <Plus className="h-5 w-5" />
                          <span className="block">Create</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href="/create-post"
                            className="flex items-center gap-2"
                          >
                            <span>Create Post</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setIsAddPhotoModalOpen(true)}
                        >
                          <span>Add Photos</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href="/add-product"
                            className="flex items-center gap-2"
                          >
                            <span>Add Product</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href="/add-bulk-products"
                            className="flex items-center gap-2"
                          >
                            <span>Add Bulk Product</span>
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
                {authUser && (
                  <AddPhotoModal
                    isOpen={isAddPhotoModalOpen}
                    onClose={() => setIsAddPhotoModalOpen(false)}
                    userId={authUser.uid}
                  />
                )}
              </>
            )}

            {type === "unauthenticated" &&
              unauthenticatedItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  {item.icon && <item.icon className="h-5 w-5" />}
                  <span className="block">{item.title}</span>
                </Link>
              ))}

            {/* Auth Buttons */}
            <div className="flex items-center gap-2">
              {authUser && type === "authenticated" ? (
                <Button
                  size="sm"
                  onClick={logoutHandler}
                  className="bg-primary hover:bg-primary-dark"
                >
                  Sign out
                </Button>
              ) : (
                <Button
                  size="sm"
                  asChild
                  className="bg-primary hover:bg-primary-dark"
                >
                  <Link href={authUser ? "/feed" : "/login"}>Get Started</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
    </CartProvider>
  );
};

export default TopNavbar;
