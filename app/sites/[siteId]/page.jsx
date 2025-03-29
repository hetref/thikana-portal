'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

export default function PublishedSite() {
  const { siteId } = useParams();
  const [site, setSite] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [extractedHtml, setExtractedHtml] = useState('');

  useEffect(() => {
    const loadSite = async () => {
      console.log('Starting to load site with ID:', siteId);
      if (!siteId) {
        console.error('No site ID provided');
        setError('No site ID provided');
        setLoading(false);
        return;
      }

      try {
        // Fetch the site data from Firestore
        console.log('Fetching site from Firestore, collection: public_sites, id:', siteId);
        const siteRef = doc(db, 'public_sites', siteId);
        const siteDoc = await getDoc(siteRef);

        if (!siteDoc.exists()) {
          console.error('Site document not found in Firestore');
          setError('Site not found');
          setLoading(false);
          return;
        }

        const siteData = siteDoc.data();
        console.log('Loaded site data successfully:', siteData);
        console.log('Pages in site:', siteData.pages?.length || 0);
        
        // Log each page's data
        if (siteData.pages && siteData.pages.length > 0) {
          siteData.pages.forEach((page, index) => {
            console.log(`Page ${index + 1} (${page.name}):`, {
              hasHtml: !!page.html,
              hasComponent: !!page.component, 
              hasCss: !!page.css,
              hasProjectData: !!page.projectData,
              hasPageProjectData: !!page.pageProjectData
            });
          });
        } else {
          console.warn('Site has no pages');
        }
        
        setSite(siteData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading site:', err);
        setError('Failed to load site: ' + err.message);
        setLoading(false);
      }
    };

    loadSite();
  }, [siteId]);

  useEffect(() => {
    // Effect to dynamically apply CSS styles when the page changes
    if (site && site.pages && site.pages.length > 0 && currentPageIndex < site.pages.length) {
      const page = site.pages[currentPageIndex];
      console.log('Current page data:', {
        name: page.name,
        hasHtml: !!page.html,
        hasComponent: !!page.component,
        hasCss: !!page.css,
        hasProjectData: !!page.projectData,
        hasPageProjectData: !!page.pageProjectData,
        cssLength: page.css?.length || 0,
        htmlLength: page.html?.length || 0,
        componentLength: page.component?.length || 0
      });
      
      // Try to extract CSS from project data if available
      let cssContent = '';
      
      // First try page project data
      if (page.pageProjectData) {
        try {
          const pageProjectData = JSON.parse(page.pageProjectData);
          console.log('Found pageProjectData, checking for styles');
          if (pageProjectData.styles) {
            cssContent = pageProjectData.styles;
            console.log('Using styles from pageProjectData');
          } else if (pageProjectData.style) {
            cssContent = pageProjectData.style;
            console.log('Using style from pageProjectData');
          }
        } catch (err) {
          console.error('Error parsing pageProjectData:', err);
        }
      }
      
      // Then try project data
      if (!cssContent && page.projectData) {
        try {
          const projectData = JSON.parse(page.projectData);
          console.log('Found projectData, checking for styles', {
            hasGlobalStyles: !!projectData.styles,
            globalStylesType: projectData.styles ? typeof projectData.styles : 'none',
            hasGlobalStyle: !!projectData.style,
            hasPages: !!projectData.pages,
            pagesCount: projectData.pages?.length || 0
          });
          
          // Look for page-specific styles in project data
          if (projectData.pages) {
            const pageData = projectData.pages.find(p => p.id === page.id || p.name === page.name);
            if (pageData) {
              console.log('Found matching page in projectData.pages', {
                pageName: pageData.name,
                hasStyles: !!pageData.styles,
                stylesType: pageData.styles ? typeof pageData.styles : 'none',
                hasStyle: !!pageData.style
              });
              
              if (pageData.styles) {
                cssContent = pageData.styles;
                console.log('Using styles from projectData.pages[]');
              } else if (pageData.style) {
                cssContent = pageData.style;
                console.log('Using style from projectData.pages[]');
              }
            }
          }
          
          // If still no CSS, check for global styles
          if (!cssContent && projectData.styles) {
            cssContent = projectData.styles;
            console.log('Using global styles from projectData', {
              type: typeof projectData.styles,
              isString: typeof projectData.styles === 'string',
              isObject: typeof projectData.styles === 'object'
            });
            
            // Handle non-string CSS content
            if (typeof cssContent !== 'string') {
              console.log('Converting non-string CSS to string, original type:', typeof cssContent);
              if (typeof cssContent === 'object') {
                try {
                  // Try to convert object to CSS string
                  cssContent = JSON.stringify(cssContent);
                } catch (err) {
                  console.error('Error stringifying CSS object:', err);
                  cssContent = String(cssContent);
                }
              } else {
                cssContent = String(cssContent);
              }
            }
          } else if (!cssContent && projectData.style) {
            cssContent = projectData.style;
            console.log('Using global style from projectData');
          }
        } catch (err) {
          console.error('Error parsing projectData:', err);
        }
      }
      
      // Fallback to direct CSS field
      if (!cssContent && page.css) {
        cssContent = page.css;
        console.log('Using css field directly');
      }
      
      // Log the CSS content for debugging
      if (cssContent) {
        // Check that cssContent is a string before using substring
        if (typeof cssContent === 'string') {
          console.log('Final CSS content preview:', cssContent.substring(0, 100) + '...');
        } else {
          console.log('CSS content is not a string type:', typeof cssContent);
          // Convert to string if possible
          cssContent = String(cssContent);
        }
      } else {
        console.warn('No CSS content found for page:', page.name);
      }
      
      // Create or update a style element in the document head
      let styleElement = document.getElementById('page-styles');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'page-styles';
        document.head.appendChild(styleElement);
      }
      
      // Apply the CSS
      styleElement.textContent = cssContent || '';
      console.log('Applied CSS to document head');
      
      // Extract HTML content for direct rendering
      let htmlContent = '';
      
      // Log raw HTML and component fields for debugging
      console.log('Raw HTML field length:', page.html?.length || 0);
      console.log('Raw component field length:', page.component?.length || 0);
      
      // Try to get HTML from project data first
      if (page.pageProjectData) {
        try {
          console.log('Extracting HTML from pageProjectData');
          const pageData = JSON.parse(page.pageProjectData);
          console.log('PageProjectData contents:', {
            hasComponent: !!pageData.component,
            componentType: pageData.component ? typeof pageData.component : 'none',
            hasComponents: !!pageData.components,
            componentsType: pageData.components ? typeof pageData.components : 'none'
          });
          
          if (pageData.component) {
            htmlContent = pageData.component;
            console.log('Extracted HTML from pageProjectData.component, length:', 
              typeof htmlContent === 'string' ? htmlContent.length : 'not a string');
          } else if (pageData.components) {
            htmlContent = pageData.components;
            console.log('Extracted HTML from pageProjectData.components, length:', 
              typeof htmlContent === 'string' ? htmlContent.length : 'not a string');
          }
        } catch (err) {
          console.error('Error parsing pageProjectData for HTML extraction:', err);
        }
      }
      
      // Then try project data
      if (!htmlContent && page.projectData) {
        try {
          console.log('Extracting HTML from projectData');
          const projectData = JSON.parse(page.projectData);
          console.log('ProjectData structure:', {
            hasPages: !!projectData.pages,
            pagesCount: projectData.pages?.length || 0,
            hasHtml: !!projectData.html,
            hasComponent: !!projectData.component
          });
          
          // Look for page-specific content in project data
          if (projectData.pages) {
            // Log the page names to help with debugging
            console.log('Page names in projectData:', 
              projectData.pages.map(p => ({ name: p.name, id: p.id })));
              
            const pageData = projectData.pages.find(p => 
              p.id === page.id || p.name === page.name
            );
            
            if (pageData) {
              console.log('Found matching page in projectData:', {
                pageName: pageData.name,
                hasComponent: !!pageData.component,
                componentType: pageData.component ? typeof pageData.component : 'none',
                hasComponents: !!pageData.components,
                hasHtml: !!pageData.html
              });
              
              if (pageData.html) {
                htmlContent = pageData.html;
                console.log('Extracted HTML from projectData.pages[].html, length:', 
                  typeof htmlContent === 'string' ? htmlContent.length : 'not a string');
              } else if (pageData.component) {
                htmlContent = pageData.component;
                console.log('Extracted HTML from projectData.pages[].component, length:', 
                  typeof htmlContent === 'string' ? htmlContent.length : 'not a string');
              } else if (pageData.components) {
                htmlContent = pageData.components;
                console.log('Extracted HTML from projectData.pages[].components, length:', 
                  typeof htmlContent === 'string' ? htmlContent.length : 'not a string');
              }
            } else {
              console.log('No matching page found in projectData.pages');
            }
          }
          
          // If still no HTML content found, try extracting from top-level GrapesJS data
          if (!htmlContent && projectData.html) {
            htmlContent = projectData.html;
            console.log('Using HTML from top-level projectData.html, length:', 
              typeof htmlContent === 'string' ? htmlContent.length : 'not a string');
          } else if (!htmlContent && projectData.component) {
            htmlContent = projectData.component;
            console.log('Using HTML from top-level projectData.component, length:', 
              typeof htmlContent === 'string' ? htmlContent.length : 'not a string');
          }
        } catch (err) {
          console.error('Error parsing projectData for HTML extraction:', err);
        }
      }
      
      // Fallback to direct HTML fields
      if (!htmlContent) {
        // Directly inspect the HTML content
        if (page.html) {
          console.log('Raw HTML content (first 200 chars):', page.html.substring(0, 200));
          htmlContent = page.html;
          console.log('Using direct HTML field for extraction, content length:', htmlContent.length);
        } else if (page.component) {
          console.log('Raw component content (first 200 chars):', page.component.substring(0, 200));
          htmlContent = page.component;
          console.log('Using direct component field for extraction, content length:', htmlContent.length);
        } else {
          htmlContent = '';
          console.warn('No HTML or component content found in page data');
        }
      }
      
      // If still no content, use a default message
      if (!htmlContent || htmlContent.trim() === '') {
        console.warn('No HTML content found for extraction, using default message');
        htmlContent = `<div class="flex flex-col items-center justify-center min-h-[300px] p-8">
          <h2 class="text-2xl font-bold text-gray-600 mb-4">No Content Available</h2>
          <p class="text-gray-500">The page "${page.name || 'Unnamed'}" doesn't have any content to display.</p>
        </div>`;
      }
      
      // Set the extracted HTML for direct rendering
      setExtractedHtml(htmlContent);
      console.log('HTML extraction complete and state updated, content length:', htmlContent.length);
    }
  }, [site, currentPageIndex]);

  // Reset extracted HTML when page changes to prevent content mixing
  useEffect(() => {
    // Clear the extracted HTML when page index changes
    setExtractedHtml('');
    console.log('Cleared extracted HTML due to page change');
  }, [currentPageIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-lg">Loading site...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-lg">
          <h1 className="mb-4 text-2xl font-bold text-red-500">Error</h1>
          <p className="mb-6 text-gray-700">{error}</p>
          <Link href="/" className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (!site || !site.pages || site.pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-lg">
          <h1 className="mb-4 text-2xl font-bold">Site has no content</h1>
          <p className="mb-6 text-gray-700">This site doesn't have any published pages yet.</p>
          <Link href="/" className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const currentPage = site.pages[currentPageIndex];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation bar for multi-page sites */}
      {site.pages.length > 1 && (
        <nav className="sticky top-0 z-50 bg-white border-b shadow-sm py-2">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">{site.siteName || 'Published Site'}</div>
              <div className="flex space-x-4">
                {site.pages.map((page, index) => (
                  <button
                    key={page.id || index}
                    onClick={() => setCurrentPageIndex(index)}
                    className={`px-3 py-1 rounded transition ${
                      currentPageIndex === index
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {page.name || `Page ${index + 1}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Page content */}
      <div className="flex-1">
        {/* Single rendering approach to prevent duplication */}
        <div className="page-content">
          {/* Content rendering using dangerouslySetInnerHTML for better cleanup */}
          {extractedHtml ? (
            <div 
              key={`${currentPage.id}-${currentPageIndex}`}
              className="html-content"
              dangerouslySetInnerHTML={{ __html: extractedHtml }}
            />
          ) : currentPage.html ? (
            <div 
              key={`${currentPage.id}-${currentPageIndex}`}
              className="html-content"
              dangerouslySetInnerHTML={{ __html: currentPage.html }}
            />
          ) : (
            <div 
              key={`${currentPage.id}-${currentPageIndex}`}
              className="html-content flex flex-col items-center justify-center min-h-[300px] p-8">
              <h2 className="text-2xl font-bold text-gray-600 mb-4">No Content Available</h2>
              <p className="text-gray-500">The page "{currentPage.name || 'Unnamed'}" doesn't have any content to display.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer with attribution */}
      <footer className="bg-gray-100 py-2 text-center text-sm text-gray-600 border-t">
        Built with Thikana Portal
      </footer>
    </div>
  );
} 