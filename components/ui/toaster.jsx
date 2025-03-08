"use client"

import {
  useToast
} from "@/components/ui/use-toast"
import { X } from "lucide-react"

export function Toaster() {
  const { toast, dismissToast } = useToast()

  return (
    <div className="fixed bottom-0 right-0 p-4 z-50 max-h-screen overflow-hidden pointer-events-none flex flex-col-reverse gap-2">
      {/* Toasts will be rendered here by the useToast provider */}
    </div>
  )
} 