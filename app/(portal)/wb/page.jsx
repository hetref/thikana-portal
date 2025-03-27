'use client';

import { useState, useEffect } from 'react';
import GrapesJsStudio, {
  StudioCommands,
  ToastVariant,
} from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';

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

  useEffect(() => {
    console.log('Setting up auth listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user);
      setUser(user);
      
      if (user) {
        // Load user pages when user logs in
        await loadUserPages(user.uid);
      } else {
        // Clear pages when user logs out
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
      console.log('Loading pages for user:', userId);
      const pagesRef = collection(db, `users/${userId}/pages`);
      const q = query(pagesRef, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const pages = [];
      
      querySnapshot.forEach((doc) => {
        pages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('Loaded pages:', pages);
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
        
        // Add default page to Firestore
        const newPageRef = await addDoc(collection(db, `users/${userId}/pages`), defaultPage);
        console.log('Created default page with ID:', newPageRef.id);
        
        // Add to local state
        setUserPages([{
          id: newPageRef.id,
          ...defaultPage
        }]);
      }
      
      return pages;
    } catch (error) {
      console.error('Error loading pages:', error);
      return [];
    }
  };

  // Common function to save a page's content to Firebase
  const savePageContent = async (pageName, html, css, pageProjectData = null) => {
    if (!user || !pageName) return false;
    
    try {
      console.log(`Saving page: ${pageName}`);
      console.log(`HTML length: ${html.length}, CSS length: ${css.length}`);
      
      // Find existing page or create new data
      const existingPageIndex = userPages.findIndex(p => p.name === pageName);
      const pageData = {
        name: pageName,
        component: html,
        css: css,
        // Save both full project data and page-specific data
        projectData: editor ? JSON.stringify(editor.getProjectData()) : null,
        pageProjectData: pageProjectData || null,
        updatedAt: serverTimestamp()
      };
      
      if (existingPageIndex >= 0) {
        // Update existing page
        const pageId = userPages[existingPageIndex].id;
        await setDoc(doc(db, `users/${user.uid}/pages`, pageId), pageData, { merge: true });
        
        // Update local state
        const updatedPages = [...userPages];
        updatedPages[existingPageIndex] = { id: pageId, ...pageData };
        setUserPages(updatedPages);
        
        console.log(`Updated page ${pageName} in Firebase and local state`);
        return true;
      } else {
        // Create new page
        pageData.createdAt = serverTimestamp();
        const newPageRef = await addDoc(collection(db, `users/${user.uid}/pages`), pageData);
        
        // Update local state
        setUserPages([...userPages, { id: newPageRef.id, ...pageData }]);
        
        console.log(`Created new page ${pageName} in Firebase and local state`);
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
        // Get the current page
        const currentPage = editor.Pages.getSelected();
        if (!currentPage) {
          console.error('No page selected');
          showToast('log-project-data-error');
          return;
        }
        
        const pageName = currentPage.get('name');
        console.log(`Getting content for page: ${pageName}`);
        
        // Get the HTML and CSS of the current page
        const html = editor.getHtml();
        const css = editor.getCss();
        
        // Log to console for debugging
        console.log(`HTML length: ${html.length}, CSS length: ${css.length}`);
        console.log('HTML Preview:', html.substring(0, 100) + '...');
        console.log('CSS Preview:', css.substring(0, 100) + '...');
        
        // Save the current page's HTML and CSS
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
          console.log('User not authenticated, cannot save page');
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
      // Get all pages
      const pages = editor.Pages.getAll();
      console.log(`Saving all ${pages.length} pages`);
      
      // Store the currently selected page
      const currentPage = editor.Pages.getSelected();
      
      // Get the full project data once
      const fullProjectData = editor.getProjectData();
      console.log('Full project data:', fullProjectData);
      
      // Save each page separately
      const savePromises = pages.map(async (page) => {
        try {
          const pageName = page.get('name');
          const pageId = page.get('id');
          console.log(`Processing page: ${pageName}, ID: ${pageId}`);
          
          // Select the page to get its content
          editor.Pages.select(page);
          
          // Get the HTML and CSS of the selected page
          const html = editor.getHtml();
          const css = editor.getCss();
          
          console.log(`Page ${pageName} - HTML length: ${html.length}, CSS length: ${css.length}`);
          
          // Find this page in the full project data
          const pageData = fullProjectData.pages.find(p => p.id === pageId);
          
          // Use our common save function with enhanced project data
          const success = await savePageContent(
            pageName, 
            html, 
            css, 
            pageData ? JSON.stringify(pageData) : null
          );
          
          if (success) {
            console.log(`Saved page: ${pageName}`);
            return true;
          } else {
            console.error(`Failed to save page: ${pageName}`);
            return false;
          }
        } catch (error) {
          console.error(`Error saving page ${page.get('name')}:`, error);
          return false;
        }
      });
      
      // Wait for all save operations to complete
      const results = await Promise.all(savePromises);
      const successCount = results.filter(Boolean).length;
      
      // Restore the originally selected page
      if (currentPage) {
        editor.Pages.select(currentPage);
      }
      
      // Update the last saved timestamp
      setLastSaved(new Date());
      
      if (successCount > 0) {
        console.log(`Successfully saved ${successCount} of ${pages.length} pages`);
        showToast('design-saved');
      } else {
        console.error('No pages were saved successfully');
        showToast('design-save-error');
      }
    } catch (error) {
      console.error('Error saving design:', error);
      showToast('design-save-error');
    }
  };

  const onReady = async (editor) => {
    console.log('Editor loaded', editor);
    setEditor(editor);

    try {
    // Add custom blocks category
    editor.Blocks.add('sections', {
      label: 'Sections',
      category: 'Sections',
      content: '',
      select: true,
    });

    // Add predefined sections as blocks
    Object.entries(predefinedSections).forEach(([name, content]) => {
      editor.Blocks.add(`section-${name}`, {
        label: name.charAt(0).toUpperCase() + name.slice(1),
        category: 'Sections',
        content,
        select: true,
      });
    });

      console.log('Blocks added successfully');
      
      // Helper function to apply CSS directly to canvas
      const applyStylesDirectly = (page, css) => {
        try {
          if (!css || typeof css !== 'string' || !css.trim()) {
            console.log('No CSS to apply for page:', page.get('name'));
            return;
          }
          
          console.log('Applying CSS directly to canvas for page:', page.get('name'));
          
          // Get the iframe document
          const frame = editor.Canvas.getFrameEl();
          if (!frame) {
            console.error('Canvas frame not found');
            return;
          }
          
          const doc = frame.contentDocument || frame.contentWindow.document;
          
          // Create a unique ID for this style element
          const styleId = `page-styles-${page.get('id')}`;
          
          // Remove any existing style element for this page
          const existingStyle = doc.getElementById(styleId);
          if (existingStyle) {
            existingStyle.remove();
          }
          
          // Create a new style element
          const styleEl = doc.createElement('style');
          styleEl.id = styleId;
          styleEl.innerHTML = css;
          
          // Append to the head
          doc.head.appendChild(styleEl);
          
          console.log('CSS applied directly to canvas document');
        } catch (err) {
          console.error('Error applying styles directly:', err);
        }
      };
      
      // Add page selection change handler to ensure CSS is applied
      editor.on('page:select', (page) => {
        if (!page) return;
        
        console.log('Page selected, reapplying CSS:', page.get('name'));
        
        // Find the page data in userPages
        const pageData = userPages.find(p => p.name === page.get('name'));
        if (!pageData) {
          console.log('No saved data found for page:', page.get('name'));
          return;
        }
        
        // Clear existing CSS
        editor.getCss({clear: true});
        
        // First try to get CSS from pageProjectData
        let css = '';
        if (pageData.pageProjectData) {
          try {
            const projectData = JSON.parse(pageData.pageProjectData);
            if (projectData.styles) {
              css = projectData.styles;
            } else if (projectData.style) {
              css = projectData.style;
            }
          } catch (err) {
            console.error('Error parsing pageProjectData:', err);
          }
        }
        
        // If no CSS from pageProjectData, use the stored CSS
        if (!css && pageData.css) {
          css = pageData.css;
        }
        
        if (css) {
          // Apply CSS to the editor
          editor.setStyle(css);
          
          // Also apply CSS directly to the canvas
          applyStylesDirectly(page, css);
          
          console.log('Reapplied CSS for page:', page.get('name'));
        }
      });
      
      // If user has pages, load them into the editor
      if (user && userPages.length > 0) {
        console.log('Loading user pages into editor, count:', userPages.length);
        
        // First, clear existing pages
        const existingPages = editor.Pages.getAll();
        console.log('Existing pages in editor:', existingPages.length);
        existingPages.forEach(p => editor.Pages.remove(p));
        
        // Process and add each user page
        for (const page of userPages) {
          try {
            console.log('Loading page:', page.name, 'HTML length:', page.component?.length || 0, 'CSS length:', page.css?.length || 0);
            
            // If we have page-specific project data, use that first
            if (page.pageProjectData) {
              try {
                console.log('Found page-specific projectData, using that for targeted page restoration');
                const pageData = JSON.parse(page.pageProjectData);
                
                // Create a new page
                const newPage = editor.Pages.add({
                  id: pageData.id || page.id,
                  name: page.name || 'Untitled Page',
                });
                
                // Select the page
                editor.Pages.select(newPage);
                
                // Set components (HTML)
                if (pageData.component) {
                  editor.setComponents(pageData.component);
                } else if (pageData.components) {
                  editor.setComponents(pageData.components);
                } else if (page.component) {
                  editor.setComponents(page.component);
                }
                
                // Set styles (CSS)
                if (pageData.styles) {
                  // Clear existing styles first
                  editor.getCss({clear: true});
                  editor.setStyle(pageData.styles);
                  
                  // Apply CSS directly to the canvas
                  applyStylesDirectly(newPage, pageData.styles);
                } else if (pageData.style) {
                  // Clear existing styles first
                  editor.getCss({clear: true});
                  editor.setStyle(pageData.style);
                  
                  // Apply CSS directly to the canvas
                  applyStylesDirectly(newPage, pageData.style);
                } else if (page.css) {
                  // Clear existing styles first
                  editor.getCss({clear: true});
                  editor.setStyle(page.css);
                  
                  // Apply CSS directly to the canvas
                  applyStylesDirectly(newPage, page.css);
                }
                
                console.log('Loaded page from page-specific projectData:', page.name);
                continue; // Skip the rest of the loading logic for this page
              } catch (err) {
                console.error('Error loading from page-specific projectData:', err);
                // Continue to try other loading methods
              }
            }
            
            // Fallback to full project data
            if (page.projectData) {
              try {
                console.log('Found full projectData, using that for complete page restoration');
                const projectData = JSON.parse(page.projectData);
                
                // Create a new page
                const newPage = editor.Pages.add({
                  id: page.id,
                  name: page.name || 'Untitled Page',
                });
                
                // Select the page
                editor.Pages.select(newPage);
                
                // Try to load the full project data for this page
                if (projectData.pages) {
                  // Find the matching page data from project
                  const pageData = projectData.pages.find(p => p.name === page.name) || projectData.pages[0];
                  
                  // Set the components directly
                  if (pageData.component) {
                    editor.setComponents(pageData.component);
                  } else if (pageData.components) {
                    editor.setComponents(pageData.components);
                  } else if (page.component) {
                    editor.setComponents(page.component);
                  }
                  
                  // Set the styles directly after clearing existing styles
                  editor.getCss({clear: true});
                  
                  let appliedCSS = '';
                  if (pageData.styles) {
                    editor.setStyle(pageData.styles);
                    appliedCSS = pageData.styles;
                    console.log('Applied styles from projectData.pages[].styles');
                  } else if (pageData.style) {
                    editor.setStyle(pageData.style);
                    appliedCSS = pageData.style;
                    console.log('Applied styles from projectData.pages[].style');
                  } else if (page.css) {
                    editor.setStyle(page.css);
                    appliedCSS = page.css;
                    console.log('Applied styles from page.css');
                  }
                  
                  // Apply CSS directly to the canvas
                  applyStylesDirectly(newPage, appliedCSS);
                  
                  console.log('Loaded page from projectData:', page.name);
                  continue; // Skip the rest of the loading logic for this page
                }
              } catch (err) {
                console.error('Error loading from projectData, falling back to component/css:', err);
                // Continue with standard loading
              }
            }
            
            // Standard loading without projectData
            // Create page
            const newPage = editor.Pages.add({
              id: page.id,
              name: page.name || 'Untitled Page',
            });
            
            console.log('Created page in editor:', newPage.get('name'));
            
            // Select the page to work with it
            editor.Pages.select(newPage);
            
            // Set HTML content - explicitly log the content
            if (page.component && typeof page.component === 'string') {
              console.log('Setting HTML content for page:', page.name);
              console.log('HTML content preview:', page.component.substring(0, 100));
              editor.setComponents(page.component);
              const loadedHTML = editor.getHtml();
              console.log('HTML after load preview:', loadedHTML.substring(0, 100));
              console.log('HTML load successful:', loadedHTML.length > 0);
            }
            
            // Set CSS content - explicitly log the content
            if (page.css && typeof page.css === 'string') {
              console.log('Setting CSS content for page:', page.name);
              console.log('CSS content preview:', page.css.substring(0, 100));
              
              // Clear any existing styles first to avoid conflicts
              editor.getCss({clear: true});
              
              // Apply the stored CSS
              editor.setStyle(page.css);
              
              // Apply CSS directly to the canvas iframe document
              applyStylesDirectly(newPage, page.css);
              
              const loadedCSS = editor.getCss();
              console.log('CSS after load preview:', loadedCSS.substring(0, 100));
              console.log('CSS load successful:', loadedCSS.length > 0);
            }
            
            console.log(`Loaded page: ${page.name} successfully`);
          } catch (err) {
            console.error(`Error loading page ${page.name}:`, err);
          }
        }
        
        // Select the first page by default
        if (editor.Pages.getAll().length > 0) {
          const firstPage = editor.Pages.getAll()[0];
          editor.Pages.select(firstPage);
          console.log('Selected first page:', firstPage.get('name'));
        }
        
        console.log('Finished loading user pages');
      } else {
        console.log('No pages to load or user not authenticated');
      }
      
      // Set up change monitoring to detect manual edits
      editor.on('component:update', () => {
        console.log('Component updated, content modified');
      });
      
      editor.on('style:update', () => {
        console.log('Style updated, content modified');
        
        // Auto-save CSS changes if enabled
        if (autoSaveEnabled && user) {
          const currentPage = editor.Pages.getSelected();
          if (currentPage) {
            const pageName = currentPage.get('name');
            const html = editor.getHtml();
            const css = editor.getCss();
            
            // Apply CSS directly to the canvas iframe too
            applyStylesDirectly(currentPage, css);
            
            console.log(`Auto-saving after style change for page: ${pageName}`);
            (async () => {
              try {
                const success = await savePageContent(pageName, html, css);
                if (success) {
                  setLastSaved(new Date());
                  console.log(`Style change auto-save successful for page: ${pageName}`);
                }
              } catch (error) {
                console.error('Error during style change auto-save:', error);
              }
            })();
          }
        }
      });
      
      // Fix for canvas reloading or store changes
      editor.on('canvas:refresh', () => {
        console.log('Canvas refreshed, reapplying styles');
        const currentPage = editor.Pages.getSelected();
        if (currentPage) {
          const css = editor.getCss();
          if (css) {
            applyStylesDirectly(currentPage, css);
          }
        }
      });
      
      // Also handle editor component add events to ensure styles are applied
      editor.on('component:add', () => {
        setTimeout(() => {
          const currentPage = editor.Pages.getSelected();
          if (currentPage) {
            const css = editor.getCss();
            if (css) {
              applyStylesDirectly(currentPage, css);
            }
          }
        }, 100); // Small delay to ensure component is fully added
      });
      
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
    }
    
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
    
    console.log('Setting up auto-save timer (60 seconds)');
    
    const autoSaveInterval = setInterval(() => {
      try {
        const currentPage = editor.Pages.getSelected();
        if (!currentPage) return;
        
        const pageName = currentPage.get('name');
        const html = editor.getHtml();
        const css = editor.getCss();
        
        console.log(`Auto-saving page: ${pageName}`);
        
        // Use the common save function
        (async () => {
          const success = await savePageContent(pageName, html, css);
          if (success) {
            setLastSaved(new Date());
            console.log(`Auto-save successful for page: ${pageName}`);
          } else {
            console.error(`Auto-save failed for page: ${pageName}`);
          }
        })();
      } catch (error) {
        console.error('Error during auto-save:', error);
      }
    }, 60000); // Save every 60 seconds
    
    return () => {
      console.log('Clearing auto-save timer');
      clearInterval(autoSaveInterval);
    };
  }, [editor, user, userPages, autoSaveEnabled]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="flex h-screen flex-col justify-between p-5 gap-2">
      <div className="p-1 flex gap-5 items-center">
        <div className="font-bold">Website Builder</div>
        {user ? (
          <>
            <button className="border rounded px-2" onClick={getProjetData}>
              Save Current Page
            </button>
            <button className="border rounded px-2" onClick={saveDesign}>
              Save All Pages
            </button>
            <button
              className={`border rounded px-2 ${autoSaveEnabled ? 'bg-green-100' : 'bg-red-100'}`}
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
            >
              Auto-Save: {autoSaveEnabled ? 'ON' : 'OFF'}
            </button>
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Last auto-saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              className="border rounded px-2"
              onClick={() => auth.signOut()}
            >
              Sign Out
            </button>
            <span className="ml-auto">{user.email}</span>
          </>
        ) : (
          <button
            className="border rounded px-2"
            onClick={() => setShowAuthModal(true)}
          >
            Sign In
          </button>
        )}
      </div>

      {showAuthModal && !user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
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

      <div className="flex-1 w-full h-full overflow-hidden">
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
    </main>
  );
}