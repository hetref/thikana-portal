"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/wb/mode-toggle"
import { Laptop, Smartphone, Tablet, Save, Eye, Upload, Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import PropTypes from "prop-types"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"

export function Header({ device, setDevice, onSave, isSaving, saveStatus }) {
  const router = useRouter()

  const handlePreview = () => {
    if (auth?.currentUser?.uid) {
      router.push(`/preview/${auth.currentUser.uid}`)
    }
  }

  return (
    <header className="border-b border-border h-14 px-4 flex items-center justify-between bg-background">
      <div className="flex items-center">
        <h1 className="text-xl font-bold text-primary mr-8">Thikanna</h1>
        <div className="flex items-center space-x-1 border-r border-border pr-4 mr-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDevice("desktop")}
                  className={cn(device === "desktop" && "bg-accent")}
                >
                  <Laptop className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desktop View</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDevice("tablet")}
                  className={cn(device === "tablet" && "bg-accent")}
                >
                  <Tablet className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tablet View</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDevice("mobile")}
                  className={cn(device === "mobile" && "bg-accent")}
                >
                  <Smartphone className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mobile View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onSave}
                  disabled={isSaving}
                  className={cn(
                    saveStatus === "success" && "bg-green-100 text-green-700 border-green-300",
                    saveStatus === "error" && "bg-red-100 text-red-700 border-red-300"
                  )}
                >
                  {isSaving ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-1">
                        <Upload className="h-4 w-4" />
                      </span>
                      Saving...
                    </span>
                  ) : saveStatus === "success" ? (
                    <span className="flex items-center">
                      <Check className="h-4 w-4 mr-1" />
                      Saved
                    </span>
                  ) : saveStatus === "error" ? (
                    <span className="flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Error
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save to Firebase</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview Website</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <ModeToggle />
        <Button variant="default" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Publish
        </Button>
      </div>
    </header>
  )
}

Header.propTypes = {
  device: PropTypes.string.isRequired,
  setDevice: PropTypes.func.isRequired,
  onSave: PropTypes.func,
  isSaving: PropTypes.bool,
  saveStatus: PropTypes.string,
}

