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
        
        // Try to load additional pages with different naming patterns
        let pageNumber = 2;
        let foundAdditionalPages = false;
        const pagePatterns = [
          (num) => `page-${num}.html`,
          (num) => `page${num}.html`,
          (num) => `page_${num}.html`,
        ];
        
        while (pageNumber <= 20) { // Increased limit
          let pageFound = false;
          
          for (const pattern of pagePatterns) {
            try {
              const pageFileName = pattern(pageNumber);
              const pageUrl = `${baseUrl}/${pageFileName}`;
              console.log("Trying to load:", pageUrl);
              
              const pageRes = await fetchWithCorsHandling(pageUrl);
              
              if (pageRes.ok) {
                const pageHtml = await pageRes.text();
                console.log(`Found page ${pageNumber} as ${pageFileName}, length:`, pageHtml.length);
                
                const { html: pageContent, css: pageCss } = extractInlineStyles(pageHtml);
                const newPage = ed.Pages.add({ name: `Page ${pageNumber}` });
                ed.Pages.select(newPage);
                
                if (pageContent) {
                  ed.setComponents(pageContent);
                }
                if (pageCss) {
                  ed.setStyle(pageCss);
                }
                
                foundAdditionalPages = true;
                pageFound = true;
                console.log(`Successfully loaded page ${pageNumber} from ${pageFileName}`);
                break; // Found this page, move to next number
              } else {
                console.log(`No ${pageFileName} found (${pageRes.status})`);
              }
            } catch (e) {
              console.log(`Error loading page ${pageNumber} with pattern:`, e.message);
            }
          }
          
          if (!pageFound) {
            console.log(`No page ${pageNumber} found with any pattern, stopping search`);
            break; // No more pages found
          }
          
          pageNumber++;
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
    
    // Configure asset manager for media uploads
    if (businessId) {
      setupMediaUpload(ed, businessId, websiteId);
    }
    
    // If we already have businessId, load content immediately
    if (businessId && !loadAttempted) {
      console.log("BusinessId available, loading content immediately");
      await loadInitialContent(ed, businessId);
    } else {
      console.log("BusinessId not yet available, waiting...");
      setLoading(false);
    }
  };

  // Setup media upload functionality
  const setupMediaUpload = (editor, bizId, webId) => {
    console.log('Setting up media upload for:', bizId, webId);
    
    // Configure asset manager
    const assetManager = editor.AssetManager;
    
    // Configure asset manager upload settings
    assetManager.getConfig().upload = async (files) => {
      console.log('Asset manager upload called with files:', files);
      
      const uploadPromises = Array.from(files).map(async (file) => {
        try {
          console.log('Uploading file via asset manager:', file.name);
          const uploadedAsset = await uploadMediaFile(file, bizId, webId);
          if (uploadedAsset) {
            console.log('Upload successful:', uploadedAsset);
            return {
              src: uploadedAsset.url,
              name: uploadedAsset.originalName,
              type: file.type.startsWith('image/') ? 'image' : 'file',
              size: uploadedAsset.size,
              width: 'auto',
              height: 'auto'
            };
          }
          return null;
        } catch (error) {
          console.error('Upload failed for file:', file.name, error);
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
          return null;
        }
      });

      try {
        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter(result => result !== null);
        console.log('Upload results:', successfulUploads);
        
        if (successfulUploads.length > 0) {
          toast.success(`${successfulUploads.length} file(s) uploaded successfully`);
        }
        
        return successfulUploads;
      } catch (error) {
        console.error('Batch upload error:', error);
        toast.error('Upload failed');
        return [];
      }
    };

    // Enable asset manager upload
    assetManager.getConfig().uploadFile = {
      enable: true,
    };

    // Listen for asset manager events
    editor.on('asset:upload:start', () => {
      console.log('Asset upload started');
    });

    editor.on('asset:upload:end', (result) => {
      console.log('Asset upload ended:', result);
    });

    editor.on('asset:upload:error', (error) => {
      console.error('Asset upload error:', error);
      toast.error('Media upload failed');
    });

    // Enable drag and drop for media upload on canvas
    const setupCanvasDragDrop = () => {
      const canvas = editor.Canvas.getFrameEl();
      if (canvas && canvas.contentDocument) {
        const canvasDoc = canvas.contentDocument;
        
        // Remove existing listeners to prevent duplicates
        canvasDoc.removeEventListener('dragover', handleDragOver);
        canvasDoc.removeEventListener('drop', handleDrop);
        
        canvasDoc.addEventListener('dragover', handleDragOver);
        canvasDoc.addEventListener('drop', handleDrop);
        
        console.log('Canvas drag and drop setup complete');
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = async (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      
      if (files.length > 0) {
        console.log('Files dropped on canvas:', files.length);
        
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            try {
              const uploadedAsset = await uploadMediaFile(file, bizId, webId);
              if (uploadedAsset) {
                // Add to asset manager
                assetManager.add({
                  type: 'image',
                  src: uploadedAsset.url,
                  name: uploadedAsset.originalName,
                  size: uploadedAsset.size
                });
                
                // Create an image component at drop position
                const wrapper = editor.getWrapper();
                const imageComponent = wrapper.append({
                  type: 'image',
                  src: uploadedAsset.url,
                  attributes: {
                    alt: uploadedAsset.originalName
                  },
                  style: {
                    'max-width': '100%',
                    'height': 'auto'
                  }
                })[0];
                
                // Select the newly added component
                editor.select(imageComponent);
                
                toast.success(`${file.name} uploaded and added to page`);
              }
            } catch (error) {
              console.error('Drop upload failed:', error);
              toast.error(`Failed to upload ${file.name}: ${error.message}`);
            }
          } else {
            toast.error(`${file.name} is not an image file`);
          }
        }
      }
    };

    // Setup canvas drag and drop initially
    setupCanvasDragDrop();
    
    // Re-setup when canvas is ready or refreshed
    editor.on('canvas:ready', setupCanvasDragDrop);
    editor.on('canvas:refresh', setupCanvasDragDrop);
  };

  // Upload media file to S3
  const uploadMediaFile = async (file, bizId, webId) => {
    console.log('Starting upload for:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('businessId', bizId);
      formData.append('websiteId', webId);

      console.log('Uploading to S3 via API...');
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/websites/media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
        body: formData,
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Upload API error:', error);
        throw new Error(error.message || `HTTP ${response.status}: Upload failed`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      
      if (!result.success || !result.url) {
        throw new Error('Invalid response from upload API');
      }
      
      return result;
    } catch (error) {
      console.error('Media upload error:', error);
      throw error;
    }
  };

  // Load content when businessId becomes available
  useEffect(() => {
    if (editor && businessId && editorReadyRef.current && !loadAttempted) {
      console.log("BusinessId arrived, loading content");
      loadInitialContent(editor, businessId);
      // Setup media upload if not already done
      if (!editor._mediaUploadConfigured) {
        setupMediaUpload(editor, businessId, websiteId);
        editor._mediaUploadConfigured = true;
      }
    }
  }, [businessId, editor, loadAttempted]);

  const saveAllPagesToS3 = async () => {
    if (!editor || !businessId || !websiteId) {
      console.error('Save failed: missing editor, businessId, or websiteId');
      return;
    }
    
    try {
      setSaving(true);
      const idToken = await auth.currentUser.getIdToken();
      const pages = editor.Pages.getAll();
      const payloadPages = [];
      
      console.log(`Preparing to save ${pages.length} pages for website ${websiteId}`);
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        editor.Pages.select(page);
        const name = page.get("name") || `Page ${i + 1}`;
        const html = editor.getHtml();
        const css = editor.getCss();
        
        console.log(`Page ${i + 1}: "${name}" - HTML: ${html.length} chars, CSS: ${css.length} chars`);
        payloadPages.push({ name, html, css });
      }
      
      console.log("Final payload:", {
        businessId,
        websiteId,
        pageCount: payloadPages.length,
        pages: payloadPages.map(p => ({ name: p.name, htmlLength: p.html.length, cssLength: p.css.length }))
      });
      
      const res = await fetch("/api/websites/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ businessId, websiteId, pages: payloadPages }),
      });
      
      console.log("Upload response status:", res.status);
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Upload failed:", data);
        throw new Error(data.message || `HTTP ${res.status}: Upload failed`);
      }
      
      const responseData = await res.json();
      console.log("Upload successful:", responseData);
      
      await setDoc(
        doc(db, "businesses", businessId, "websites", websiteId),
        { updatedAt: serverTimestamp() },
        { merge: true }
      );
      
      toast.success(`Website saved successfully! ${payloadPages.length} page${payloadPages.length !== 1 ? 's' : ''} uploaded.`);
      
      // Reset load attempted so it can be reloaded if needed
      setLoadAttempted(false);
      
    } catch (e) {
      console.error("Save error:", e);
      toast.error(e.message || "Failed to save website");
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
            plugins: [
              'gjs-blocks-basic',
              'gjs-plugin-forms',
              'gjs-component-countdown',
              'gjs-plugin-export',
              'gjs-style-bg'
            ],
            pluginsOpts: {
              'gjs-blocks-basic': { flexGrid: true },
              'gjs-plugin-forms': {},
              'gjs-component-countdown': {},
              'gjs-plugin-export': {},
              'gjs-style-bg': {}
            },
            assetManager: {
              upload: true,
              uploadText: 'Drop files here or click to upload',
              multiUpload: true,
              autoAdd: true,
              dropzone: true,
              openAssetsOnDrop: 1,
              uploadFile: {
                enable: true,
              },
              assets: []
            },
            canvas: {
              styles: [
                'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css'
              ]
            }
          }}
        />
      </div>
    </div>
  );
} 