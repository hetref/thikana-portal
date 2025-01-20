"use client";
import { useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import AddPhotoModal from "@/components/AddPhotoModal"

export default function Navbar({
  user
}) {
  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false)

  return (
    (<div
      className="flex h-[60px] w-full items-center justify-between bg-background px-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-muted-foreground hover:text-primary">
          Home
        </Link>
        <Link href="/profile" className="text-muted-foreground hover:text-primary">
          Profile
        </Link>
      </div>
      {user && (
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground hover:text-primary">Logout</button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary">
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">Create</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/create" className="flex items-center gap-2">
                  <span>Create Post</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsAddPhotoModalOpen(true)}>
                <span>Add Photos</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AddPhotoModal
            isOpen={isAddPhotoModalOpen}
            onClose={() => setIsAddPhotoModalOpen(false)}
            userId={user.id} />
        </div>
      )}
    </div>)
  );
}

