"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/wb/sidebar"
import { EditorCanvas } from "@/components/wb/editor-canvas"
import { PropertiesPanel } from "@/components/wb/properties-panel"
import { Header } from "@/components/wb/header"
import { defaultSections, fetchUserProducts } from "@/lib/default-sections"
import { auth, db } from "@/lib/firebase"
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { cn } from "@/lib/utils"

export function ThikannaBuilder() {
  // Base state
  const [currentPage, setCurrentPage] = useState("home")
  const [device, setDevice] = useState("desktop")
  const [sidebarTab, setSidebarTab] = useState("pages")
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // "success", "error", or null
  const [mounted, setMounted] = useState(false)
  const [userProducts, setUserProducts] = useState([]) // State to store fetched products

  // Mount effect to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Fetch user's products when component mounts
  useEffect(() => {
    const loadUserProducts = async () => {
      if (!auth?.currentUser?.uid) {
        console.warn("[ThikannaBuilder] No authenticated user found. Cannot fetch products.");
        return;
      }
      
      console.log("[ThikannaBuilder] Loading products for user:", auth.currentUser.uid);
      console.log("[ThikannaBuilder] Current auth state:", { 
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName
      });
      
      try {
        const products = await fetchUserProducts(auth.currentUser.uid);
        setUserProducts(products);
        
        // Enhanced logging for product data
        console.log("==== PRODUCT DATA FROM DATABASE ====");
        console.log(`Total products found: ${products.length}`);
        
        if (products.length > 0) {
          // Log each product with its properties
          products.forEach((product, index) => {
            console.log(`Product ${index + 1}:`, product);
            console.log(`  - ID: ${product.id}`);
            console.log(`  - Name: ${product.name || 'No name'}`);
            console.log(`  - Price: ${product.price || 'No price'}`);
            console.log(`  - Description: ${product.description?.substring(0, 50) || 'No description'}${product.description?.length > 50 ? '...' : ''}`);
            console.log(`  - Image URL: ${product.imageUrl || 'No image'}`);
            console.log(`  - Categories: ${product.category || product.categories || 'No categories'}`);
            console.log(`  - Featured: ${product.featured ? 'Yes' : 'No'}`);
            console.log(`  - New: ${product.isNew ? 'Yes' : 'No'}`);
            console.log(`  - Properties:`, Object.keys(product));
          });
          
          // Log the structure of the first product as a template
          console.log("Product data structure example:", JSON.stringify(products[0], null, 2));
        } else {
          console.warn("No products found in the database. Make sure your collection path is correct.");
          
          // Try to give the user guidance about what to check
          console.log("==== TROUBLESHOOTING TIPS ====");
          console.log("1. Check that you have products in Firebase at: Users/{userId}/products");
          console.log("2. Verify that you're signed in with the correct account");
          console.log("3. Check Firebase security rules - make sure your authenticated user has read access to this path");
          console.log("4. Verify that the products collection exists and contains documents");
          console.log("5. Check Firebase console for any errors related to your products collection");
          console.log("==============================");
        }
        console.log("====================================");
        
      } catch (error) {
        console.error("[ThikannaBuilder] Error loading products:", error);
      }
    };
    
    if (auth?.currentUser?.uid) {
      loadUserProducts();
    } else {
      console.warn("[ThikannaBuilder] No authenticated user available for product fetching");
    }
  }, [auth?.currentUser?.uid]);

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

  // Handle page changes
  const handlePageChange = (pageId) => {
    // If page doesn't exist yet, create it
    if (!pagesContent[pageId]) {
      setPagesContent(prev => ({
        ...prev,
        [pageId]: {
          sections: [],
          elements: {}
        }
      }));
    }
    
    setCurrentPage(pageId);
    setSelectedSection(null);
    setSelectedElement(null);
  };

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
          lastUpdated: new Date().toISOString(),
          // Store user ID for product retrieval
          userId: auth.currentUser.uid,
          // Store product collection path reference
          productPath: `users/${auth.currentUser.uid}/products`
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
              lastUpdated: new Date().toISOString(),
              // Add reference to current products for this page
              userProductsCount: userProducts.length,
              // Store user ID for product retrieval
              userId: auth.currentUser.uid
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
            lastUpdated: new Date().toISOString(),
            // Add reference to current products for this page
            userProductsCount: userProducts.length
          })
        }
      }
      
      console.log("Website saved successfully with product references. Product count:", userProducts.length);
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
  const handleAddSection = (type, sectionId) => {
    let newSection;
    
    if (sectionId) {
      // Find the specific section by ID if provided
      newSection = defaultSections.find((s) => s.id === sectionId);
    }
    
    // Fallback to finding by type if no ID or ID not found
    if (!newSection) {
      newSection = defaultSections.find((s) => s.type === type);
    }
    
    if (newSection) {
      // Create a deep copy with a new unique ID
      const newSectionWithId = {
        ...JSON.parse(JSON.stringify(newSection)),
        id: `section-${Date.now()}`
      };
      
      setPagesContent(prev => ({
        ...prev,
        [currentPage]: {
          ...prev[currentPage],
          sections: [...prev[currentPage].sections, newSectionWithId]
        }
      }));
      
      // Auto-select the newly added section
      setSelectedSection(newSectionWithId);
    }
  }

  const handleSelectSection = (section) => {
    setSelectedSection(section)
    setSelectedElement(null)
  }

  const handleUpdateSection = (updatedSection) => {
    console.log("Updating section:", updatedSection);
    // Create a new copy of the section to ensure React detects the change
    const newUpdatedSection = {
      ...updatedSection,
      content: { ...updatedSection.content },
      style: { ...updatedSection.style }
    };
    
    // Update the section in state
    setPagesContent(prev => {
      const updatedSections = prev[currentPage].sections.map(s => 
        s.id === newUpdatedSection.id ? newUpdatedSection : s
      );
      
      return {
        ...prev,
        [currentPage]: {
          ...prev[currentPage],
          sections: updatedSections
        }
      };
    });
    
    // Also update the selected section reference
    if (selectedSection?.id === updatedSection.id) {
      setSelectedSection(newUpdatedSection);
    }
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

  return !mounted ? null : (
    <div className={cn("flex flex-col h-screen")}>
      <Header 
        device={device} 
        setDevice={setDevice} 
        onSave={handleSaveToFirebase}
        isSaving={isSaving}
        saveStatus={saveStatus}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          onAddSection={handleAddSection}
          currentPage={currentPage}
          pages={Object.keys(pagesContent)}
          onPageChange={handlePageChange}
        />
        <div className="flex flex-1 overflow-hidden">
          <EditorCanvas 
            device={device}
            sections={getCurrentPageContent().sections}
            onSelectSection={handleSelectSection}
            selectedSection={selectedSection}
            onUpdateSection={handleUpdateSection}
            elements={getCurrentPageContent().elements || {}}
            onSelectElement={handleSelectElement}
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElement}
            onAddElement={handleAddElement}
            onDeleteSection={handleDeleteSection}
            onReorderSections={handleReorderSections}
            userProducts={userProducts}
          />
          <PropertiesPanel 
            selectedSection={selectedSection}
            onUpdateSection={handleUpdateSection}
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElement}
            onDeleteSection={handleDeleteSection}
            onDeleteElement={handleDeleteElement}
          />
        </div>
      </div>
    </div>
  )
}

