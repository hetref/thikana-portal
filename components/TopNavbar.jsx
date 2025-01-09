"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/AuthContext";
import useGetUser from "@/hooks/useGetUser";
import { auth } from "@/lib/firebase";
import { authenticatedItems, unauthenticatedItems } from "@/constants/navLinks";
import Image from "next/image";

export default function TopNavbar({ type = "unauthenticated" }) {
  const { user, logout } = useAuth();
  const userData = useGetUser(auth.currentUser.uid);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold w-fit">
          <Image
            src="/logo/black-logo.png"
            alt="Thikana Logo"
            width={150}
            height={64}
            className="h-16 object-contain w-fit"
          />
        </Link>

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
            {user && type === "authenticated" ? (
              <Button size="sm" onClick={logout}>
                Sign out
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link href={user ? "/feed" : "/login"}>Get Started</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
