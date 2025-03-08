"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  LayoutGrid,
  Palette,
  Search,
  MessageSquareText,
  Upload,
  LayoutTemplate,
  Image,
  Type,
  FileText,
  MapPin,
  MessageCircle,
  ShoppingCart,
  Star,
  Users,
  Layers,
  Square,
  FormInput,
  BoxIcon as ButtonIcon,
  Text,
  CheckSquare,
  ListOrdered,
  Mail,
  Calendar,
  Plus,
  File,
  Trash2,
  MoreVertical,
} from "lucide-react"
import PropTypes from "prop-types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { auth, db } from "@/lib/firebase"
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, setDoc } from "firebase/firestore"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export function Sidebar({ 
  sections, 
  selectedSection, 
  onAddSection, 
  onSelectSection, 
  tab, 
  setTab,
  currentPage,
  onPageChange,
  websiteRef
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [newPageName, setNewPageName] = useState("")
  const [isPageDialogOpen, setIsPageDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pageToDelete, setPageToDelete] = useState(null)
  const [pages, setPages] = useState([
    { id: "home", name: "Home Page", sections: [] }
  ])

  const sectionTemplates = [
    { type: "hero", name: "Hero Section", icon: <LayoutTemplate className="h-5 w-5" /> },
    { type: "about", name: "About Us", icon: <FileText className="h-5 w-5" /> },
    { type: "services", name: "Services", icon: <LayoutGrid className="h-5 w-5" /> },
    { type: "gallery", name: "Image Gallery", icon: <Image className="h-5 w-5" /> },
    { type: "testimonials", name: "Testimonials", icon: <Star className="h-5 w-5" /> },
    { type: "team", name: "Team Members", icon: <Users className="h-5 w-5" /> },
    { type: "contact", name: "Contact Form", icon: <MessageCircle className="h-5 w-5" /> },
    { type: "location", name: "Location Map", icon: <MapPin className="h-5 w-5" /> },
    { type: "cta", name: "Call to Action", icon: <ShoppingCart className="h-5 w-5" /> },
    { type: "features", name: "Features List", icon: <Type className="h-5 w-5" /> },
  ]

  const filteredSections = sectionTemplates.filter((section) =>
    section.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const elementItems = [
    { type: "heading", name: "Heading", icon: <Type className="h-5 w-5" /> },
    { type: "paragraph", name: "Paragraph", icon: <Text className="h-5 w-5" /> },
    { type: "button", name: "Button", icon: <ButtonIcon className="h-5 w-5" /> },
    { type: "image", name: "Image", icon: <Image className="h-5 w-5" /> },
    { type: "divider", name: "Divider", icon: <Square className="h-5 w-5" /> },
    { type: "list", name: "List", icon: <ListOrdered className="h-5 w-5" /> },
  ]

  const formElements = [
    { type: "textbox", name: "Text Input", icon: <FormInput className="h-5 w-5" /> },
    { type: "textarea", name: "Text Area", icon: <Square className="h-5 w-5" /> },
    { type: "checkbox", name: "Checkbox", icon: <CheckSquare className="h-5 w-5" /> },
    { type: "email", name: "Email Input", icon: <Mail className="h-5 w-5" /> },
    { type: "date", name: "Date Picker", icon: <Calendar className="h-5 w-5" /> },
    { type: "submit", name: "Submit Button", icon: <ButtonIcon className="h-5 w-5" /> },
  ]

  // Combined elements array with basic elements and form elements
  const allElementItems = [
    ...elementItems,
    ...formElements
  ]

  const filteredElements = allElementItems.filter((element) =>
    element.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleElementDragStart = (e, element) => {
    // Create a new object with only the serializable properties
    const serializableElement = {
      type: element.type,
      name: element.name,
      // Exclude the icon property which contains React components
      content: {
        text: element.type === "heading" ? "Heading" : 
              element.type === "paragraph" ? "Paragraph text" : 
              element.type === "button" ? "Button" : "",
        src: element.type === "image" ? "/placeholder.svg?height=200&width=300" : "",
        alt: element.type === "image" ? "Image" : "",
        placeholder: 
          element.type === "textbox" || 
          element.type === "textarea" || 
          element.type === "email" ? "Enter text..." : "",
        label: 
          element.type === "textbox" || 
          element.type === "textarea" || 
          element.type === "email" ||
          element.type === "checkbox" ||
          element.type === "date" ? "Label" : "",
        required: false,
        items: element.type === "list" ? ["Item 1", "Item 2", "Item 3"] : undefined,
      },
      style: {
        fontSize: element.type === "heading" ? "24px" : "16px",
        fontWeight: element.type === "heading" ? "bold" : "normal",
        textAlign: "left",
        color: "#000000",
        backgroundColor: element.type === "button" ? "#3b82f6" : "transparent",
        padding: element.type === "button" ? "8px 16px" : "0",
        borderRadius: element.type === "button" ? "4px" : "0",
        width: element.type === "image" ? "100%" : "auto",
        height: "auto",
      }
    }
    
    e.dataTransfer.setData("element", JSON.stringify(serializableElement))
    e.dataTransfer.effectAllowed = "copy"
  }

  // Handle adding a new page
  const handleAddPage = async () => {
    if (newPageName.trim()) {
      const pageId = newPageName.toLowerCase().replace(/\s+/g, "-")
      const newPage = {
        id: pageId,
        name: newPageName,
        sections: [],
      }
      
      setPages([...pages, newPage])
      onPageChange(newPage.id) // Switch to the new page
      setNewPageName("")
      setIsPageDialogOpen(false)
      
      // Save to Firebase if user is logged in and websiteRef is available
      if (auth?.currentUser?.uid && websiteRef) {
        try {
          // Create a document reference with the page name as the ID
          const pageDocRef = doc(websiteRef, "pages", newPageName)
          
          // Use setDoc instead of addDoc to specify the document ID
          await setDoc(pageDocRef, {
            userId: auth.currentUser.uid,
            pageId: pageId,
            pageName: newPageName,
            sections: JSON.stringify([]),
            elements: JSON.stringify({}),
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          })
        } catch (error) {
          console.error("Error saving page:", error)
        }
      }
    }
  }

  // Load user's pages from Firebase
  useEffect(() => {
    const loadPages = async () => {
      if (!auth?.currentUser?.uid || !websiteRef) return
      
      try {
        // Get the pages subcollection from the website document
        const pagesRef = collection(websiteRef, "pages")
        const pagesSnapshot = await getDocs(pagesRef)
        
        const loadedPages = []
        
        pagesSnapshot.forEach((doc) => {
          const pageData = doc.data()
          loadedPages.push({
            id: pageData.pageId,
            name: pageData.pageName,
            documentId: doc.id, // Store the document ID for easier deletion
          })
        })
        
        if (loadedPages.length > 0) {
          // Create a map of page IDs to deduplicate
          const uniquePages = {}
          
          // Add the default home page first if it doesn't exist in loaded pages
          if (!loadedPages.some(p => p.id === "home")) {
            uniquePages["home"] = { id: "home", name: "Home Page", sections: [] }
          }
          
          // Add loaded pages, ensuring no duplicates
          loadedPages.forEach(page => {
            uniquePages[page.id] = page
          })
          
          // Convert the map back to an array
          setPages(Object.values(uniquePages))
        }
      } catch (error) {
        console.error("Error loading pages:", error)
      }
    }
    
    loadPages()
  }, [auth?.currentUser?.uid, websiteRef])

  // Handle deleting a page
  const handleDeletePage = async () => {
    if (!pageToDelete || pageToDelete.id === "home") return

    // Update local state
    setPages(pages.filter(page => page.id !== pageToDelete.id))
    
    // If currently selected page is being deleted, switch to home
    if (currentPage === pageToDelete.id) {
      onPageChange("home")
    }
    
    // Delete from Firebase if user is logged in and websiteRef is available
    if (auth?.currentUser?.uid && websiteRef) {
      try {
        // Use the page name as the document ID directly
        const pageDocRef = doc(websiteRef, "pages", pageToDelete.name)
        await deleteDoc(pageDocRef)
      } catch (error) {
        console.error("Error deleting page:", error)
      }
    }
    
    setPageToDelete(null)
  }

  return (
    <div className="w-64 border-r border-border bg-muted/40 flex flex-col h-full">
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
        <TabsList className="grid grid-cols-2 mx-4 my-2">
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pages" className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-sm font-medium">Your Pages</h2>
            <Dialog open={isPageDialogOpen} onOpenChange={setIsPageDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Page</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input
                    placeholder="Page name"
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleAddPage}>Create Page</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-1">
              {pages.map((page) => (
                <div key={`page-${page.id}`} className="flex items-center justify-between group">
                  <Button
                    variant={currentPage === page.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => onPageChange(page.id)}
                  >
                    <File className="h-4 w-4 mr-2" />
                    {page.name}
                  </Button>
                  {page.id !== "home" && (
                    <AlertDialog open={deleteDialogOpen && pageToDelete?.id === page.id} onOpenChange={(open) => {
                      if (!open) setPageToDelete(null);
                      setDeleteDialogOpen(open);
                    }}>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={() => setPageToDelete(page)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the page "{page.name}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeletePage}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="sections" className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search sections and elements..."
                className="w-full pl-8 py-2 text-sm rounded-md border border-input bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Add Sections</h3>
                <div className="grid grid-cols-1 gap-2">
                  {filteredSections.map((section) => (
                    <button
                      key={`section-${section.type}`}
                      className="flex items-center p-3 rounded-md border border-border hover:bg-accent transition-colors text-left"
                      onClick={() => onAddSection(section.type)}
                    >
                      <div className="mr-3 text-primary">{section.icon}</div>
                      <span className="text-sm">{section.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">Add Elements</h3>
                <div className="grid grid-cols-2 gap-2">
                  {filteredElements.map((element) => (
                    <div
                      key={`element-${element.type}`}
                      className="flex flex-col items-center p-3 rounded-md border border-border hover:bg-accent transition-colors cursor-grab"
                      draggable
                      onDragStart={(e) => handleElementDragStart(e, element)}
                    >
                      <div className="text-primary mb-2">{element.icon}</div>
                      <span className="text-xs text-center">{element.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="theme" className="flex-1 p-4 m-0">
          <h3 className="text-sm font-medium mb-4">Theme Customization</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-xs text-muted-foreground mb-2">Color Palette</h4>
              <div className="grid grid-cols-5 gap-2">
                {["bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-yellow-500"].map((color, i) => (
                  <div key={`sidebar-item-${i}`} className="relative">
                    <div className={`${color} h-8 w-8 rounded-full cursor-pointer`}></div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs text-muted-foreground mb-2">Typography</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Type className="h-4 w-4 mr-2" />
                  Font Selection
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-xs text-muted-foreground mb-2">Layout</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Layout Options
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="flex-1 p-4 m-0">
          <h3 className="text-sm font-medium mb-4">SEO Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Page Title</label>
              <input
                type="text"
                className="w-full mt-1 p-2 text-sm rounded-md border border-input bg-background"
                placeholder="Enter page title"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Meta Description</label>
              <textarea
                className="w-full mt-1 p-2 text-sm rounded-md border border-input bg-background h-24 resize-none"
                placeholder="Enter meta description"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Keywords</label>
              <input
                type="text"
                className="w-full mt-1 p-2 text-sm rounded-md border border-input bg-background"
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="flex-1 p-4 m-0">
          <h3 className="text-sm font-medium mb-4">AI Chatbot</h3>
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-md bg-accent/20">
              <h4 className="text-sm font-medium mb-2">Chatbot Configuration</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Set up an AI chatbot to assist your website visitors.
              </p>
              <Button size="sm" className="w-full">
                Configure Chatbot
              </Button>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Chatbot Name</label>
              <input
                type="text"
                className="w-full mt-1 p-2 text-sm rounded-md border border-input bg-background"
                placeholder="e.g., Support Assistant"
                defaultValue="Thikanna Assistant"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Welcome Message</label>
              <textarea
                className="w-full mt-1 p-2 text-sm rounded-md border border-input bg-background h-20 resize-none"
                placeholder="Enter welcome message"
                defaultValue="Hello! How can I help you today?"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="publish" className="flex-1 p-4 m-0">
          <h3 className="text-sm font-medium mb-4">Publish Website</h3>
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-md bg-accent/20">
              <h4 className="text-sm font-medium mb-2">Ready to go live?</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Publish your website to make it accessible to everyone.
              </p>
              <Button size="sm" className="w-full">
                Publish Website
              </Button>
            </div>

            <div>
              <h4 className="text-xs text-muted-foreground mb-2">Domain Settings</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Globe className="h-4 w-4 mr-2" />
                  Configure Domain
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

Sidebar.propTypes = {
  sections: PropTypes.array,
  selectedSection: PropTypes.object,
  onAddSection: PropTypes.func.isRequired,
  onSelectSection: PropTypes.func.isRequired,
  tab: PropTypes.string.isRequired,
  setTab: PropTypes.func.isRequired,
  currentPage: PropTypes.string.isRequired,
  onPageChange: PropTypes.func.isRequired,
  websiteRef: PropTypes.object
}

function Globe(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" x2="22" y1="12" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

