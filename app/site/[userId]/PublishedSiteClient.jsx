"use client"

import { useState, useEffect } from "react"
import { SectionRenderer } from "@/components/wb/section-renderer"
import { fetchUserProducts } from "@/lib/default-sections"

export default function PublishedSiteClient({ userId, initialWebsiteData, initialProducts }) {
  const [websiteData, setWebsiteData] = useState(initialWebsiteData)
  const [currentPageId, setCurrentPageId] = useState("home")
  const [userProducts, setUserProducts] = useState(initialProducts || [])

  // Handle page change
  const handlePageChange = (pageId) => {
    console.log(`Switching to page: ${pageId}`)
    setCurrentPageId(pageId)
    
    // Scroll to top when changing pages
    window.scrollTo(0, 0)
  }

  // Get the current page data, or fall back to home
  const availablePages = Object.keys(websiteData.pages || {})
  const validPageId = availablePages.includes(currentPageId) ? currentPageId : "home"
  const currentPage = websiteData.pages?.[validPageId] || websiteData.pages?.[availablePages[0]]
  
  if (!currentPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Error</h1>
          <p className="mt-2 text-gray-600">Unable to load page content</p>
        </div>
      </div>
    )
  }
    
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      {websiteData.navigation && websiteData.navigation.length > 1 && (
        <nav className="bg-background py-4 px-6 border-b border-border w-full sticky top-0 z-50">
          <div className="w-full mx-auto flex flex-wrap items-center justify-between">
            <h1 className="text-xl font-bold text-primary">{websiteData.title || "Thikanna Site"}</h1>
            <div className="flex flex-wrap gap-4 mt-4 sm:mt-0">
              {websiteData.navigation.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handlePageChange(page.id)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    currentPageId === page.id
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
      )}

      {/* Page Content */}
      <main className="w-full">
        {currentPage.sections && currentPage.sections.map((section) => (
          <SectionRenderer
            key={`${currentPageId}-${section.id}`}
            section={section}
            elements={currentPage.elements?.[section.id] || []}
            isPreview={true}
            userProducts={userProducts}
          />
        ))}
      </main>
      
      {/* Footer */}
      <footer className="bg-muted py-4 px-6 border-t border-border w-full">
        <div className="w-full mx-auto flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {websiteData.title || "Thikanna Site"}
          </p>
          <p className="text-xs text-muted-foreground">
            Built with <a href="https://thikanna.com" className="underline" target="_blank" rel="noreferrer">Thikanna</a>
          </p>
        </div>
      </footer>
    </div>
  )
} 