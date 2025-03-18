import { doc, collection, getDocs, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { SectionRenderer } from "@/components/wb/section-renderer"
import { notFound } from "next/navigation"
import { fetchUserProducts } from "@/lib/default-sections"
import PublishedSiteClient from "./PublishedSiteClient"

// Configure this page to be dynamically rendered at request time
export const dynamic = "force-dynamic"
export const revalidate = 0

// Metadata for SEO
export async function generateMetadata({ params }) {
  try {
    const websiteRef = doc(db, "websites", params.userId)
    const websiteDoc = await getDoc(websiteRef)

    if (!websiteDoc.exists()) {
      return { title: "Website Not Found" }
    }

    const data = websiteDoc.data()
    return {
      title: data.title || "Thikanna Website",
      description: data.description || "A website built with Thikanna",
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return { title: "Thikanna Website" }
  }
}

export default async function SitePage({ params }) {
  const userId = params.userId

  try {
    // Pre-fetch initial data on the server
    const websiteRef = doc(db, "websites", userId)
    const websiteDoc = await getDoc(websiteRef)

    if (!websiteDoc.exists()) {
      return notFound()
    }

    const websiteData = websiteDoc.data()
    
    // Check if site is published
    if (!websiteData.isPublished) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4">This website is not published</h1>
            <p className="text-gray-600">
              The owner of this website has not published it yet.
            </p>
          </div>
        </div>
      )
    }

    // Get the pages subcollection
    const pagesRef = collection(websiteRef, "pages")
    const pagesSnapshot = await getDocs(pagesRef)
    
    const pagesData = {}
    const pageNavigation = []
    
    pagesSnapshot.forEach(doc => {
      const pageData = doc.data()
      
      // Parse sections and elements
      let sections = []
      let elements = {}
      
      try {
        sections = JSON.parse(pageData.sections || "[]")
        elements = JSON.parse(pageData.elements || "{}")
      } catch (e) {
        console.error("Error parsing page data:", e)
      }
      
      pagesData[pageData.pageId] = {
        name: pageData.pageName,
        sections: sections,
        elements: elements
      }
      
      pageNavigation.push({
        id: pageData.pageId,
        name: pageData.pageName
      })
    })

    // Pre-fetch products on the server for initial render
    let initialProducts = []
    try {
      initialProducts = await fetchUserProducts(userId)
      console.log(`[Published site] Loaded ${initialProducts.length} products for site`)
    } catch (error) {
      console.error("Error loading products:", error)
    }

    // If no pages, show an error
    if (Object.keys(pagesData).length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500">Error</h1>
            <p className="mt-2 text-gray-600">This website has no pages</p>
          </div>
        </div>
      )
    }

    // Render the client component with the initial data
    return (
      <PublishedSiteClient 
        userId={userId}
        initialWebsiteData={{
          ...websiteData,
          pages: pagesData,
          navigation: pageNavigation
        }}
        initialProducts={initialProducts}
      />
    )
  } catch (error) {
    console.error("Error loading website:", error)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Error</h1>
          <p className="mt-2 text-gray-600">Failed to load website</p>
        </div>
      </div>
    )
  }
} 