"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Plus, User, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import AddPhotoModal from "./AddPhotoModal";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import useGetUser from "@/hooks/useGetUser";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const Header = () => {
  const [authUser, setAuthUser] = useState(null);
  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Get the complete user data from Firestore
  const userData = useGetUser(authUser?.uid);
  const router = useRouter();

  const logoutHandler = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout Error:", error);
      throw error;
    }
  };

  // Ensure component is mounted before rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <header className=" bg-[#ffffff]  ml-[256px]">
      <div className="px-4 pr-4 rounded-xl border-2 mr-10 mt-4">
        <div className="flex h-20 items-center justify-between mr-8">
          {/* Left side - can add logo or title here if needed */}
          <div className="flex items-center">
            {/* Reserved space for logo/title */}
          </div>

          {/* Right side - Action buttons */}
          <div className="flex items-center gap-4">
            {/* Create Dropdown - only for authenticated business users */}
            {authUser && userData && userData.role !== "user" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
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
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile Dropdown */}
            {authUser && userData && (
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
                    <span className="hidden sm:inline">{userData?.name || userData?.username || "User"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userData?.name || userData?.username || "User"}
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logoutHandler}>
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Add Photo Modal */}
      {authUser && (
        <AddPhotoModal
          isOpen={isAddPhotoModalOpen}
          onClose={() => setIsAddPhotoModalOpen(false)}
          userId={authUser.uid}
        />
      )}
    </header>
  );
};

export default Header;
