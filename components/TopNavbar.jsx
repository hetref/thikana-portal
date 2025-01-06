"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Bell, User, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/AuthContext";
import useGetUser from "@/hooks/useGetUser";
import { auth } from "@/lib/firebase";

export default function TopNavbar() {
  const { user, logout } = useAuth();
  const userData = useGetUser(auth.currentUser.uid);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span>Thikana</span>
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center gap-6">
          <ThemeToggle />

          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <Home className="h-5 w-5" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          <Link
            href="/notifications"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <Bell className="h-5 w-5" />
            <span className="hidden sm:inline">Notifications</span>
          </Link>

          <Link
            href={`/${userData?.username}?user=${userData?.uid}`}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <User className="h-5 w-5" />
            <span className="hidden sm:inline">Profile</span>
          </Link>
          <Link
            href="/create-post"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Create</span>
          </Link>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            {user ? (
              <Button variant="ghost" size="sm" onClick={logout}>
                Sign out
              </Button>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/signUp">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
