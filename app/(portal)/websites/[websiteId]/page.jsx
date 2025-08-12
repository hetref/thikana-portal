"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import GrapesJsStudio from "@grapesjs/studio-sdk/react";
import "@grapesjs/studio-sdk/style";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout, Palette, Rocket, Utensils, User, Dumbbell, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { websiteTemplates, getTemplatesByCategory, getTemplateById } from "@/lib/website-templates";
import Link from "next/link";

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

// Enhanced function to extract CSS from various HTML structures
function extractAllStyles(htmlString) {
  try {
    let css = "";
    
    // Extract from <style> tags in head or anywhere
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;
    while ((match = styleRegex.exec(htmlString)) !== null) {
      css += match[1] + "\n";
    }
    
    // Clean and normalize CSS
    css = css.trim();
    
    // Remove any @import statements that might cause issues
    css = css.replace(/@import[^;]*;/gi, '');
    
    // Log for debugging
    console.log("Extracted CSS length:", css.length);
    if (css.length > 100) {
      console.log("CSS preview:", css.substring(0, 200) + "...");
    } else if (css.length > 0) {
      console.log("CSS content:", css);
    }
    
    return css;
  } catch (error) {
    console.error("Error in extractAllStyles:", error);
    return "";
  }
}

// Extract CSS from <style> tags and return { html, css }
function extractInlineStyles(htmlString) {
  try {
    // Use enhanced CSS extraction
    const css = extractAllStyles(htmlString);
    
    // Remove <style> tags from HTML
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let cleanHtml = htmlString.replace(styleRegex, "");
    
    // Extract content from body tag if present
    const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      cleanHtml = bodyMatch[1];
    } else {
      // If no body tag, try to clean up HTML structure
      cleanHtml = cleanHtml.replace(/<!DOCTYPE[^>]*>/i, "");
      cleanHtml = cleanHtml.replace(/<\/?html[^>]*>/gi, "");
      cleanHtml = cleanHtml.replace(/<head[\s\S]*?>[\s\S]*?<\/head>/gi, "");
      cleanHtml = cleanHtml.replace(/<\/?body[^>]*>/gi, "");
    }
    
    // Clean up any remaining whitespace and empty lines
    cleanHtml = cleanHtml.trim();
    
    console.log("Final extracted content - HTML length:", cleanHtml.length, "CSS length:", css.length);
    
    return { html: cleanHtml, css: css };
  } catch (error) {
    console.error("Error extracting styles:", error);
    // Return safe defaults on error
    return { 
      html: htmlString || '', 
      css: '' 
    };
  }
}

// Return HTML body content while preserving CSS by moving <style> tags from <head> into the body content
function getBodyWithEmbeddedStyles(htmlString) {
  try {
    let headStyles = '';
    // Collect <style> tags inside <head>
    const headMatch = htmlString.match(/<head[\s\S]*?>[\s\S]*?<\/head>/i);
    if (headMatch) {
      const headHtml = headMatch[0];
      const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
      const styles = headHtml.match(styleRegex) || [];
      if (styles.length) {
        headStyles = styles.join('\n');
      }
    }

    // Extract body inner HTML; if missing, fallback to full string without doctype/html/head tags
    let bodyInner = '';
    const bodyMatch = htmlString.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      bodyInner = bodyMatch[1];
    } else {
      bodyInner = htmlString
        .replace(/<!DOCTYPE[^>]*>/i, '')
        .replace(/<\/?html[^>]*>/gi, '')
        .replace(/<head[\s\S]*?>[\s\S]*?<\/head>/gi, '')
        .replace(/<\/?body[^>]*>/gi, '');
    }

    // Prepend collected head styles to body content (so styles live in canvas DOM)
    const combined = `${headStyles}\n${bodyInner}`.trim();
    return combined || bodyInner || '';
  } catch (err) {
    console.error('getBodyWithEmbeddedStyles error:', err);
    return htmlString || '';
  }
}

// Improved function to properly set content in GrapesJS editor
async function setEditorContent(editor, html, css) {
  try {
    console.log("Setting editor content - HTML length:", html?.length || 0, "CSS length:", css?.length || 0);
    
    // Clear existing content first
    editor.setComponents('');
    editor.setStyle('');
    
    // Set HTML content first
    if (html && html.trim()) {
      console.log("Setting HTML components...");
      editor.setComponents(html);
      console.log("HTML content set successfully");
    }
    
    // Then set CSS styles
    if (css && css.trim()) {
      console.log("Setting CSS styles...");
      editor.setStyle(css);
      console.log("CSS styles set successfully");
    }
    
    // Force a canvas refresh to ensure content is rendered
    try {
      const canvas = editor.Canvas;
      if (canvas && typeof canvas.refresh === 'function') {
        canvas.refresh();
      }
    } catch (refreshError) {
      console.warn("Canvas refresh failed:", refreshError);
    }
    
  } catch (error) {
    console.error("Error setting editor content:", error);
    throw error;
  }
}

