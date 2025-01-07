"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/AuthContext";
import useGetUser from "@/hooks/useGetUser";
import { auth } from "@/lib/firebase";
import { authenticatedItems, unauthenticatedItems } from "@/constants/navLinks";

export default function TopNavbar() {
  const { user, logout } = useAuth();
  const userData = useGetUser(auth.currentUser?.uid);

  // If Authenticated:
  // - Home
  // - Notifications
  // - Profile
  // - Create
  // - Logout

  // If UnAuthenticated
  // - Home
  // - Pricing
  // - Contact Us
  // - Get Started

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span>Thikana</span>
        </Link>

        <div className="flex items-center gap-6">
          <ThemeToggle />

          {user
            ? authenticatedItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  {item.icon && <item.icon className="h-5 w-5" />}
                  <span className="hidden sm:inline">{item.title}</span>
                </Link>
              ))
            : unauthenticatedItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  {item.icon && <item.icon className="h-5 w-5" />}
                  <span className="hidden sm:inline">{item.title}</span>
                </Link>
              ))}

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            {user ? (
              <Button size="sm" onClick={logout}>
                Sign out
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link href="/login">Get Started</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
