export const defaultSections = [
  // Hero Sections - Minimalist with varied layouts and image space
  {
    id: "hero-default",
    type: "hero",
    content: {
      title: "Build Beautiful Websites with Thikanna",
      subtitle: "The all-in-one platform for your online presence",
      description:
        "Create stunning websites with our drag-and-drop builder, optimize for SEO, and integrate AI chatbots - all without coding.",
      buttonText: "Get Started",
      buttonUrl: "#",
      imageUrl: "/placeholder.svg?height=600&width=800",
      imageAlt: "Hero image"
    },
    style: {
      backgroundColor: "#ffffff",
      textColor: "#111827",
      paddingTop: "80px",
      paddingBottom: "80px",
      borderRadius: "0px",
      textAlign: "left",
      fontSize: "2.5rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "image-right" // Image on right, text on left
    },
  },
  {
    id: "hero-minimal",
    type: "hero",
    content: {
      title: "Simple. Powerful. Beautiful.",
      subtitle: "Create your dream website in minutes",
      description:
        "No coding required. Just drag, drop, and publish your website with our intuitive builder.",
      buttonText: "Start Building",
      buttonUrl: "#",
      imageUrl: "/placeholder.svg?height=600&width=800",
      imageAlt: "Platform demo"
    },
    style: {
      backgroundColor: "#f8fafc",
      textColor: "#111827",
      paddingTop: "100px",
      paddingBottom: "100px",
      borderRadius: "0px",
      textAlign: "center",
      fontSize: "2.5rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "image-background" // Text overlay on full-width image
    },
  },
  {
    id: "hero-business",
    type: "hero",
    content: {
      title: "Transform Your Business Online",
      subtitle: "Professional websites for growing businesses",
      description:
        "Launch your business online with our enterprise-grade website builder. Includes hosting, SSL, and 24/7 support.",
      buttonText: "Start Free Trial",
      buttonUrl: "#",
      imageUrl: "/placeholder.svg?height=600&width=800",
      imageAlt: "Business website example"
    },
    style: {
      backgroundColor: "#fafafa",
      textColor: "#111827",
      paddingTop: "90px",
      paddingBottom: "90px",
      borderRadius: "0px",
      textAlign: "left",
      fontSize: "2.5rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "image-left" // Image on left, text on right
    },
  },

  // About Sections - Clean, minimal with image integration
  {
    id: "about-default",
    type: "about",
    content: {
      title: "About Thikanna",
      subtitle: "Your website building partner",
      description:
        "Thikanna is a powerful website builder designed for businesses of all sizes. Our platform combines ease of use with professional features to help you create a stunning online presence.",
      buttonText: "Learn More",
      buttonUrl: "#",
      imageUrl: "/placeholder.svg?height=400&width=600",
      imageAlt: "About our company"
    },
    style: {
      backgroundColor: "#ffffff",
      textColor: "#111827",
      paddingTop: "70px",
      paddingBottom: "70px",
      borderRadius: "0px",
      textAlign: "left",
      fontSize: "2rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "image-right" // Image on right, text on left
    },
  },
  {
    id: "about-story",
    type: "about",
    content: {
      title: "Our Story",
      subtitle: "Building the future of web creation",
      description:
        "Founded in 2024, Thikanna emerged from a simple idea: making website creation accessible to everyone. Today, we're proud to serve thousands of businesses worldwide.",
      buttonText: "Read Our Story",
      buttonUrl: "#",
      imageUrl: "/placeholder.svg?height=400&width=600",
      imageAlt: "Our journey"
    },
    style: {
      backgroundColor: "#fafafa",
      textColor: "#111827",
      paddingTop: "70px",
      paddingBottom: "70px",
      borderRadius: "0px",
      textAlign: "center",
      fontSize: "2rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "text-over-image" // Text overlaid on center image
    },
  },
  {
    id: "about-values",
    type: "about",
    content: {
      title: "Our Values",
      subtitle: "What drives us forward",
      description:
        "Innovation, simplicity, and customer success are at the heart of everything we do. We believe in making powerful tools accessible to everyone.",
      buttonText: "Join Our Mission",
      buttonUrl: "#",
      imageUrl: "/placeholder.svg?height=400&width=600",
      imageAlt: "Our values"
    },
    style: {
      backgroundColor: "#ffffff",
      textColor: "#111827",
      paddingTop: "70px",
      paddingBottom: "70px",
      borderRadius: "0px",
      textAlign: "left",
      fontSize: "2rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "split-screen" // 50/50 split with image and text
    },
  },

  // Services Sections - Clean card layouts with image support
  {
    id: "services-default",
    type: "services",
    content: {
      title: "Our Services",
      subtitle: "Everything you need for your website",
      services: [
        {
          title: "Website Builder",
          description: "Create beautiful websites with our drag-and-drop builder",
          imageUrl: "/placeholder.svg?height=200&width=200",
          imageAlt: "Website builder"
        },
        {
          title: "SEO Optimization",
          description: "Improve your search engine rankings with built-in SEO tools",
          imageUrl: "/placeholder.svg?height=200&width=200",
          imageAlt: "SEO tools"
        },
        {
          title: "AI Chatbots",
          description: "Engage visitors with intelligent AI-powered chatbots",
          imageUrl: "/placeholder.svg?height=200&width=200",
          imageAlt: "AI chatbot"
        },
      ],
      sectionImageUrl: "/placeholder.svg?height=400&width=600",
      sectionImageAlt: "Our services overview"
    },
    style: {
      backgroundColor: "#ffffff",
      textColor: "#111827",
      paddingTop: "60px",
      paddingBottom: "60px",
      borderRadius: "0px",
      textAlign: "center",
      fontSize: "2rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "grid-3-col" // 3-column grid of cards
    },
  },
  {
    id: "services-advanced",
    type: "services",
    content: {
      title: "Advanced Features",
      subtitle: "Powerful tools for your business",
      services: [
        {
          title: "E-commerce Integration",
          description: "Sell products online with our built-in e-commerce solution",
          imageUrl: "/placeholder.svg?height=300&width=400",
          imageAlt: "E-commerce features"
        },
        {
          title: "Analytics Dashboard",
          description: "Track your website's performance with detailed analytics",
          imageUrl: "/placeholder.svg?height=300&width=400",
          imageAlt: "Analytics dashboard"
        },
        {
          title: "Custom Domain Support",
          description: "Use your own domain name with free SSL certificate",
          imageUrl: "/placeholder.svg?height=300&width=400",
          imageAlt: "Domain settings"
        },
      ],
      sectionImageUrl: "/placeholder.svg?height=400&width=1200",
      sectionImageAlt: "Advanced features overview"
    },
    style: {
      backgroundColor: "#fafafa",
      textColor: "#111827",
      paddingTop: "60px",
      paddingBottom: "60px",
      borderRadius: "0px",
      textAlign: "left",
      fontSize: "2rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "alternating" // Alternating text/image cards
    },
  },
  {
    id: "services-enterprise",
    type: "services",
    content: {
      title: "Enterprise Solutions",
      subtitle: "Scalable solutions for large organizations",
      services: [
        {
          title: "Team Collaboration",
          description: "Work together with your team in real-time",
          imageUrl: "/placeholder.svg?height=250&width=350",
          imageAlt: "Team collaboration"
        },
        {
          title: "Advanced Security",
          description: "Enterprise-grade security with 2FA and SSO",
          imageUrl: "/placeholder.svg?height=250&width=350",
          imageAlt: "Security features"
        },
        {
          title: "Custom Development",
          description: "Tailored solutions for your specific needs",
          imageUrl: "/placeholder.svg?height=250&width=350",
          imageAlt: "Custom development"
        },
      ],
      sectionImageUrl: "/placeholder.svg?height=400&width=600",
      sectionImageAlt: "Enterprise solutions"
    },
    style: {
      backgroundColor: "#ffffff",
      textColor: "#111827",
      paddingTop: "60px",
      paddingBottom: "60px",
      borderRadius: "0px",
      textAlign: "center",
      fontSize: "2rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "image-cards" // Cards with image tops
    },
  },

  // Product Sections - For displaying products from Firebase
  {
    id: "products-grid",
    type: "products",
    content: {
      title: "Our Products",
      subtitle: "Browse our collection",
      description: "Discover our carefully curated selection of products designed for quality and performance.",
      buttonText: "View All",
      buttonUrl: "#",
      sourceType: "firebase",
      sourcePath: "Users/{userId}/products",
      maxProducts: 6,
      showFilters: true,
      filterFields: ["category", "price", "rating"],
      sortOptions: ["price-asc", "price-desc", "newest", "popular"],
      debug: true,
      logData: true,
    },
    style: {
      backgroundColor: "#ffffff",
      textColor: "#111827",
      paddingTop: "60px",
      paddingBottom: "60px",
      borderRadius: "0px",
      textAlign: "center",
      fontSize: "2rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "grid", // Grid layout of products
      productCardStyle: {
        backgroundColor: "#ffffff",
        textColor: "#111827",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        aspectRatio: "1/1.2",
        hoverEffect: "shadow"
      }
    },
  },
  {
    id: "products-featured",
    type: "products",
    content: {
      title: "Featured Products",
      subtitle: "Our best sellers",
      description: "These are our most popular products loved by our customers.",
      buttonText: "Shop Now",
      buttonUrl: "#",
      sourceType: "firebase",
      sourcePath: "Users/{userId}/products",
      filter: { featured: true },
      maxProducts: 3,
      showFilters: false,
      displayAttributes: ["name", "price", "rating", "shortDescription"]
    },
    style: {
      backgroundColor: "#f8fafc",
      textColor: "#111827",
      paddingTop: "70px",
      paddingBottom: "70px",
      borderRadius: "0px",
      textAlign: "left",
      fontSize: "2rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "spotlight", // Large featured products with details
      productCardStyle: {
        backgroundColor: "#ffffff",
        textColor: "#111827",
        borderRadius: "0px",
        boxShadow: "none",
        aspectRatio: "16/9",
        hoverEffect: "scale"
      }
    },
  },
  {
    id: "products-carousel",
    type: "products",
    content: {
      title: "New Arrivals",
      subtitle: "Just added to our collection",
      description: "Check out the latest additions to our product line.",
      buttonText: "View All New Arrivals",
      buttonUrl: "#",
      sourceType: "firebase",
      sourcePath: "Users/{userId}/products",
      filter: { isNew: true },
      maxProducts: 10,
      showFilters: false,
      displayAttributes: ["name", "price", "badge"]
    },
    style: {
      backgroundColor: "#ffffff",
      textColor: "#111827",
      paddingTop: "60px",
      paddingBottom: "60px",
      borderRadius: "0px",
      textAlign: "center",
      fontSize: "2rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "carousel", 
      productCardStyle: {
        backgroundColor: "#ffffff",
        textColor: "#111827",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        aspectRatio: "1/1.5",
        hoverEffect: "border"
      }
    },
  },
  {
    id: "products-comparison",
    type: "products",
    content: {
      title: "Product Comparison",
      subtitle: "Compare top selections",
      description: "Compare features and specifications of similar products to find the perfect match for your needs.",
      buttonText: "View Details",
      buttonUrl: "#",
      sourceType: "firebase",
      sourcePath: "Users/{userId}/products",
      maxProducts: 4,
      showFilters: false,
      compareAttributes: ["price", "materials", "dimensions", "weight", "features", "warranty"]
    },
    style: {
      backgroundColor: "#f8fafc",
      textColor: "#111827",
      paddingTop: "70px",
      paddingBottom: "70px",
      borderRadius: "0px",
      textAlign: "center",
      fontSize: "2rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "comparison", // Side-by-side comparison table
      productCardStyle: {
        backgroundColor: "#ffffff",
        textColor: "#111827",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        aspectRatio: "1/1",
        hoverEffect: "highlight"
      }
    },
  },
  {
    id: "products-categories",
    type: "products",
    content: {
      title: "Shop by Category",
      subtitle: "Find exactly what you're looking for",
      description: "Browse our products organized by category to streamline your shopping experience.",
      buttonText: "View All Categories",
      buttonUrl: "#",
      sourceType: "firebase",
      sourcePath: "Users/{userId}/products",
      groupBy: "category",
      maxCategories: 6,
      showCategoryImage: true,
      showProductCount: true
    },
    style: {
      backgroundColor: "#ffffff",
      textColor: "#111827",
      paddingTop: "70px",
      paddingBottom: "70px",
      borderRadius: "0px",
      textAlign: "center",
      fontSize: "2rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "category-tiles", // Grid of category tiles
      categoryCardStyle: {
        backgroundColor: "#f8fafc",
        textColor: "#111827",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        aspectRatio: "1/1",
        hoverEffect: "overlay"
      }
    },
  },

  // Contact Sections - Minimalist with image support
  {
    id: "contact-default",
    type: "contact",
    content: {
      title: "Contact Us",
      subtitle: "Get in touch with our team",
      description:
        "Have questions about Thikanna? Our team is here to help you create the perfect website for your business.",
      email: "contact@thikanna.com",
      phone: "+1 (555) 123-4567",
      imageUrl: "/placeholder.svg?height=400&width=600",
      imageAlt: "Contact our team"
    },
    style: {
      backgroundColor: "#ffffff",
      textColor: "#111827",
      paddingTop: "70px",
      paddingBottom: "70px",
      borderRadius: "0px",
      textAlign: "left",
      fontSize: "1.75rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "form-right" // Image and info left, form right
    },
  },
  {
    id: "contact-support",
    type: "contact",
    content: {
      title: "24/7 Support",
      subtitle: "We're here to help",
      description:
        "Our support team is available around the clock to assist you with any questions or concerns.",
      email: "support@thikanna.com",
      phone: "+1 (555) 987-6543",
      imageUrl: "/placeholder.svg?height=400&width=600",
      imageAlt: "Support team"
    },
    style: {
      backgroundColor: "#f8fafc",
      textColor: "#111827",
      paddingTop: "70px",
      paddingBottom: "70px",
      borderRadius: "0px",
      textAlign: "center",
      fontSize: "1.75rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "centered" // Centered with image on top
    },
  },
  {
    id: "contact-sales",
    type: "contact",
    content: {
      title: "Sales Team",
      subtitle: "Let's discuss your needs",
      description:
        "Talk to our sales team about enterprise solutions and custom packages for your business.",
      email: "sales@thikanna.com",
      phone: "+1 (555) 456-7890",
      imageUrl: "/placeholder.svg?height=400&width=600",
      imageAlt: "Sales team"
    },
    style: {
      backgroundColor: "#ffffff",
      textColor: "#111827",
      paddingTop: "70px",
      paddingBottom: "70px",
      borderRadius: "0px",
      textAlign: "left",
      fontSize: "1.75rem",
      fontWeight: "medium",
      boxShadow: "none",
      layout: "split-image" // Split layout with form and image
    },
  },
]

