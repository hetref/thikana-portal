"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import GrapesJsStudio from "@grapesjs/studio-sdk/react";
import "@grapesjs/studio-sdk/style";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

function getPublicBaseUrl() {
  const direct = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_PUBLIC_BASE;
  const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;
  const region = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";

  console.log("Environment variables check:");
  console.log("NEXT_PUBLIC_AWS_S3_BUCKET_PUBLIC_BASE:", direct ? "SET" : "NOT SET");
  console.log("NEXT_PUBLIC_AWS_S3_BUCKET_NAME:", bucket ? bucket : "NOT SET");
  console.log("NEXT_PUBLIC_AWS_REGION:", region);

  if (direct) {
    const cleanUrl = direct.replace(/\/$/, "");
    console.log("Using direct S3 base URL:", cleanUrl);
    return cleanUrl;
  }
  
  if (bucket) {
    let constructedUrl;
    if (region === "us-east-1") {
      constructedUrl = `https://${bucket}.s3.amazonaws.com`;
    } else {
      constructedUrl = `https://${bucket}.s3.${region}.amazonaws.com`;
    }
    console.log("Constructed S3 URL:", constructedUrl);
    return constructedUrl;
  }
  
  console.error("❌ S3 Configuration Missing!");
  console.error("Please set one of the following environment variables:");
  console.error("Option 1: NEXT_PUBLIC_AWS_S3_BUCKET_PUBLIC_BASE=https://your-bucket.s3.amazonaws.com");
  console.error("Option 2: NEXT_PUBLIC_AWS_S3_BUCKET_NAME=your-bucket-name AND NEXT_PUBLIC_AWS_REGION=your-region");
  
  return null;
}

// Helper function to fetch with CORS fallback
async function fetchWithCorsHandling(url, options = {}) {
  try {
    // Try direct fetch first
    const response = await fetch(url, {
      ...options,
      mode: 'cors',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers
      }
    });
    return response;
  } catch (error) {
    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      console.log("CORS error detected, trying proxy approach...");
      // If CORS fails, try through a proxy API route with authentication
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const proxyUrl = `/api/websites/proxy?url=${encodeURIComponent(url)}`;
        return fetch(proxyUrl, {
          ...options,
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
      } catch (proxyError) {
        console.error("Proxy fetch failed:", proxyError);
        throw error; // Return original error
      }
    }
    throw error;
  }
}

// Extract CSS from <style> tags and return { html, css }
function extractInlineStyles(htmlString) {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let css = "";
  let match;
  while ((match = styleRegex.exec(htmlString)) !== null) {
    css += match[1] + "\n";
  }
  // Remove <style> tags from HTML and get body content
  let cleanHtml = htmlString.replace(styleRegex, "");
  // Try to extract just the body content
  const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    cleanHtml = bodyMatch[1];
  } else {
    // Remove DOCTYPE, html, head tags to get just content
    cleanHtml = cleanHtml.replace(/<!DOCTYPE[^>]*>/i, "");
    cleanHtml = cleanHtml.replace(/<\/?html[^>]*>/gi, "");
    cleanHtml = cleanHtml.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");
    cleanHtml = cleanHtml.replace(/<\/?body[^>]*>/gi, "");
  }
  return { html: cleanHtml.trim(), css: css.trim() };
}