// Helper function to wait for editor to be fully ready
function waitForEditorReady(editor) {
  return new Promise((resolve) => {
    // Simple timeout to ensure editor is ready
    setTimeout(() => {
      resolve();
    }, 100);
  });
}

export default function WebsiteBuilderPage() {
  const params = useParams();
  const websiteId = params.websiteId;
  const [businessId, setBusinessId] = useState(null);
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadAttempted, setLoadAttempted] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
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

  const loadInitialContent = async (ed, bizId, forceReload = false) => {
    if (!ed || !bizId || (loadAttempted && !forceReload)) return;
    
    try {
      console.log("Loading content for businessId:", bizId, "websiteId:", websiteId, "forceReload:", forceReload);
      setLoadAttempted(true);
      
      // First, get a list of all HTML files for this website from S3
      const idToken = await auth.currentUser.getIdToken();
      const listResponse = await fetch(`/api/websites/list-files?businessId=${bizId}&websiteId=${websiteId}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      
      let htmlFiles = [];
      if (listResponse.ok) {
        const listData = await listResponse.json();
        htmlFiles = (listData.files || [])
          .filter(file => file.endsWith('.html'))
          .sort((a, b) => {
            // Sort so index.html comes first, then others alphabetically
            if (a === 'index.html') return -1;
            if (b === 'index.html') return 1;
            return a.localeCompare(b);
          });
        console.log("Found HTML files:", htmlFiles);
      }
      
      if (htmlFiles.length === 0) {
        console.log("No HTML files found, creating blank page");
        // No existing content, create blank page
        const existingPages = ed.Pages.getAll();
        existingPages.forEach((p) => ed.Pages.remove(p));
        
        const blankPage = ed.Pages.add({ name: "Index" });
        ed.Pages.select(blankPage);
        
        // Directly set content using GrapesJS methods for blank page
        ed.setComponents('<div class="container"><h1>New Website</h1><p>Start building your website...</p></div>');
        ed.setStyle(`
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
          }
          h1 {
            font-size: 2rem;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 1rem;
          }
          p {
            color: #6b7280;
          }
        `);
        
        toast.info("New website created. Start building!");
        setLoading(false);
        return;
      }
      
      const base = getPublicBaseUrl();
      console.log("Public base URL:", base);
      
      if (!base) {
        console.error("Missing public S3 base URL configuration");
        throw new Error("Missing public S3 base URL envs");
      }
      
      const baseUrl = `${base}/${bizId}/websites/${websiteId}`;
      
      // Clear existing pages
      const existingPages = ed.Pages.getAll();
      existingPages.forEach((p) => ed.Pages.remove(p));
      
      // Load each HTML file
      for (let i = 0; i < htmlFiles.length; i++) {
        const fileName = htmlFiles[i];
        const fileUrl = `${baseUrl}/${fileName}${forceReload ? `?v=${Date.now()}` : ''}`;
        
        try {
          console.log(`Loading file ${i + 1}/${htmlFiles.length}: ${fileName}`);
          const response = await fetchWithCorsHandling(fileUrl);
          
          if (response.ok) {
            const htmlContent = await response.text();
            console.log(`Loaded ${fileName}, length: ${htmlContent.length}`);
            
            // Determine page name based on filename
            let pageName;
            if (fileName === 'index.html') {
              pageName = 'Index';
            } else {
              // Convert filename back to readable name
              const nameWithoutExt = fileName.replace('.html', '');
              pageName = nameWithoutExt
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
            
            const newPage = ed.Pages.add({ name: pageName });
            ed.Pages.select(newPage);
            
            // Wait for editor to be ready before setting content
            await waitForEditorReady(ed);
            
            // Keep CSS inside HTML: move head <style> into body content and set as components
            const combinedHtml = getBodyWithEmbeddedStyles(htmlContent);
            ed.setComponents(combinedHtml);
            
            console.log(`Successfully loaded page: ${pageName}`);
          } else {
            console.error(`Failed to load ${fileName}: ${response.status}`);
          }
        } catch (error) {
          console.error(`Error loading ${fileName}:`, error);
        }
      }
      
      // Select the first page (Index)
      const allPages = ed.Pages.getAll();
      if (allPages.length > 0) {
        ed.Pages.select(allPages[0]);
      }
      
      console.log(`Loaded website with ${allPages.length} pages`);
      toast.success(`Website loaded with ${allPages.length} page${allPages.length !== 1 ? 's' : ''}`);
      
    } catch (e) {
      console.error("Error loading from S3:", e);
      // Create blank page on error
      const existingPages = ed.Pages.getAll();
      existingPages.forEach((p) => ed.Pages.remove(p));
      
      const blankPage = ed.Pages.add({ name: "Index" });
      ed.Pages.select(blankPage);
      
      // Directly set content using GrapesJS methods for error case
      ed.setComponents('<div class="container"><h1>New Website</h1><p>Start building your website...</p></div>');
      ed.setStyle(`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        h1 {
          font-size: 2rem;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 1rem;
        }
        p {
          color: #6b7280;
        }
      `);
      
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
    
    // Wait a moment for editor to fully initialize before loading content
    setTimeout(async () => {
      // If we already have businessId, load content
      if (businessId && !loadAttempted) {
        console.log("BusinessId available, loading content");
        try {
          await loadInitialContent(ed, businessId);
        } catch (error) {
          console.error("Error loading initial content:", error);
          setLoading(false);
        }
      } else {
        console.log("BusinessId not yet available, waiting...");
        setLoading(false);
      }
    }, 200);
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

  // Apply selected template to current page
  const applyTemplate = (templateId) => {
    if (!editor) {
      toast.error("Editor not ready");
      return;
    }

    const template = getTemplateById(templateId);
    if (!template) {
      toast.error("Template not found");
      return;
    }

    try {
      // Get current page
      const currentPage = editor.Pages.getSelected();
      
      // Apply template HTML and CSS
      editor.setComponents(template.html);
      editor.setStyle(template.css);
      
      // Update page name if it's still default
      const currentPageName = currentPage.get('name');
      if (currentPageName === 'Index' || currentPageName === 'Page 1') {
        currentPage.set('name', template.name);
      }

      setShowTemplateDialog(false);
      toast.success(`${template.name} template applied successfully!`);
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error("Failed to apply template");
    }
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'business':
        return <Rocket className="w-4 h-4" />;
      case 'food':
        return <Utensils className="w-4 h-4" />;
      case 'portfolio':
        return <User className="w-4 h-4" />;
      case 'tech':
        return <Layout className="w-4 h-4" />;
      case 'fitness':
        return <Dumbbell className="w-4 h-4" />;
      default:
        return <Palette className="w-4 h-4" />;
    }
  };

  // Get filtered templates
  const getFilteredTemplates = () => {
    if (selectedCategory === 'all') {
      return websiteTemplates;
    }
    return getTemplatesByCategory(selectedCategory);
  };

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
      
      // Force reload content from S3 with cache busting so HTML (with embedded <style>) reflects latest save
      await loadInitialContent(editor, businessId, true);
      
      // Reset flag so future non-forced loads can proceed
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
        <div className="font-semibold">
          <Link href={`/websites/${websiteId}/details`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Link>
          <h1 className="text-2xl">Website Builder</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {loading && (
            <div className="text-sm text-gray-500">Loading...</div>
          )}
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!editor}>
                <Layout className="w-4 h-4 mr-2" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Choose a Template</DialogTitle>
              </DialogHeader>
              
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="business">Business</TabsTrigger>
                  <TabsTrigger value="food">Food</TabsTrigger>
                  <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                  <TabsTrigger value="tech">Tech</TabsTrigger>
                  <TabsTrigger value="fitness">Fitness</TabsTrigger>
                </TabsList>
                
                <TabsContent value={selectedCategory} className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getFilteredTemplates().map((template) => (
                      <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              {getCategoryIcon(template.category)}
                              {template.category}
                            </Badge>
                          </div>
                          <CardDescription>{template.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {/* Template Preview */}
                          <div className="bg-gray-100 rounded-lg h-32 mb-4 flex items-center justify-center overflow-hidden">
                            <div 
                              className="text-xs scale-[0.15] origin-top-left w-[800px] h-[600px] bg-white shadow-sm"
                              dangerouslySetInnerHTML={{ __html: template.html.substring(0, 500) + '...' }}
                            />
                          </div>
                          <Button 
                            onClick={() => applyTemplate(template.id)}
                            className="w-full"
                            size="sm"
                          >
                            Use This Template
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
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
                    component: '<div class="container"><h1>New Website</h1><p>Start building your website...</p></div>',
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
              styles: []
            }
          }}
        />
      </div>
    </div>
  );
} 