// Add Firebase data fetching debugging utilities
export const logFirebaseData = (sectionType, path, data, filters) => {
  console.log(`[Firebase Data] Fetching for section type: ${sectionType}`);
  console.log(`[Firebase Path] ${path}`);
  if (filters) {
    console.log(`[Firebase Filters] Applied filters:`, filters);
  }
  console.log(`[Firebase Data] Retrieved ${data?.length || 0} items:`, data);
};

// Utility function to fetch products from Firebase
export const fetchUserProducts = async (userId) => {
  // Import Firebase dependencies dynamically to avoid SSR issues
  const { collection, getDocs, query, where } = await import('firebase/firestore');
  const { db } = await import('@/lib/firebase');
  
  console.log('[Products Fetch] Starting product fetch for user:', userId);
  
  if (!userId) {
    console.error('[Products Fetch] Error: No user ID provided');
    return [];
  }
  
  // List of possible paths to try for products
  const paths = [
    `users/${userId}/products`,        // lowercase 'users'
    `products/${userId}`,              // direct products collection
    `products`,                        // root products collection
    `Users/${userId}/products`,        // standard Firebase path (capitalized Users)
    `user-products/${userId}`,         // user-specific products collection
    `userProducts/${userId}`,          // camelCase collection
    `businesses/${userId}/products`,   // business products
  ];
  
  // Try each path until we find products
  for (const path of paths) {
    try {
      console.log(`[Products Fetch] Trying path: ${path}`);
      const productsRef = collection(db, path);
      const snapshot = await getDocs(productsRef);
      
      if (snapshot.size > 0) {
        console.log(`[Products Fetch] SUCCESS! Found ${snapshot.size} products at path: ${path}`);
        const products = [];
        snapshot.forEach((doc) => {
          products.push({ id: doc.id, ...doc.data() });
        });
        console.log(`[Products Fetch] Products retrieved:`, products);
        return products;
      } else {
        console.log(`[Products Fetch] No products found at path: ${path}`);
      }
    } catch (pathError) {
      console.log(`[Products Fetch] Error with path ${path}:`, pathError.message);
    }
  }
  
  // If we reach here, try the last resort approach - root products with userId filter
  try {
    console.log('[Products Fetch] Trying root products collection with userId filter...');
    const rootProductsRef = collection(db, 'products');
    const userProductsQuery = query(rootProductsRef, where('userId', '==', userId));
    
    const snapshot = await getDocs(userProductsQuery);
    if (snapshot.size > 0) {
      console.log(`[Products Fetch] Found ${snapshot.size} products with userId filter`);
      const products = [];
      snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });
      return products;
    }
    
    // Last resort - see if there are any products at all
    console.log('[Products Fetch] Checking for any products in the root products collection...');
    const allProductsSnapshot = await getDocs(rootProductsRef);
    console.log(`[Products Fetch] Found ${allProductsSnapshot.size} total products`);
    
    if (allProductsSnapshot.size > 0) {
      // Log sample products to see their structure
      console.log('[Products Fetch] Sample products:');
      let count = 0;
      allProductsSnapshot.forEach((doc) => {
        if (count < 3) {
          console.log(`- Product ${count+1}:`, { id: doc.id, ...doc.data() });
          count++;
        }
      });
    }
  } catch (rootError) {
    console.error('[Products Fetch] Error with root products approach:', rootError.message);
  }
  
  console.warn('[Products Fetch] Could not find products in any location. Returning empty array.');
  return [];
};