export default function WebsiteBuilderPage() {
  const params = useParams();
  const websiteId = params.websiteId;
  const [businessId, setBusinessId] = useState(null);
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadAttempted, setLoadAttempted] = useState(false);
  const editorReadyRef = useRef(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        let bizId = user.uid;
        if (userDoc.exists()) {
          const u = userDoc.data();
          if (u.role === "member" && u.businessId) bizId = u.businessId;
        }
        console.log("Setting businessId:", bizId);
        setBusinessId(bizId);
      } catch (error) {
        console.error("Error getting business ID:", error);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const loadInitialContent = async (ed, bizId) => {
    if (!ed || !bizId || loadAttempted) return;
    
    try {
      console.log("Loading content for businessId:", bizId, "websiteId:", websiteId);
      setLoadAttempted(true);
      
      const base = getPublicBaseUrl();
      console.log("Public base URL:", base);
      
      if (!base) {
        console.error("Missing public S3 base URL configuration");
        throw new Error("Missing public S3 base URL envs");
      }
      
      const baseUrl = `${base}/${bizId}/websites/${websiteId}`;
      console.log("Attempting to load from:", `${baseUrl}/index.html`);
      
      // Try to load index.html first
      const indexRes = await fetchWithCorsHandling(`${baseUrl}/index.html`);
      
      console.log("Index response status:", indexRes.status);
      
      if (indexRes.ok) {
        const indexHtml = await indexRes.text();
        console.log("Loaded HTML length:", indexHtml.length);
        console.log("HTML preview:", indexHtml.substring(0, 200));
        
        const { html, css } = extractInlineStyles(indexHtml);
        console.log("Extracted HTML length:", html.length, "CSS length:", css.length);
        
        // Clear existing pages and add the loaded content
        const existingPages = ed.Pages.getAll();
        existingPages.forEach((p) => ed.Pages.remove(p));
        
        const indexPage = ed.Pages.add({ name: "Index" });
        ed.Pages.select(indexPage);
        
        if (html) {
          ed.setComponents(html);
        }
        if (css) {
          ed.setStyle(css);
        }
        
        console.log("Successfully loaded index page");
        
        // Try to load additional pages
        let pageNumber = 2;
        let foundAdditionalPages = false;
        
        while (pageNumber <= 10) {
          try {
            const pageUrl = `${baseUrl}/page-${pageNumber}.html`;
            console.log("Trying to load:", pageUrl);
            
            const pageRes = await fetchWithCorsHandling(pageUrl);
            
            if (pageRes.ok) {
              const pageHtml = await pageRes.text();
              const { html: pageContent, css: pageCss } = extractInlineStyles(pageHtml);
              const newPage = ed.Pages.add({ name: `Page ${pageNumber}` });
              ed.Pages.select(newPage);
              ed.setComponents(pageContent);
              ed.setStyle(pageCss);
              foundAdditionalPages = true;
              console.log(`Successfully loaded page ${pageNumber}`);
              pageNumber++;
            } else {
              console.log(`No page-${pageNumber}.html found (${pageRes.status})`);
              break;
            }
          } catch (e) {
            console.log(`Error loading page ${pageNumber}:`, e.message);
            break;
          }
        }
        
        // Select the first page
        const allPages = ed.Pages.getAll();
        if (allPages.length > 0) {
          ed.Pages.select(allPages[0]);
        }
        
        console.log(`Loaded website with ${allPages.length} pages`);
        toast.success(`Website loaded with ${allPages.length} page${allPages.length !== 1 ? 's' : ''}`);
        
      } else {
        console.log("No existing content found, creating blank page");
        // No existing content, create blank page
        const existingPages = ed.Pages.getAll();
        existingPages.forEach((p) => ed.Pages.remove(p));
        
        const blankPage = ed.Pages.add({ name: "Index" });
        ed.Pages.select(blankPage);
        ed.setComponents('<div class="container mx-auto p-8"><h1 class="text-3xl font-bold">New Website</h1><p class="text-gray-600">Start building your website...</p></div>');
        ed.setStyle("");
        
        toast.info("New website created. Start building!");
      }
    } catch (e) {
      console.error("Error loading from S3:", e);
      // Create blank page on error
      const existingPages = ed.Pages.getAll();
      existingPages.forEach((p) => ed.Pages.remove(p));
      
      const blankPage = ed.Pages.add({ name: "Index" });
      ed.Pages.select(blankPage);
      ed.setComponents('<div class="container mx-auto p-8"><h1 class="text-3xl font-bold">New Website</h1><p class="text-gray-600">Start building your website...</p></div>');
      ed.setStyle("");
      
      toast.error("Failed to load website. Starting with blank template.");
    } finally {
      setLoading(false);
    }
  };

  const onReady = async (ed) => {
    console.log("Editor ready");
    setEditor(ed);
    editorReadyRef.current = true;
    
    // If we already have businessId, load content immediately
    if (businessId && !loadAttempted) {
      console.log("BusinessId available, loading content immediately");
      await loadInitialContent(ed, businessId);
    } else {
      console.log("BusinessId not yet available, waiting...");
      setLoading(false);
    }
  };

  // Load content when businessId becomes available
  useEffect(() => {
    if (editor && businessId && editorReadyRef.current && !loadAttempted) {
      console.log("BusinessId arrived, loading content");
      loadInitialContent(editor, businessId);
    }
  }, [businessId, editor, loadAttempted]);

  const saveAllPagesToS3 = async () => {
    if (!editor || !businessId || !websiteId) return;
    try {
      setSaving(true);
      const idToken = await auth.currentUser.getIdToken();
      const pages = editor.Pages.getAll();
      const payloadPages = [];
      
      for (const page of pages) {
        editor.Pages.select(page);
        const name = page.get("name") || "Page";
        const html = editor.getHtml();
        const css = editor.getCss();
        payloadPages.push({ name, html, css });
      }
      
      console.log("Saving pages:", payloadPages.length);
      
      const res = await fetch("/api/websites/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ businessId, websiteId, pages: payloadPages }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Upload failed");
      }
      
      await setDoc(
        doc(db, "businesses", businessId, "websites", websiteId),
        { updatedAt: serverTimestamp() },
        { merge: true }
      );
      
      toast.success("Website saved to S3");
      
      // Reset load attempted so it can be reloaded if needed
      setLoadAttempted(false);
      
    } catch (e) {
      console.error("Save error:", e);
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100svh-70px)] w-full">
      <div className="px-4 py-2 border-b flex items-center gap-2">
        <div className="font-semibold">Website Builder</div>
        <div className="ml-auto flex items-center gap-2">
          {loading && (
            <div className="text-sm text-gray-500">Loading...</div>
          )}
          <Button onClick={saveAllPagesToS3} disabled={saving || !editor || !businessId}>
            {saving ? "Saving..." : "Save All Pages"}
          </Button>
        </div>
      </div>
      <div className="flex-1">
        <GrapesJsStudio
          onReady={onReady}
          options={{
            licenseKey: process.env.NEXT_PUBLIC_GRAPESJS_LICENSE_KEY || "FREE",
            project: {
              default: {
                pages: [
                  {
                    name: "Index",
                    component: '<div class="container mx-auto p-8"><h1 class="text-3xl font-bold">Loading...</h1></div>',
                    styles: "",
                  },
                ],
              },
            },
          }}
        />
      </div>
    </div>
  );
} 