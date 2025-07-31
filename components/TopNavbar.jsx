"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import useGetUser from "@/hooks/useGetUser"
import { auth } from "@/lib/firebase"
import { authenticatedItems, unauthenticatedItems } from "@/constants/navLinks"
import Image from "next/image"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Menu, X, Plus, MapPin, Search, Globe } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { getUnreadNotificationCount } from "@/lib/notifications"
import AddPhotoModal from "./AddPhotoModal"
import CartIcon from "@/components/cart/CartIcon"
import { CartProvider } from "@/components/CartContext"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { cn } from "@/lib/utils"
import { useTheme } from "@/context/ThemeContext"

const TopNavbar = ({ type = "unauthenticated" }) => {
  const [authUser, setAuthUser] = useState(null)
  const [menuState, setMenuState] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [currentLanguage, setCurrentLanguage] = useState("en")
  const [mounted, setMounted] = useState(false)
  const { isDark } = useTheme()

  // Ensure component is mounted before rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get the complete user data from Firestore
  const userData = useGetUser(authUser?.uid)
  const router = useRouter()

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
  ]

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Initialize language preference from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const savedLanguage = localStorage.getItem("preferredLanguage")
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage)
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error)
    }
  }, [])

  // Function to change the language
  const changeLanguage = (langCode) => {
    try {
      if (typeof window === "undefined") return

      localStorage.setItem("preferredLanguage", langCode)
      setCurrentLanguage(langCode)

      if (langCode === "en") {
        window.location.hash = ""
      } else {
        window.location.hash = `#googtrans(en|${langCode})`
      }

      window.location.reload()
    } catch (error) {
      console.error("Error changing language:", error)
    }
  }

  // Add Google Translate script on initial load
  useEffect(() => {
    if (typeof window === "undefined") return

    if (currentLanguage !== "en") {
      const script = document.createElement("script")
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      script.async = true

      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: languages.map((lang) => lang.code).join(","),
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.HORIZONTAL,
          },
          "google_translate_element",
        )
        const googleFrame = document.getElementsByClassName("goog-te-banner-frame")[0]
        if (googleFrame) {
          googleFrame.style.display = "none"
        }
        document.body.style.top = "0px"
      }

      document.body.appendChild(script)
    }
  }, [currentLanguage])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user)
      } else {
        setAuthUser(false)
      }
    })

    return () => unsubscribe()
  }, [])

  // Set up notification count listener
  useEffect(() => {
    let unsubscribe = () => {}

    if (authUser?.uid) {
      unsubscribe = getUnreadNotificationCount((count) => {
        setNotificationCount(count)
      }, authUser.uid)
    } else {
      setNotificationCount(0)
    }

    return () => unsubscribe()
  }, [authUser])

  const logoutHandler = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Logout Error:", error)
      throw error
    }
  }

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <CartProvider>
      <header>
        {/* Hidden Google Translate element */}
        <div id="google_translate_element" className="hidden"></div>

        <nav data-state={menuState && "active"} className="fixed z-20 w-full px-2">
          <div
            className={cn(
              "mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
              isScrolled && (isDark 
                ? "bg-black/50 backdrop-blur-lg border border-white/10 max-w-4xl rounded-3xl lg:px-5"
                : "bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5"
              ),
            )}
          >
            <div className="relative flex flex-wrap items-center justify-between gap-6 py-2 lg:gap-0 lg:py-2">
              {/* Logo and Mobile Menu Toggle */}
              <div className="flex w-full justify-between lg:w-auto">
                <Link href="/" aria-label="home" className="flex items-center space-x-2">
                  <Image
                    src={isDark ? "/logo/white-logo.png" : "/logo/black-logo.png"}
                    alt="Thikana Logo"
                    width={150}
                    height={64}
                    className="h-16 object-contain"
                    priority
                  />
                </Link>
                <button
                  onClick={() => setMenuState(!menuState)}
                  aria-label={menuState ? "Close Menu" : "Open Menu"}
                  className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
                >
                  <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                  <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                </button>
              </div>

                             {/* Desktop Navigation Links */}
               <div className="absolute inset-0 m-auto hidden size-fit lg:block">
                 <ul className="flex gap-8 text-sm">
                   {/* Quick Actions */}
                  <li>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={`text-muted-foreground hover:text-accent-foreground flex items-center gap-1 duration-150 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          <Globe className="h-4 w-4" />
                          <span>Language</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="w-48">
                        <DropdownMenuLabel>Select Language</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {languages.map((lang) => (
                          <DropdownMenuItem
                            key={lang.code}
                            className={currentLanguage === lang.code ? "bg-muted" : ""}
                            onClick={() => changeLanguage(lang.code)}
                          >
                            <span className="flex-1">{lang.name}</span>
                            {currentLanguage === lang.code && <span className="text-primary">✓</span>}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>

                  <li>
                    <Link
                      href="/search"
                      className={`text-muted-foreground hover:text-accent-foreground flex items-center gap-1 duration-150 ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                      <Search className="h-4 w-4" />
                      <span>Search</span>
                    </Link>
                  </li>

                  {/* Authenticated Navigation Items */}
                  {authUser &&
                    type === "authenticated" &&
                    authenticatedItems.map((item) => (
                      <li key={item.title}>
                        <Link
                          href={item.href}
                          className={`text-muted-foreground hover:text-accent-foreground flex items-center gap-1 duration-150 ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                          {item.icon && <item.icon className="h-4 w-4" />}
                          <span>{item.title}</span>
                          {item.title === "Notifications" && notificationCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] h-4 min-w-4 flex items-center justify-center px-1 ml-1"
                            >
                              {notificationCount > 99 ? "99+" : notificationCount}
                            </Badge>
                          )}
                        </Link>
                      </li>
                    ))}

                  {/* Unauthenticated Navigation Items */}
                  {type === "unauthenticated" &&
                    unauthenticatedItems.map((item) => (
                      <li key={item.title}>
                        <Link
                          href={item.href}
                          className={`text-muted-foreground hover:text-accent-foreground flex items-center gap-1 duration-150 ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                          {item.icon && <item.icon className="h-4 w-4" />}
                          <span>{item.title}</span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>

              {/* Right Side Actions */}
              <div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                {/* Mobile Navigation */}
                <div className="lg:hidden">
                  <ul className="space-y-6 text-base">
                    {/* Language Selector */}
                    <li>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={`text-muted-foreground hover:text-accent-foreground flex items-center gap-2 duration-150 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <Globe className="h-5 w-5" />
                            <span>Language</span>
                          </button>
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
                              <span className="flex-1">{lang.name}</span>
                              {currentLanguage === lang.code && <span className="text-primary">✓</span>}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>

                    <li>
                      <Link
                        href="/search"
                        className={`text-muted-foreground hover:text-accent-foreground flex items-center gap-2 duration-150 ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        <Search className="h-5 w-5" />
                        <span>Search</span>
                      </Link>
                    </li>

                    {/* Authenticated Items */}
                    {authUser &&
                      type === "authenticated" &&
                      authenticatedItems.map((item) => (
                        <li key={item.title}>
                          <Link
                            href={item.href}
                            className={`text-muted-foreground hover:text-accent-foreground flex items-center gap-2 duration-150 ${isDark ? 'text-white' : 'text-gray-900'}`}
                          >
                            {item.icon && <item.icon className="h-5 w-5" />}
                            <span>{item.title}</span>
                            {item.title === "Notifications" && notificationCount > 0 && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] h-5 min-w-5 flex items-center justify-center px-1 ml-2"
                              >
                                {notificationCount > 99 ? "99+" : notificationCount}
                              </Badge>
                            )}
                          </Link>
                        </li>
                      ))}

                    {/* Special authenticated features */}
                    {authUser && userData && type === "authenticated" && userData.role !== "user" && (
                      <>
                        <li>
                          <Link
                            href="/map"
                            className={`text-muted-foreground hover:text-accent-foreground flex items-center gap-2 duration-150 ${isDark ? 'text-white' : 'text-gray-900'}`}
                          >
                            <MapPin className="h-5 w-5" />
                            <span>Set Location</span>
                          </Link>
                        </li>
                        <li>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={`text-muted-foreground hover:text-accent-foreground flex items-center gap-2 duration-150 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                <Plus className="h-5 w-5" />
                                <span>Create</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem asChild>
                                <Link href="/create-post" className="flex items-center gap-2">
                                  <span>Create Post</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setIsAddPhotoModalOpen(true)}>
                                <span>Add Photos</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href="/add-product" className="flex items-center gap-2">
                                  <span>Add Product</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href="/add-bulk-products" className="flex items-center gap-2">
                                  <span>Add Bulk Product</span>
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      </>
                    )}

                    {/* Unauthenticated Items */}
                    {type === "unauthenticated" &&
                      unauthenticatedItems.map((item) => (
                        <li key={item.title}>
                          <Link
                            href={item.href}
                            className={`text-muted-foreground hover:text-accent-foreground flex items-center gap-2 duration-150 ${isDark ? 'text-white' : 'text-gray-900'}`}
                          >
                            {item.icon && <item.icon className="h-5 w-5" />}
                            <span>{item.title}</span>
                          </Link>
                        </li>
                      ))}

                    {/* Theme Toggle for Mobile */}
                    <li>
                      <div className="flex items-center gap-2">
                        <span className={`text-muted-foreground ${isDark ? 'text-white' : 'text-gray-900'}`}>Theme</span>
                        <ThemeToggle />
                      </div>
                    </li>
                  </ul>
                </div>

                                 {/* Action Buttons */}
                 <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                   {/* Cart Icon for authenticated users */}
                  {type === "authenticated" && (
                    <div className={cn("flex items-center", isScrolled && "lg:hidden")}>
                      <CartIcon userData={userData} />
                    </div>
                  )}

                  {/* Special authenticated features for desktop */}
                  {authUser && userData && type === "authenticated" && userData.role !== "user" && (
                    <>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className={cn("hidden lg:inline-flex", isScrolled && "lg:hidden")}
                      >
                        <Link href="/map">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>Set Location</span>
                        </Link>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn("hidden lg:inline-flex", isScrolled && "lg:hidden")}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            <span>Create</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href="/create-post" className="flex items-center gap-2">
                              <span>Create Post</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setIsAddPhotoModalOpen(true)}>
                            <span>Add Photos</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/add-product" className="flex items-center gap-2">
                              <span>Add Product</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/add-bulk-products" className="flex items-center gap-2">
                              <span>Add Bulk Product</span>
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}

                  {/* Theme Toggle */}
                  <div className={cn("flex items-center", isScrolled ? "lg:inline-flex" : "hidden lg:inline-flex")}>
                    <ThemeToggle />
                  </div>

                  {/* Auth Buttons */}
                  {authUser && type === "authenticated" ? (
                    <Button
                      size="sm"
                      onClick={logoutHandler}
                      variant="secondary"
                      className={cn(
                        isDark ? "bg-white text-black hover:bg-gray-100" : "bg-gray-900 text-white hover:bg-gray-800",
                        isScrolled ? "lg:inline-flex" : "hidden lg:inline-flex",
                      )}
                    >
                      <span>Sign out</span>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="sm"
                      variant="secondary"
                      className={cn(
                        isDark ? "bg-white text-black hover:bg-gray-100" : "bg-gray-900 text-white hover:bg-gray-800",
                        isScrolled ? "lg:inline-flex" : "hidden lg:inline-flex",
                      )}
                    >
                      <Link href={authUser ? "/feed" : "/login"}>
                        <span>Get Started</span>
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Add Photo Modal */}
        {authUser && (
          <AddPhotoModal
            isOpen={isAddPhotoModalOpen}
            onClose={() => setIsAddPhotoModalOpen(false)}
            userId={authUser.uid}
          />
        )}
      </header>
    </CartProvider>
  )
}

export default TopNavbar