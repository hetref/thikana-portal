"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import useGetUser from "@/hooks/useGetUser";
import { auth } from "@/lib/firebase";
import { authenticatedItems, unauthenticatedItems } from "@/constants/navLinks";
import Image from "next/image";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { redirect, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddPhotoModal from "./AddPhotoModal";

export default function TopNavbar({ type = "unauthenticated" }) {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src="/logo/black-logo.png"
            alt="Thikana Logo"
            width={150}
            height={64}
            className="h-16 object-contain"
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
          <ThemeToggle />

          {user &&
            type === "authenticated" &&
            authenticatedItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
              >
                {item.icon && <item.icon className="h-5 w-5" />}
                <span className="block">{item.title}</span>
              </Link>
            ))}

          {user && type === "authenticated" && (
            <>
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
                </DropdownMenuContent>
              </DropdownMenu>
              {user && (
                <AddPhotoModal
                  isOpen={isAddPhotoModalOpen}
                  onClose={() => setIsAddPhotoModalOpen(false)}
                  userId={user.uid}
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
            {user && type === "authenticated" ? (
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
                <Link href={user ? "/feed" : "/login"}>Get Started</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
