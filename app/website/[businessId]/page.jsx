import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { notFound } from "next/navigation";
import WebsiteRenderer from "./WebsiteRenderer";

// Metadata for SEO
export async function generateMetadata({ params }) {
  try {
    const websiteRef = doc(db, "websites", params.businessId);
    const websiteDoc = await getDoc(websiteRef);

    if (!websiteDoc.exists()) {
      return {
        title: "Website Not Found",
      };
    }

    return {
      title: `${params.businessId}'s Website`,
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Website",
    };
  }
}

export default async function WebsitePage({ params }) {
  try {
    const websiteRef = doc(db, "websites", params.businessId);
    const websiteDoc = await getDoc(websiteRef);

    if (!websiteDoc.exists()) {
      notFound();
    }

    const websiteData = websiteDoc.data();

    return <WebsiteRenderer websiteData={websiteData} />;
  } catch (error) {
    console.error("Error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Error</h1>
          <p className="mt-2 text-gray-600">Failed to load website</p>
        </div>
      </div>
    );
  }
}
