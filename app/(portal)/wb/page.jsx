'use client';

import { useState, useEffect, useRef } from 'react';
import GrapesJsStudio, {
  StudioCommands,
  ToastVariant,
} from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import MainNav from '@/components/main_nav';
import { useRouter } from 'next/navigation';

// Add keyframes for toast animations
const toastAnimationStyles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(20px); }
}
`;

const predefinedSections = {
  hero: `
    <section class="bg-gray-900 text-white py-20">
      <div class="container mx-auto px-4 text-center">
        <h1 class="text-5xl font-bold mb-4">Welcome to Our Website</h1>
        <p class="text-xl mb-8">Create something amazing with our platform</p>
        <button class="bg-blue-500 hover:bg-blue-600 px-8 py-3 rounded-lg">Get Started</button>
      </div>
    </section>
  `,
  about: `
    <section class="py-16 bg-white">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-8">About Us</h2>
        <div class="flex flex-wrap items-center">
          <div class="w-full md:w-1/2 mb-8 md:mb-0">
            <img src="https://placehold.co/600x400" alt="About Us" class="rounded-lg shadow-lg"/>
          </div>
          <div class="w-full md:w-1/2 md:pl-8">
            <p class="text-gray-600 mb-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            <p class="text-gray-600">Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          </div>
        </div>
      </div>
    </section>
  `,
  features: `
    <section class="py-16 bg-gray-100">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">Our Features</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold mb-4">Feature 1</h3>
            <p class="text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold mb-4">Feature 2</h3>
            <p class="text-gray-600">Sed do eiusmod tempor incididunt ut labore et dolore.</p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold mb-4">Feature 3</h3>
            <p class="text-gray-600">Ut enim ad minim veniam, quis nostrud exercitation.</p>
          </div>
        </div>
      </div>
    </section>
  `,
};

export default function Home() {
  const [editor, setEditor] = useState();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [userPages, setUserPages] = useState([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [customToasts, setCustomToasts] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const router = useRouter();

  const isProd = process.env.NODE_ENV === 'production';
  const saveDebounceRef = useRef(null);

  // Warn before closing tab if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!isProd) console.log('Setting up auth listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isProd) console.log('Auth state changed:', user);
      setUser(user);
      if (user) {
        await loadUserPages(user.uid);
      } else {
        setUserPages([]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowAuthModal(false);
      setAuthError('');
    } catch (error) {
      setAuthError('Failed to sign in. Please check your credentials.');
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setShowAuthModal(false);
      setAuthError('');
    } catch (error) {
      setAuthError('Failed to create account. Email might be already in use.');
    }
  };

  // Load pages belonging to the current user
  const loadUserPages = async (userId) => {
    try {
      if (!isProd) console.log('Loading pages for user:', userId);
      const pagesRef = collection(db, `users/${userId}/pages`);
      const q = query(pagesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const pages = [];
      querySnapshot.forEach((doc) => {
        pages.push({ id: doc.id, ...doc.data() });
        });
      if (!isProd) console.log('Loaded pages:', pages);
      setUserPages(pages);
      
      // If no pages exist, create a default home page
      if (pages.length === 0) {
        const defaultPage = {
          name: 'Home',
          component: `<div class="container mx-auto px-4">
            <h1 class="text-4xl font-bold text-center my-8">
              Start Building Your Website
            </h1>
            <p class="text-center text-gray-600">
              Drag and drop sections from the blocks panel to get started
            </p>
          </div>`,
          css: '',
          createdAt: serverTimestamp()
        };
        const newPageRef = await addDoc(collection(db, `users/${userId}/pages`), defaultPage);
        if (!isProd) console.log('Created default page with ID:', newPageRef.id);
        setUserPages([{ id: newPageRef.id, ...defaultPage }]);
      }
      return pages;
    } catch (error) {
      console.error('Error loading pages:', error);
      return [];
    }
  };

  // Debounced save scheduler to reduce Firestore writes
  const scheduleSave = (pageName, html, css, delayMs = 1500) => {
    if (!autoSaveEnabled || !user) return;
    setHasUnsavedChanges(true);
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      try {
        const success = await savePageContent(pageName, html, css);
        if (success) {
          setLastSaved(new Date());
          setHasUnsavedChanges(false);
          if (!isProd) console.log(`Debounced save successful for page: ${pageName}`);
        }
      } catch (e) {
        console.error('Debounced save error:', e);
      }
    }, delayMs);
  };

  // Common function to save a page's content to Firebase
  const savePageContent = async (pageName, html, css, pageProjectData = null) => {
    if (!user || !pageName) return false;
    
    try {
      if (!isProd) {
      console.log(`Saving page: ${pageName}`);
      console.log(`HTML length: ${html.length}, CSS length: ${css.length}`);
      }
      // Capture full project data safely
      let projectDataString = null;
      try {
        if (editor) {
          const pd = editor.getProjectData();
          projectDataString = JSON.stringify(pd);
        }
      } catch {}
      // Guard against Firestore 1MB limit: drop heavy project data if too big
      const approxSize =
        (pageName?.length || 0) + (html?.length || 0) + (css?.length || 0) + (projectDataString?.length || 0) + (pageProjectData?.length || 0);
      if (approxSize > 700000) {
        projectDataString = null;
      }
      
      // Find existing page or create new data
      const existingPageIndex = userPages.find(p => p.name === pageName);
      const pageData = {
        name: pageName,
        component: html,
        css: css,
        // Save both full project data and page-specific data (projectData may be null if large)
        projectData: projectDataString,
        pageProjectData: pageProjectData || null,
        updatedAt: serverTimestamp()
      };
      
      if (existingPageIndex) {
        const pageId = userPages[existingPageIndex].id;
        await setDoc(doc(db, `users/${user.uid}/pages`, pageId), pageData, { merge: true });
        const updatedPages = [...userPages];
        updatedPages[existingPageIndex] = { id: pageId, ...pageData };
        setUserPages(updatedPages);
        if (!isProd) console.log(`Updated page ${pageName} in Firebase and local state`);
        return true;
      } else {
        // Create new page
        pageData.createdAt = serverTimestamp();
        const newPageRef = await addDoc(collection(db, `users/${user.uid}/pages`), pageData);
        
        // Update local state
        setUserPages([...userPages, { id: newPageRef.id, ...pageData }]);
        
        if (!isProd) console.log(`Created new page ${pageName} in Firebase and local state`);
        return true;
      }
    } catch (error) {
      console.error('Error saving page content:', error);
      return false;
    }
  };
  
  const getProjetData = () => {
    if (editor) {
      try {
        const currentPage = editor.Pages.getSelected();
        if (!currentPage) {
          console.error('No page selected');
          showToast('log-project-data-error');
          return;
        }
        const pageName = currentPage.get('name');
        const html = editor.getHtml();
        const css = editor.getCss();
        if (!isProd) {
        console.log(`HTML length: ${html.length}, CSS length: ${css.length}`);
        console.log('HTML Preview:', html.substring(0, 100) + '...');
        console.log('CSS Preview:', css.substring(0, 100) + '...');
        }
        if (user) {
          (async () => {
            const success = await savePageContent(pageName, html, css);
            if (success) {
              setLastSaved(new Date());
              showToast('log-project-data-saved');
            } else {
              showToast('log-project-data-error');
            }
          })();
        } else {
          if (!isProd) console.log('User not authenticated, cannot save page');
          showToast('log-project-data');
        }
      } catch (error) {
        console.error('Error in getProjetData:', error);
        showToast('log-project-data-error');
      }
    }
  };

  const saveDesign = async () => {
    if (!user || !editor) return;
    try {
      const pages = editor.Pages.getAll();
      if (!isProd) console.log(`Saving all ${pages.length} pages`);
      const currentPage = editor.Pages.getSelected();
      const fullProjectData = editor.getProjectData();
      if (!isProd) console.log('Full project data captured');
      const savePromises = pages.map(async (page) => {
        try {
          const pageName = page.get('name');
          const pageId = page.get('id');
          editor.Pages.select(page);
          const html = editor.getHtml();
          const css = editor.getCss();
          const pageData = fullProjectData.pages?.find((p) => p.id === pageId);
          const success = await savePageContent(pageName, html, css, pageData ? JSON.stringify(pageData) : null);
          return !!success;
        } catch (error) {
          console.error(`Error saving page ${page.get('name')}:`, error);
          return false;
        }
      });
      const results = await Promise.all(savePromises);
      const successCount = results.filter(Boolean).length;
      if (currentPage) editor.Pages.select(currentPage);
      setLastSaved(new Date());
      successCount > 0 ? showToast('design-saved') : showToast('design-save-error');
    } catch (error) {
      console.error('Error saving design:', error);
      showToast('design-save-error');
    }
  };

  const onReady = async (editor) => {
    if (!isProd) console.log('Editor loaded', editor);
    setEditor(editor);

    try {
      // Add custom blocks
      editor.Blocks.add('sections', { label: 'Sections', category: 'Sections', content: '', select: true });
    Object.entries(predefinedSections).forEach(([name, content]) => {
        editor.Blocks.add(`section-${name}`, { label: name.charAt(0).toUpperCase() + name.slice(1), category: 'Sections', content, select: true });
    });
      
      // Helper to apply CSS directly to canvas
      const applyStylesDirectly = (page, css) => {
        try {
          if (!css || typeof css !== 'string' || !css.trim()) return;
          const frame = editor.Canvas.getFrameEl();
          if (!frame) return;
          const doc = frame.contentDocument || frame.contentWindow.document;
          const styleId = `page-styles-${page.get('id')}`;
          const existingStyle = doc.getElementById(styleId);
          if (existingStyle) existingStyle.remove();
          const styleEl = doc.createElement('style');
          styleEl.id = styleId;
          styleEl.innerHTML = css;
          doc.head.appendChild(styleEl);
        } catch (err) {
          console.error('Error applying styles directly:', err);
        }
      };
      
      // Ensure CSS is applied after frame loads
      editor.on('canvas:frame:load', () => {
        const currentPage = editor.Pages.getSelected();
        if (currentPage) {
          const css = editor.getCss();
          if (css) applyStylesDirectly(currentPage, css);
        }
      });

      // Reapply CSS on page select
      editor.on('page:select', (page) => {
        if (!page) return;
        const pageData = userPages.find((p) => p.name === page.get('name'));
        editor.getCss({ clear: true });
        let css = '';
        if (pageData?.pageProjectData) {
          try {
            const projectData = JSON.parse(pageData.pageProjectData);
            css = projectData.styles || projectData.style || '';
          } catch {}
        }
        if (!css && pageData?.css) css = pageData.css;
        if (css) {
          editor.setStyle(css);
          applyStylesDirectly(page, css);
        }
      });

      // Mark unsaved and schedule save
      const scheduleSaveFromEditor = () => {
        if (!user || !autoSaveEnabled) return;
        const currentPage = editor.Pages.getSelected();
        if (!currentPage) return;
        const pageName = currentPage.get('name');
        const html = editor.getHtml();
        const css = editor.getCss();
        scheduleSave(pageName, html, css);
      };

      editor.on('component:update', scheduleSaveFromEditor);
      editor.on('style:update', scheduleSaveFromEditor);
      editor.on('component:add', scheduleSaveFromEditor);
      editor.on('component:remove', scheduleSaveFromEditor);

      // Load user pages into the editor
      if (user && userPages.length > 0) {
        const existingPages = editor.Pages.getAll();
        existingPages.forEach((p) => editor.Pages.remove(p));
        for (const page of userPages) {
          try {
            if (page.pageProjectData) {
              try {
                const pageData = JSON.parse(page.pageProjectData);
                const newPage = editor.Pages.add({ id: pageData.id || page.id, name: page.name || 'Untitled Page' });
                editor.Pages.select(newPage);
                if (pageData.component) editor.setComponents(pageData.component);
                else if (pageData.components) editor.setComponents(pageData.components);
                else if (page.component) editor.setComponents(page.component);
                if (pageData.styles) {
                  editor.getCss({ clear: true });
                  editor.setStyle(pageData.styles);
                  applyStylesDirectly(newPage, pageData.styles);
                } else if (pageData.style) {
                  editor.getCss({ clear: true });
                  editor.setStyle(pageData.style);
                  applyStylesDirectly(newPage, pageData.style);
                } else if (page.css) {
                  editor.getCss({ clear: true });
                  editor.setStyle(page.css);
                  applyStylesDirectly(newPage, page.css);
                }
                continue;
              } catch {}
            }
            if (page.projectData) {
              try {
                const projectData = JSON.parse(page.projectData);
                const newPage = editor.Pages.add({ id: page.id, name: page.name || 'Untitled Page' });
                editor.Pages.select(newPage);
                if (projectData.pages) {
                  const pageData = projectData.pages.find((p) => p.name === page.name) || projectData.pages[0];
                  if (pageData?.component) editor.setComponents(pageData.component);
                  else if (pageData?.components) editor.setComponents(pageData.components);
                  else if (page.component) editor.setComponents(page.component);
                  editor.getCss({ clear: true });
                  let appliedCSS = '';
                  if (pageData?.styles) { editor.setStyle(pageData.styles); appliedCSS = pageData.styles; }
                  else if (pageData?.style) { editor.setStyle(pageData.style); appliedCSS = pageData.style; }
                  else if (page.css) { editor.setStyle(page.css); appliedCSS = page.css; }
                  applyStylesDirectly(newPage, appliedCSS);
                  continue;
                }
              } catch {}
            }
            const newPage = editor.Pages.add({ id: page.id, name: page.name || 'Untitled Page' });
            editor.Pages.select(newPage);
            if (page.component && typeof page.component === 'string') editor.setComponents(page.component);
            if (page.css && typeof page.css === 'string') {
              editor.getCss({ clear: true });
              editor.setStyle(page.css);
              applyStylesDirectly(newPage, page.css);
            }
          } catch (err) {
            console.error(`Error loading page ${page.name}:`, err);
          }
        }
        if (editor.Pages.getAll().length > 0) {
          const firstPage = editor.Pages.getAll()[0];
          editor.Pages.select(firstPage);
        }
      }
    } catch (error) {
      console.error('Error in onReady:', error);
    }
  };

  const showToast = (id) => {
    let toastConfig = {
      id,
      header: 'Notification',
      content: 'Operation completed',
      variant: ToastVariant.Info,
    };
    
    switch (id) {
      case 'log-project-data':
        toastConfig.header = 'HTML/CSS Logged';
        toastConfig.content = 'Current page data logged to console';
        break;
      case 'log-project-data-saved':
        toastConfig.header = 'Success';
        toastConfig.content = 'Current page content saved successfully';
        toastConfig.variant = ToastVariant.Success;
        break;
      case 'log-project-data-error':
        toastConfig.header = 'Error';
        toastConfig.content = 'Failed to save page content';
        toastConfig.variant = ToastVariant.Error;
        break;
      case 'log-html-css':
        toastConfig.header = 'HTML/CSS Logged';
        toastConfig.content = 'HTML and CSS logged to console';
        break;
      case 'design-saved':
        toastConfig.header = 'Success';
        toastConfig.content = 'All pages saved successfully';
        toastConfig.variant = ToastVariant.Success;
        break;
      case 'design-save-error':
        toastConfig.header = 'Error';
        toastConfig.content = 'Failed to save pages';
        toastConfig.variant = ToastVariant.Error;
        break;
      case 'site-published':
        toastConfig.header = 'Success';
        toastConfig.content = 'Website published! Link copied to clipboard.';
        toastConfig.variant = ToastVariant.Success;
        break;
      case 'site-published-no-copy':
        toastConfig.header = 'Success';
        toastConfig.content = 'Website published! View it at /sites/your-site-id';
        toastConfig.variant = ToastVariant.Success;
        break;
      case 'publish-error':
        toastConfig.header = 'Error';
        toastConfig.content = 'Failed to publish website';
        toastConfig.variant = ToastVariant.Error;
        break;
      case 'publish-error-no-pages':
        toastConfig.header = 'Error';
        toastConfig.content = 'No pages available to publish';
        toastConfig.variant = ToastVariant.Error;
        break;
    }
    
    // Add custom toast to state
    const toastId = id + '-' + Date.now();
    const newToast = {
      id: toastId,
      ...toastConfig
    };
    
    setCustomToasts(prev => [...prev, newToast]);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      setCustomToasts(prev => prev.filter(t => t.id !== toastId));
    }, 3000);
    
    // Still call GrapesJS toast in case it's needed for editor functionality
    editor?.runCommand(StudioCommands.toastAdd, toastConfig);
  };

  const getExportData = () => {
    if (editor) {
      const html = editor.getHtml();
      const css = editor.getCss();
      console.log({ html, css });
      showToast('log-html-css');
    }
  };

  // Setup auto-save feature
  useEffect(() => {
    if (!editor || !user || !autoSaveEnabled) return;
    
    if (!isProd) console.log('Setting up auto-save timer (60 seconds)');
    
    const autoSaveInterval = setInterval(() => {
      try {
        const currentPage = editor.Pages.getSelected();
        if (!currentPage) return;
        
        const pageName = currentPage.get('name');
        const html = editor.getHtml();
        const css = editor.getCss();
        
        if (!isProd) console.log(`Auto-saving page: ${pageName}`);
        
        // Use the common save function
        (async () => {
          const success = await savePageContent(pageName, html, css);
          if (success) {
            setLastSaved(new Date());
            if (!isProd) console.log(`Auto-save successful for page: ${pageName}`);
          } else {
            console.error(`Auto-save failed for page: ${pageName}`);
          }
        })();
      } catch (error) {
        console.error('Error during auto-save:', error);
      }
    }, 60000); // Save every 60 seconds
    
    return () => {
      if (!isProd) console.log('Clearing auto-save timer');
      clearInterval(autoSaveInterval);
    };
  }, [editor, user, userPages, autoSaveEnabled]);

  // Add new function to handle publishing
  const handlePublish = async () => {
    console.log("Starting publish process...");
    if (!user) {
      console.error('User not authenticated');
      showToast('publish-error');
      return;
    }
    
    try {
      // First save current content
      await saveDesign();
      console.log("Saved all current content");
      
      // Create a unique public ID for the website
      const publicId = `site_${user.uid.slice(0, 8)}_${Date.now()}`;
      console.log("Generated site ID:", publicId);
      
      // Get the user's pages from local state
      if (!userPages || userPages.length === 0) {
        console.error('No pages found to publish');
        showToast('publish-error-no-pages');
        return;
      }
      
      console.log(`Found ${userPages.length} pages to publish`);
      
      // Transform the pages to the format needed for publishing - OPTIMIZED FOR SIZE
      const pagesData = userPages.map(page => {
        console.log(`Processing page: ${page.name}`);
        
        // Get direct HTML from GrapesJS if it's available in the current editor
        let grapesHtml = '';
        if (editor && editor.Pages) {
          try {
            // Find the page in the editor
            const editorPage = editor.Pages.getAll().find(p => p.get('name') === page.name);
            if (editorPage) {
              // Select the page to get its content
              editor.Pages.select(editorPage);
              // Get the raw HTML directly from the editor
              grapesHtml = editor.getHtml();
              console.log(`Got raw HTML directly from GrapesJS for page ${page.name}, length:`, grapesHtml.length);
            }
          } catch (err) {
            console.error('Error getting direct HTML from editor:', err);
          }
        }

        // Extract essential CSS only
        let cssContent = page.css || '';
        
        // Extract essential HTML content
        const htmlContent = grapesHtml || page.component || '';
        
        // Remove projectData to reduce size - since we have the essential HTML and CSS
        // This significantly reduces document size
        return {
          name: page.name || 'Untitled Page',
          html: htmlContent,
          css: cssContent,
          id: page.id
          // projectData and pageProjectData removed to reduce document size
        };
      });
      
      // Get total size of the data to be published
      const dataJson = JSON.stringify({
        userId: user.uid,
        userEmail: user.email,
        siteName: 'My Thikana Site',
        pages: pagesData,
        createdAt: null, // placeholder for serverTimestamp
        updatedAt: null, // placeholder for serverTimestamp
        isPublished: true
      });
      
      const dataSizeInBytes = new Blob([dataJson]).size;
      console.log(`Estimated data size: ${dataSizeInBytes} bytes (Firestore limit is 1,048,576 bytes)`);
      
      if (dataSizeInBytes > 900000) { // Getting close to the 1MB limit
        console.warn("Data size is close to Firestore limit, splitting large pages if needed");
        
        // If size is too large, simplify further by removing unnecessary data
        for (let i = 0; i < pagesData.length; i++) {
          const pageSize = JSON.stringify(pagesData[i]).length;
          console.log(`Page "${pagesData[i].name}" size: ${pageSize} bytes`);
          
          // If a single page is too large, truncate or simplify it
          if (pageSize > 500000) { // A page is using more than ~500KB
            console.warn(`Page "${pagesData[i].name}" is very large, optimizing content`);
            
            // Keep only essential HTML and CSS
            pagesData[i] = {
              name: pagesData[i].name,
              html: pagesData[i].html,
              css: pagesData[i].css,
              id: pagesData[i].id
            };
          }
        }
      }
      
      // Create the site data
      const siteData = {
        userId: user.uid,
        userEmail: user.email,
        siteName: 'My Thikana Site',
        pages: pagesData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublished: true
      };
      
      console.log("Publishing site data:", JSON.stringify(siteData).substring(0, 100) + "...");
      
      // Create the document in Firestore
      const siteRef = doc(db, 'public_sites', publicId);
      await setDoc(siteRef, siteData);
      
      console.log("Site published successfully!");
      
      // Generate the URL for the published site
      const fullUrl = `${window.location.origin}/sites/${publicId}`;
      console.log("Published URL:", fullUrl);
      
      // Try to copy to clipboard
      try {
        await navigator.clipboard.writeText(fullUrl);
        console.log("URL copied to clipboard");
        showToast('site-published');
      } catch (clipErr) {
        console.error("Failed to copy URL to clipboard:", clipErr);
        showToast('site-published-no-copy');
      }
    } catch (error) {
      console.error('Error publishing site:', error);
      showToast('publish-error');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100svh-70px)] w-full">
      {/* Add animation styles */}
      <style dangerouslySetInnerHTML={{ __html: toastAnimationStyles }} />
      
      {/* MainNav - fixed at top */}
      <div className="fixed top-0 left-0 right-0 w-full">
        <MainNav />
      </div>
      
      {/* Custom Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2">
        {customToasts.map(toast => (
          <div 
            key={toast.id}
            className={`p-4 rounded-md shadow-lg max-w-xs ${
              toast.variant === ToastVariant.Success ? 'bg-green-100 border-l-4 border-green-500 text-green-800' :
              toast.variant === ToastVariant.Error ? 'bg-red-100 border-l-4 border-red-500 text-red-800' :
              'bg-blue-100 border-l-4 border-blue-500 text-blue-800'
            }`}
            style={{
              animation: 'fadeIn 0.3s ease-out forwards',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-sm">{toast.header}</h3>
              <button 
                onClick={() => setCustomToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <p className="text-sm mt-1 text-gray-700">{toast.content}</p>
          </div>
        ))}
      </div>
      
      {/* Main content - adjusted to account for the navbar */}
      <div className="flex flex-col h-[calc(100svh-70px)] w-full">
        {/* Control bar */}
        <div className="px-6 py-3 flex gap-4 items-center border-b border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800 shadow-md">
          <div className="font-bold text-white text-lg mr-2">Thikana Builder</div>
        {user ? (
          <>
              <div className="flex items-center gap-3">
                <button 
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-md transition-colors duration-200 text-sm font-medium shadow-sm" 
                  onClick={getProjetData}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Page
            </button>
                <button 
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3 rounded-md transition-colors duration-200 text-sm font-medium shadow-sm" 
                  onClick={saveDesign}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Save All
            </button>
            <button
                  className={`flex items-center gap-1 py-1.5 px-3 rounded-md transition-colors duration-200 text-sm font-medium shadow-sm ${
                    autoSaveEnabled 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                  onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Auto-Save: {autoSaveEnabled ? 'ON' : 'OFF'}
            </button>
          <button
                  className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-3 rounded-md transition-colors duration-200 text-sm font-medium shadow-sm" 
                  onClick={handlePublish}
          >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Publish
          </button>
              </div>
              
              <div className="ml-auto flex items-center gap-4">
                {lastSaved && (
                  <span className="text-xs text-gray-300 bg-gray-700 py-1 px-2 rounded italic">
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-300">{user.email}</span>
                </div>
              </div>
            </>
          ) : null}
      </div>

        {/* Auth Modal */}
      {showAuthModal && !user && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Sign In / Sign Up</h2>
            {authError && (
              <p className="text-red-500 mb-4">{authError}</p>
            )}
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  onClick={handleSignIn}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={handleSignUp}
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="bg-gray-300 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Editor Container */}
        <div className="flex-1 w-full overflow-hidden" style={{ height: '100svh' }}>
        {user ? (
          <GrapesJsStudio
            onReady={onReady}
            options={{
                licenseKey: process.env.NEXT_PUBLIC_GRAPESJS_LICENSE_KEY || 'FREE',
              project: {
                default: {
                    pages: [{
                      name: 'Loading...',
                      component: `<div class="flex justify-center items-center h-full">
                        <p class="text-gray-500">Loading your pages...</p>
                      </div>`,
                      styles: ''
                    }]
                },
              },
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
              <p className="text-gray-600 mb-4">
                Sign in or create an account to start designing
              </p>
              <button
                className="bg-blue-500 text-white px-6 py-3 rounded-lg"
                onClick={() => setShowAuthModal(true)}
              >
                Sign In / Sign Up
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
