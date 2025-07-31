"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import useGetUser from "@/hooks/useGetUser"
import { auth } from "@/lib/firebase"
import { authenticatedItems } from "@/constants/navLinks"
import Image from "next/image"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Menu, X, Plus, MapPin, Search, Globe, Bell, User, Home, Settings } from "lucide-react"
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

const MainNav = () => {
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
    } catch (error) {
      console.error("Error changing language:", error)
    }
  }

  // Get notification count
  useEffect(() => {
    let unsubscribe = () => {}

    if (authUser?.uid) {
      unsubscribe = getUnreadNotificationCount((count) => {
        setNotificationCount(count)
      }, authUser.uid)
    }

    return unsubscribe
  }, [authUser?.uid])

  // Auth state listener
  useEffect(() => {
    let unsubscribe = () => {}

    if (typeof window !== "undefined") {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        setAuthUser(user)
      })
    }

    return unsubscribe
  }, [])

  const logoutHandler = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null
  }

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-b border-border/50"
          : "bg-background/95 backdrop-blur-sm"
      )}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/feed" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="font-bold text-xl hidden sm:block">Thikana</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {/* Main Navigation Links */}
            <div className="flex items-center space-x-4">
              <Link
                href="/feed"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Feed</span>
              </Link>

              <Link
                href="/search"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent-foreground transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </Link>

              {authUser && (
                <>
                  <Link
                    href="/notifications"
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent-foreground transition-colors relative"
                  >
                    <Bell className="h-4 w-4" />
                    <span>Notifications</span>
                    {notificationCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 text-[10px] h-5 min-w-5 flex items-center justify-center px-1"
                      >
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </Badge>
                    )}
                  </Link>

                  <Link
                    href="/profile"
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent-foreground transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </>
              )}
            </div>

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 text-muted-foreground hover:text-accent-foreground"
                >
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Cart */}
            <CartProvider>
              <CartIcon />
            </CartProvider>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {authUser ? (
              <div className="flex items-center space-x-3">
                {/* Create Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Create</span>
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
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {userData?.name?.[0] || userData?.username?.[0] || "U"}
                        </span>
                      </div>
                      <span className="hidden sm:inline">{userData?.name || "User"}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {userData?.name || "User"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {userData?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/map" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>Set Location</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logoutHandler}>
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMenuState(!menuState)}
            >
              {menuState ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuState && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-background border-t border-border">
              <Link
                href="/feed"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-accent-foreground hover:bg-accent rounded-md"
                onClick={() => setMenuState(false)}
              >
                <Home className="h-4 w-4" />
                <span>Feed</span>
              </Link>

              <Link
                href="/search"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-accent-foreground hover:bg-accent rounded-md"
                onClick={() => setMenuState(false)}
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </Link>

              {authUser && (
                <>
                  <Link
                    href="/notifications"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-accent-foreground hover:bg-accent rounded-md relative"
                    onClick={() => setMenuState(false)}
                  >
                    <Bell className="h-4 w-4" />
                    <span>Notifications</span>
                    {notificationCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-auto text-[10px] h-5 min-w-5 flex items-center justify-center px-1"
                      >
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </Badge>
                    )}
                  </Link>

                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-accent-foreground hover:bg-accent rounded-md"
                    onClick={() => setMenuState(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </>
              )}

              {!authUser && (
                <div className="pt-4 space-y-2">
                  <Link href="/login" className="block">
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register" className="block">
                    <Button className="w-full">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Photo Modal */}
      <AddPhotoModal
        isOpen={isAddPhotoModalOpen}
        onClose={() => setIsAddPhotoModalOpen(false)}
        userId={authUser?.uid}
      />
    </nav>
  )
}

export default MainNav