// Function to fetch products and filter them based on section configuration
export const fetchProductsForSection = async (section, userId) => {
  console.log('[Section Products] Fetching products for section:', section.id);
  
  const { content } = section;
  const { filter, maxProducts, debug } = content;
  
  try {
    // Fetch all products for the user
    const allProducts = await fetchUserProducts(userId);
    
    // Apply filters if specified in the section config
    let filteredProducts = allProducts;
    if (filter) {
      console.log('[Section Products] Applying filters:', filter);
      
      filteredProducts = allProducts.filter(product => {
        return Object.entries(filter).every(([key, value]) => {
          return product[key] === value;
        });
      });
      
      console.log(`[Section Products] After filtering: ${filteredProducts.length} products`);
    }
    
    // Apply sorting if specified
    if (content.sortOptions && content.sortOptions.length > 0 && content.defaultSort) {
      const sortOption = content.defaultSort;
      console.log(`[Section Products] Sorting by: ${sortOption}`);
      
      filteredProducts = [...filteredProducts].sort((a, b) => {
        switch (sortOption) {
          case 'price-asc':
            return (a.price || 0) - (b.price || 0);
          case 'price-desc':
            return (b.price || 0) - (a.price || 0);
          case 'newest':
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          case 'popular':
            return (b.popularity || 0) - (a.popularity || 0);
          default:
            return 0;
        }
      });
    }
    
    // Apply maximum products limit if specified
    if (maxProducts && maxProducts > 0) {
      filteredProducts = filteredProducts.slice(0, maxProducts);
      console.log(`[Section Products] Limited to ${maxProducts} products: ${filteredProducts.length} products`);
    }
    
    // Log the final result
    if (debug) {
      logFirebaseData('products', `Users/${userId}/products`, filteredProducts, filter);
    }
    
    return filteredProducts;
  } catch (error) {
    console.error('[Section Products] Error:', error);
    return [];
  }
};

// Sample usage in your data fetching function:
/*
const fetchProductsFromFirebase = async (section) => {
  const { content } = section;
  const { sourcePath, filter, maxProducts, debug } = content;
  
  // Replace {userId} with actual user ID
  const actualPath = sourcePath.replace('{userId}', currentUser?.uid || 'default');
  
  try {
    // Fetch data from Firebase
    const productsRef = collection(db, actualPath);
    let query = productsRef;
    
    // Apply filters if any
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.where(key, '==', value);
      });
    }
    
    const snapshot = await getDocs(query);
    const products = [];
    
    snapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });
    
    // Log data if debugging is enabled
    if (debug) {
      logFirebaseData('products', actualPath, products, filter);
    }
    
    // Limit the number of products if maxProducts is specified
    return maxProducts ? products.slice(0, maxProducts) : products;
  } catch (error) {
    console.error('Error fetching products from Firebase:', error);
    return [];
  }
};
*/

