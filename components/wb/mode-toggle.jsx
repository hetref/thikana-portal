"use client"

import { useTheme } from "@/components/wb/theme-provider"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  )
}

