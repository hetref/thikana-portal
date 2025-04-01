"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Laptop, Smartphone, Tablet, Save, Eye, Upload, Check, AlertCircle, Link } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import PropTypes from "prop-types"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function Header({ device, setDevice, onSave, isSaving, saveStatus }) {
  const router = useRouter()
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState(null) // "success", "error", or null
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState("")
  const [copied, setCopied] = useState(false)

  const handlePreview = () => {
    if (auth?.currentUser?.uid) {
      router.push(`/preview/${auth.currentUser.uid}`)
    }
  }

  const handlePublish = async () => {
    if (!auth?.currentUser?.uid) {
      alert("Please log in to publish your website")
      return
    }
    
    setIsPublishing(true)
    setPublishStatus(null)
    
    try {
      // First, save the current state
      await onSave()
      
      // Get reference to the website document
      const websiteRef = doc(db, "websites", auth.currentUser.uid)
      
      // Update the website document to mark it as published
      await updateDoc(websiteRef, {
        isPublished: true,
        publishedAt: new Date().toISOString(),
        status: "published"
      })
      
      // Generate the public URL
      const publishUrl = `${window.location.origin}/site/${auth.currentUser.uid}`
      setPublishedUrl(publishUrl)
      
      setPublishStatus("success")
      // Show the dialog with the link
      setShowPublishDialog(true)
      
    } catch (error) {
      console.error("Error publishing website:", error)
      setPublishStatus("error")
    } finally {
      setIsPublishing(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publishedUrl).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      (err) => {
        console.error("Could not copy text: ", err)
      }
    )
  }

  return (
    <>
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
          <Button 
            variant="default" 
            size="sm" 
            onClick={handlePublish}
            disabled={isPublishing}
            className={cn(
              publishStatus === "success" && "bg-green-600",
              publishStatus === "error" && "bg-red-600"
            )}
          >
            {isPublishing ? (
              <span className="flex items-center">
                <span className="animate-spin mr-1">
                  <Upload className="h-4 w-4" />
                </span>
                Publishing...
              </span>
            ) : publishStatus === "success" ? (
              <span className="flex items-center">
                <Check className="h-4 w-4 mr-1" />
                Published
              </span>
            ) : publishStatus === "error" ? (
              <span className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                Error
              </span>
            ) : (
              <span className="flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Publish
              </span>
            )}
          </Button>
        </div>
      </header>

      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Website Published!</DialogTitle>
            <DialogDescription>
              Your website is now live and can be shared with anyone using the link below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-4">
            <Input 
              value={publishedUrl} 
              readOnly 
              className="flex-1"
            />
            <Button onClick={copyToClipboard} variant="outline" size="sm">
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={() => window.open(publishedUrl, '_blank')}>
              <Eye className="h-4 w-4 mr-2" />
              Visit Site
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

Header.propTypes = {
  device: PropTypes.string.isRequired,
  setDevice: PropTypes.func.isRequired,
  onSave: PropTypes.func,
  isSaving: PropTypes.bool,
  saveStatus: PropTypes.string,
}

