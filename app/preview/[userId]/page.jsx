"use client"

import { useState, useEffect, use } from "react"
import { doc, collection, getDocs, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { SectionRenderer } from "@/components/wb/section-renderer"
import { ElementRenderer } from "@/components/wb/element-renderer"
import { fetchUserProducts } from "@/lib/default-sections"

export default function PreviewPage({ params }) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params)
  const userId = unwrappedParams.userId

  const [websiteData, setWebsiteData] = useState(null)
  const [currentPage, setCurrentPage] = useState("home")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userProducts, setUserProducts] = useState([])

  useEffect(() => {
    const loadWebsiteData = async () => {
      try {
        console.log("Loading website data for user:", userId)
        const websiteRef = doc(db, "websites", userId)
        const websiteDoc = await getDoc(websiteRef)

        if (!websiteDoc.exists()) {
          setError("Website not found")
          setLoading(false)
          return
        }

        // Get the pages subcollection
        const pagesRef = collection(websiteRef, "pages")
        const pagesSnapshot = await getDocs(pagesRef)
        
        const pagesData = {}
        
        pagesSnapshot.forEach(doc => {
          const pageData = doc.data()
          console.log("Page data:", pageData)
          
          // Parse sections and elements, with error handling
          let sections = []
          let elements = {}
          
          try {
            sections = JSON.parse(pageData.sections || "[]")
            elements = JSON.parse(pageData.elements || "{}")
          } catch (e) {
            console.error("Error parsing page data:", e)
            sections = []
            elements = {}
          }
          
          pagesData[pageData.pageId] = {
            name: pageData.pageName,
            sections: sections,
            elements: elements
          }
        })

        console.log("Processed pages data:", pagesData)
        setWebsiteData(pagesData)
        
        // Also load user products
        try {
          console.log("Fetching products for user:", userId)
          const products = await fetchUserProducts(userId)
          console.log("Preview: Found products:", products.length)
          setUserProducts(products)
        } catch (productError) {
          console.error("Error fetching products:", productError)
        }
        
        setLoading(false)
      } catch (error) {
        console.error("Error loading website data:", error)
        setError("Error loading website")
        setLoading(false)
      }
    }

    loadWebsiteData()
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">{error}</h1>
          <p className="text-muted-foreground">Please check the URL and try again.</p>
        </div>
      </div>
    )
  }

  const currentPageData = websiteData?.[currentPage]

  // For debugging
  console.log("Preview: Rendering with products:", userProducts.length)
  if (userProducts.length > 0) {
    console.log("Preview: Sample product:", userProducts[0])
  }

  if (!currentPageData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Page not found</h1>
          <p className="text-muted-foreground">The requested page does not exist.</p>
        </div>
      </div>
    )
  }

  console.log("Rendering page:", currentPage)
  console.log("Page sections:", currentPageData.sections)
  console.log("Page elements:", currentPageData.elements)

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-muted py-4 px-6 border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">Website Preview</h1>
          <div className="flex gap-4">
            {Object.entries(websiteData).map(([pageId, page]) => (
              <button
                key={pageId}
                onClick={() => setCurrentPage(pageId)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  currentPage === pageId
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                {page.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto py-8">
        {currentPageData.sections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            elements={currentPageData.elements[section.id] || []}
            isPreview={true}
            userProducts={userProducts}
          />
        ))}
      </main>
    </div>
  )
} 