"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/wb/sidebar"
import { EditorCanvas } from "@/components/wb/editor-canvas"
import { PropertiesPanel } from "@/components/wb/properties-panel"
import { Header } from "@/components/wb/header"
import { useTheme } from "@/components/wb/theme-provider"
import { defaultSections } from "@/lib/default-sections"
import { auth, db } from "@/lib/firebase"
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore"

export function ThikannaBuilder() {
  // Base state
  const [currentPage, setCurrentPage] = useState("home")
  const [device, setDevice] = useState("desktop")
  const [sidebarTab, setSidebarTab] = useState("pages")
  const { theme } = useTheme()
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // "success", "error", or null

  // Content state - now keyed by page ID
  const [pagesContent, setPagesContent] = useState({
    home: {
      sections: [],
      elements: {}
    }
  })
  
  // Selected elements state
  const [selectedSection, setSelectedSection] = useState(null)
  const [selectedElement, setSelectedElement] = useState(null)

  // Load saved data from Firebase on component mount
  useEffect(() => {
    const loadSavedData = async () => {
      if (!auth?.currentUser?.uid) return
      
      try {
        // Create the main website document reference
        const websiteRef = doc(db, "websites", auth.currentUser.uid)
        
        // First, check if the website document exists
        const websiteDoc = await getDoc(websiteRef)
        if (!websiteDoc.exists()) {
          // Create the website document if it doesn't exist
          await setDoc(websiteRef, {
            userId: auth.currentUser.uid,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          });
        }
        
        // Get the pages subcollection
        const pagesRef = collection(websiteRef, "pages")
        const pagesSnapshot = await getDocs(pagesRef)
        
        const pageIds = ["home"] // Always include home page
        const loadedPages = []
        
        pagesSnapshot.forEach(doc => {
          const pageData = doc.data()
          if (!pageIds.includes(pageData.pageId)) {
            pageIds.push(pageData.pageId)
          }
          loadedPages.push({
            id: pageData.pageId,
            name: pageData.pageName,
            documentId: doc.id
          })
        })
        
        // Initialize pages content
        const newPagesContent = {}
        
        // For each page ID, get the content
        for (const pageId of pageIds) {
          // Look for this page in loaded pages
          const pageExists = loadedPages.some(p => p.id === pageId)
          
          if (pageExists) {
            // Find the page document in the loadedPages array
            const pageDoc = loadedPages.find(p => p.id === pageId)
            if (pageDoc) {
              const pageDocRef = doc(pagesRef, pageDoc.documentId)
              const pageSnapshot = await getDoc(pageDocRef)
              if (pageSnapshot.exists()) {
                const data = pageSnapshot.data()
                newPagesContent[pageId] = {
                  sections: JSON.parse(data.sections || "[]"),
                  elements: JSON.parse(data.elements || "{}")
                }
              }
            }
          } else if (pageId === "home") {
            // Create default home content
            newPagesContent[pageId] = {
              sections: [defaultSections[0]],
              elements: {}
            }
            
            // Create the home page document in Firebase
            await setDoc(doc(pagesRef, "Home Page"), {
              userId: auth.currentUser.uid,
              pageId: "home",
              pageName: "Home Page",
              sections: JSON.stringify([defaultSections[0]]),
              elements: JSON.stringify({}),
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            })
          }
        }
        
        setPagesContent(newPagesContent)
      } catch (error) {
        console.error("Error loading website data:", error)
        // Load default for home page as fallback
        setPagesContent({
          home: {
            sections: [defaultSections[0]],
            elements: {}
          }
        })
      }
    }
    
    loadSavedData()
  }, [auth?.currentUser?.uid])

  // Handle page change
  const handlePageChange = (pageId) => {
    // Clear selected items when switching pages
    setSelectedSection(null)
    setSelectedElement(null)
    setCurrentPage(pageId)
    
    // If page doesn't exist in pagesContent yet, initialize it
    if (!pagesContent[pageId]) {
      setPagesContent(prev => ({
        ...prev,
        [pageId]: {
          sections: [],
          elements: {}
        }
      }))
    }
  }

  // Save data to Firebase
  const handleSaveToFirebase = async () => {
    if (!auth?.currentUser?.uid) {
      alert("Please log in to save your website")
      return
    }
    
    setIsSaving(true)
    setSaveStatus(null)
    
    try {
      // Get reference to the website document
      const websiteRef = doc(db, "websites", auth.currentUser.uid)
      
      // Update the main website document
      await setDoc(
        websiteRef,
        {
          lastUpdated: new Date().toISOString()
        },
        { merge: true }
      )
      
      // Get reference to the pages subcollection
      const pagesRef = collection(websiteRef, "pages")
      
      // For each page, query to find the document ID
      for (const [pageId, content] of Object.entries(pagesContent)) {
        // Query to find if the page exists
        const pageQuery = query(pagesRef, where("pageId", "==", pageId))
        const pageSnapshot = await getDocs(pageQuery)
        
        if (!pageSnapshot.empty) {
          // Page exists, update it
          const pageDoc = pageSnapshot.docs[0]
          await setDoc(
            doc(pagesRef, pageDoc.id), 
            {
              sections: JSON.stringify(content.sections),
              elements: JSON.stringify(content.elements),
              lastUpdated: new Date().toISOString()
            },
            { merge: true }
          )
        } else {
          // Page doesn't exist, create it
          const pageName = pageId === "home" ? "Home Page" : pageId.charAt(0).toUpperCase() + pageId.slice(1).replace(/-/g, " ");
          await setDoc(doc(pagesRef, pageName), {
            userId: auth.currentUser.uid,
            pageId: pageId,
            pageName: pageName,
            sections: JSON.stringify(content.sections),
            elements: JSON.stringify(content.elements),
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          })
        }
      }
      
      setSaveStatus("success")
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      console.error("Error saving website:", error)
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
    }
  }

  // Get current page content
  const getCurrentPageContent = () => {
    return pagesContent[currentPage] || { sections: [], elements: {} }
  }

  // Section handlers - updated to work with page-specific content
  const handleAddSection = (type) => {
    const newSection = defaultSections.find((s) => s.type === type)
    if (newSection) {
      const newSectionWithId = { ...newSection, id: `section-${Date.now()}` }
      
      setPagesContent(prev => ({
        ...prev,
        [currentPage]: {
          ...prev[currentPage],
          sections: [...prev[currentPage].sections, newSectionWithId]
        }
      }))
    }
  }

  const handleSelectSection = (section) => {
    setSelectedSection(section)
    setSelectedElement(null)
  }

  const handleUpdateSection = (updatedSection) => {
    setPagesContent(prev => ({
      ...prev,
      [currentPage]: {
        ...prev[currentPage],
        sections: prev[currentPage].sections.map(s => 
          s.id === updatedSection.id ? updatedSection : s
        )
      }
    }))
  }

  const handleDeleteSection = (sectionId) => {
    setPagesContent(prev => ({
      ...prev,
      [currentPage]: {
        ...prev[currentPage],
        sections: prev[currentPage].sections.filter(s => s.id !== sectionId)
      }
    }))
    
    if (selectedSection?.id === sectionId) {
      setSelectedSection(null)
    }
  }

  const handleReorderSections = (reorderedSections) => {
    setPagesContent(prev => ({
      ...prev,
      [currentPage]: {
        ...prev[currentPage],
        sections: reorderedSections
      }
    }))
  }

  // Element handlers - updated for page-specific content
  const handleAddElement = (sectionId, element) => {
    const elementWithId = { ...element, id: `element-${Date.now()}` }
    
    setPagesContent(prev => {
      const currentElements = prev[currentPage].elements || {}
      const sectionElements = currentElements[sectionId] || []
      
      return {
        ...prev,
        [currentPage]: {
          ...prev[currentPage],
          elements: {
            ...currentElements,
            [sectionId]: [...sectionElements, elementWithId]
          }
        }
      }
    })
  }

  const handleUpdateElement = (sectionId, updatedElement) => {
    setPagesContent(prev => {
      const currentElements = prev[currentPage].elements || {}
      const sectionElements = currentElements[sectionId] || []
      
      return {
        ...prev,
        [currentPage]: {
          ...prev[currentPage],
          elements: {
            ...currentElements,
            [sectionId]: sectionElements.map(el => 
              el.id === updatedElement.id ? updatedElement : el
            )
          }
        }
      }
    })
  }

  const handleDeleteElement = (sectionId, elementId) => {
    setPagesContent(prev => {
      const currentElements = prev[currentPage].elements || {}
      const sectionElements = currentElements[sectionId] || []
      
      return {
        ...prev,
        [currentPage]: {
          ...prev[currentPage],
          elements: {
            ...currentElements,
            [sectionId]: sectionElements.filter(el => el.id !== elementId)
          }
        }
      }
    })
    
    if (selectedElement?.id === elementId) {
      setSelectedElement(null)
    }
  }

  const handleSelectElement = (element, sectionId) => {
    setSelectedElement({ ...element, sectionId })
    setSelectedSection(null)
  }

  // Get current page sections and elements
  const currentPageData = getCurrentPageContent()
  const currentSections = currentPageData.sections || []
  const currentElements = currentPageData.elements || {}

  return (
    <div className={`h-screen flex flex-col bg-background ${theme}`}>
      <Header 
        device={device} 
        setDevice={setDevice} 
        onSave={handleSaveToFirebase}
        isSaving={isSaving}
        saveStatus={saveStatus}
      />
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          sections={currentSections}
          selectedSection={selectedSection}
          onAddSection={handleAddSection}
          onSelectSection={handleSelectSection}
          tab={sidebarTab}
          setTab={setSidebarTab}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          websiteRef={auth?.currentUser?.uid ? doc(db, "websites", auth.currentUser.uid) : null}
        />
        <div className="flex-1 overflow-hidden">
          <EditorCanvas
            key={`editor-canvas-${selectedElement?.id || selectedSection?.id || 'default'}`}
            sections={currentSections}
            elements={currentElements}
            selectedSection={selectedSection}
            selectedElement={selectedElement}
            onSelectSection={handleSelectSection}
            onSelectElement={handleSelectElement}
            onReorderSections={handleReorderSections}
            onAddElement={handleAddElement}
            device={device}
          />
        </div>
        {(selectedSection || selectedElement) && (
          <PropertiesPanel
            key={`properties-panel-${selectedElement?.id || selectedSection?.id || 'empty'}`}
            selectedSection={selectedSection}
            selectedElement={selectedElement}
            onUpdateSection={handleUpdateSection}
            onDeleteSection={handleDeleteSection}
            onUpdateElement={handleUpdateElement}
            onAddElement={handleAddElement}
            onDeleteElement={handleDeleteElement}
          />
        )}
      </div>
    </div>
  )
}

