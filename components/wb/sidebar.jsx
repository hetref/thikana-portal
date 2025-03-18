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
import { defaultSections } from "@/lib/default-sections"

export function Sidebar({ 
  sections, 
  selectedSection, 
  onAddSection, 
  onSelectSection, 
  activeTab, 
  onTabChange,
  currentPage,
  onPageChange,
  pages,
  websiteRef
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [newPageName, setNewPageName] = useState("")
  const [isPageDialogOpen, setIsPageDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pageToDelete, setPageToDelete] = useState(null)

  // Group sections by type for better organization
  const groupedSections = defaultSections.reduce((groups, section) => {
    const type = section.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(section);
    return groups;
  }, {});

  // Section type display names
  const sectionTypeNames = {
    "hero": "Hero Sections",
    "about": "About Sections",
    "services": "Services Sections", 
    "contact": "Contact Sections",
    "testimonials": "Testimonial Sections",
    "team": "Team Sections",
    "features": "Feature Sections",
    "gallery": "Gallery Sections"
  };

  // Section type icons
  const sectionTypeIcons = {
    "hero": <LayoutTemplate className="h-5 w-5" />,
    "about": <FileText className="h-5 w-5" />,
    "services": <LayoutGrid className="h-5 w-5" />,
    "contact": <MessageCircle className="h-5 w-5" />,
    "testimonials": <Star className="h-5 w-5" />,
    "team": <Users className="h-5 w-5" />,
    "features": <Type className="h-5 w-5" />,
    "gallery": <Image className="h-5 w-5" />
  };

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

  // Filter all elements based on search term
  const filteredElements = [...elementItems, ...formElements].filter(
    (element) => searchTerm === "" || element.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      
      // Instead of updating pages state directly, call the parent component's handler
      onPageChange(pageId) // Switch to the new page
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

  // Handle deleting a page
  const handleDeletePage = async () => {
    if (!pageToDelete || pageToDelete.id === "home") return

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
      <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col h-full">
        <TabsList className="grid grid-cols-2 mx-4 my-2">
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pages" className="flex-1 flex flex-col overflow-hidden">
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
          
          <div className="flex-1 overflow-hidden relative">
            <ScrollArea className="h-full w-full" type="always">
              <div className="p-4 space-y-1">
                {pages.map((pageId) => {
                  // Create a page object with id and name for rendering
                  const page = {
                    id: pageId,
                    name: pageId.charAt(0).toUpperCase() + pageId.slice(1)
                  };
                  
                  return (
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
                        <AlertDialog 
                          open={deleteDialogOpen && pageToDelete?.id === page.id} 
                          onOpenChange={(open) => {
                            if (!open) setPageToDelete(null);
                            setDeleteDialogOpen(open);
                          }}
                        >
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
                  );
                })}
              </div>
            </ScrollArea>
          </div>
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

          <div 
            style={{ 
              maxHeight: 'calc(100vh - 130px)', 
              overflowY: 'auto !important',
              overflowX: 'hidden',
              display: 'block !important',
              paddingRight: '5px'
            }}
          >
            <div className="p-4 space-y-4 pb-20">
              {/* Display all section types with their templates */}
              {Object.keys(groupedSections)
                .filter(type => 
                  searchTerm === "" || 
                  sectionTypeNames[type]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  groupedSections[type].some(section => 
                    section.content?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    section.content?.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                )
                .map(type => (
                  <div key={`section-type-${type}`} className="mb-4">
                    <div className="flex items-center mb-2 sticky top-0 bg-background/80 backdrop-blur-sm py-1 z-10">
                      <div className="mr-2 text-primary">{sectionTypeIcons[type] || <LayoutTemplate className="h-5 w-5" />}</div>
                      <h3 className="text-sm font-medium">{sectionTypeNames[type] || type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {groupedSections[type].map(section => (
                        <button
                          key={section.id}
                          className="flex flex-col p-2 rounded-md border border-border hover:bg-accent transition-colors text-left"
                          onClick={() => onAddSection(section.type, section.id)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium truncate max-w-[120px]">{section.content.title}</span>
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">{section.id.split('-')[1]}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1 line-clamp-1">{section.content.subtitle}</p>
                          <div 
                            className="w-full h-16 rounded-sm overflow-hidden bg-accent/20 flex items-center justify-center text-xs text-muted-foreground"
                            style={{
                              backgroundColor: section.style?.backgroundColor || "#f8f9fa",
                              color: section.style?.textColor || "#000000"
                            }}
                          >
                            <div className="text-center p-1">
                              <div className="font-medium text-2xs">{section.content.title}</div>
                              <div className="text-2xs opacity-70 line-clamp-1">{section.content.subtitle}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

              {/* Elements section */}
              <div>
                <div className="flex items-center mb-2 sticky top-0 bg-background/80 backdrop-blur-sm py-1 z-10">
                  <div className="mr-2 text-primary"><Layers className="h-5 w-5" /></div>
                  <h3 className="text-sm font-medium">Add Elements</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {filteredElements.map((element) => (
                    <div
                      key={`element-${element.type}`}
                      className="flex flex-col items-center p-2 rounded-md border border-border hover:bg-accent transition-colors cursor-grab"
                      draggable
                      onDragStart={(e) => handleElementDragStart(e, element)}
                    >
                      <div className="text-primary mb-1">{element.icon}</div>
                      <span className="text-xs text-center">{element.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  currentPage: PropTypes.string.isRequired,
  onPageChange: PropTypes.func.isRequired,
  pages: PropTypes.array,
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

