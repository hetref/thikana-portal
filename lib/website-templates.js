// Website Templates Library
export const websiteTemplates = [
  {
    id: 'blank',
    name: 'Blank Template',
    description: 'Start with a clean slate',
    category: 'basic',
    preview: '/templates/blank-preview.jpg',
    html: `<div class="container">
      <h1>Welcome to Your Website</h1>
      <p>Start building your amazing website here...</p>
    </div>`,
    css: `
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
        margin-top: 1rem;
      }
    `
  },
  {
    id: 'business-landing',
    name: 'Business Landing',
    description: 'Professional business landing page',
    category: 'business',
    preview: '/templates/business-preview.jpg',
    html: `<div class="page-wrapper">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="container">
          <h1 class="hero-title">Grow Your Business Today</h1>
          <p class="hero-description">
            We help businesses succeed with innovative solutions and expert guidance. 
            Transform your ideas into reality with our professional services.
          </p>
          <div class="hero-buttons">
            <button class="btn btn-primary">Get Started</button>
            <button class="btn btn-secondary">Learn More</button>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features-section">
        <div class="container">
          <h2 class="section-title">Why Choose Us</h2>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">⚡</div>
              <h3 class="feature-title">Fast & Reliable</h3>
              <p class="feature-description">Quick turnaround times with reliable, high-quality results you can count on.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🎯</div>
              <h3 class="feature-title">Expert Team</h3>
              <p class="feature-description">Our experienced professionals bring years of expertise to every project.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">💎</div>
              <h3 class="feature-title">Premium Quality</h3>
              <p class="feature-description">We deliver exceptional quality that exceeds expectations every time.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="container">
          <h2 class="cta-title">Ready to Get Started?</h2>
          <p class="cta-description">
            Join thousands of satisfied customers who have transformed their business with our solutions.
          </p>
          <button class="btn btn-cta">Contact Us Today</button>
        </div>
      </section>
    </div>`,
    css: `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
      }
      
      .page-wrapper {
        min-height: 100vh;
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
      }
      
      .hero-section {
        background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
        padding: 5rem 1rem;
        text-align: center;
      }
      
      .hero-title {
        font-size: 3rem;
        font-weight: bold;
        color: #111827;
        margin-bottom: 1.5rem;
      }
      
      .hero-description {
        font-size: 1.25rem;
        color: #4b5563;
        margin-bottom: 2rem;
        max-width: 42rem;
        margin-left: auto;
        margin-right: auto;
      }
      
      .hero-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .btn {
        padding: 0.75rem 2rem;
        border-radius: 0.5rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 1rem;
      }
      
      .btn-primary {
        background-color: #2563eb;
        color: white;
      }
      
      .btn-primary:hover {
        background-color: #1d4ed8;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
      .btn-secondary {
        background-color: transparent;
        color: #374151;
        border: 2px solid #d1d5db;
      }
      
      .btn-secondary:hover {
        background-color: #f9fafb;
        transform: translateY(-2px);
      }
      
      .features-section {
        padding: 4rem 1rem;
        background-color: white;
      }
      
      .section-title {
        font-size: 2rem;
        font-weight: bold;
        text-align: center;
        margin-bottom: 3rem;
        color: #111827;
      }
      
      .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
      }
      
      .feature-card {
        text-align: center;
        padding: 1.5rem;
      }
      
      .feature-icon {
        width: 4rem;
        height: 4rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        margin: 0 auto 1rem;
        background-color: #dbeafe;
      }
      
      .feature-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
        color: #111827;
      }
      
      .feature-description {
        color: #4b5563;
      }
      
      .cta-section {
        padding: 4rem 1rem;
        background-color: #111827;
        color: white;
        text-align: center;
      }
      
      .cta-title {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 1rem;
      }
      
      .cta-description {
        color: #d1d5db;
        margin-bottom: 2rem;
        max-width: 42rem;
        margin-left: auto;
        margin-right: auto;
      }
      
      .btn-cta {
        background-color: #2563eb;
        color: white;
      }
      
      .btn-cta:hover {
        background-color: #1d4ed8;
        transform: translateY(-2px);
      }
    `
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Perfect for restaurants and cafes',
    category: 'food',
    preview: '/templates/restaurant-preview.jpg',
    html: `<div class="restaurant-page">
      <!-- Header -->
      <header class="restaurant-header">
        <div class="container">
          <h1 class="restaurant-logo">Delicious Bistro</h1>
          <nav class="restaurant-nav">
            <a href="#menu" class="nav-link">Menu</a>
            <a href="#about" class="nav-link">About</a>
            <a href="#contact" class="nav-link">Contact</a>
          </nav>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="restaurant-hero">
        <div class="container">
          <h2 class="hero-title">Authentic Flavors, Fresh Ingredients</h2>
          <p class="hero-description">
            Experience culinary excellence with our chef-crafted dishes made from the finest local ingredients.
          </p>
          <button class="btn btn-menu">View Menu</button>
        </div>
      </section>

      <!-- Menu Preview -->
      <section class="menu-section">
        <div class="container">
          <h2 class="section-title">Featured Dishes</h2>
          <div class="menu-grid">
            <div class="menu-item">
              <div class="menu-image">🥘</div>
              <h3 class="menu-title">Signature Pasta</h3>
              <p class="menu-description">Fresh pasta with our secret sauce</p>
              <span class="menu-price">$18</span>
            </div>
            <div class="menu-item">
              <div class="menu-image">🥩</div>
              <h3 class="menu-title">Grilled Steak</h3>
              <p class="menu-description">Premium cut with seasonal vegetables</p>
              <span class="menu-price">$28</span>
            </div>
            <div class="menu-item">
              <div class="menu-image">🍰</div>
              <h3 class="menu-title">Chocolate Cake</h3>
              <p class="menu-description">Decadent dessert to end your meal</p>
              <span class="menu-price">$12</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="restaurant-footer">
        <div class="container">
          <h3 class="footer-title">Visit Us Today</h3>
          <p class="footer-info">123 Food Street, Culinary District | (555) 123-4567</p>
          <p class="footer-hours">Open: Mon-Sun 11AM - 10PM</p>
        </div>
      </footer>
    </div>`,
    css: `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
      }
      
      .restaurant-page {
        min-height: 100vh;
        background-color: #fef3c7;
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
      }
      
      .restaurant-header {
        background-color: #92400e;
        color: white;
        padding: 1rem 0;
      }
      
      .restaurant-header .container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
      }
      
      .restaurant-logo {
        font-size: 1.5rem;
        font-weight: bold;
      }
      
      .restaurant-nav {
        display: flex;
        gap: 1.5rem;
      }
      
      .nav-link {
        color: white;
        text-decoration: none;
        transition: color 0.3s ease;
      }
      
      .nav-link:hover {
        color: #fcd34d;
      }
      
      .restaurant-hero {
        background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
        padding: 5rem 1rem;
        text-align: center;
      }
      
      .hero-title {
        font-size: 3rem;
        font-weight: bold;
        color: #92400e;
        margin-bottom: 1.5rem;
      }
      
      .hero-description {
        font-size: 1.25rem;
        color: #b45309;
        margin-bottom: 2rem;
        max-width: 42rem;
        margin-left: auto;
        margin-right: auto;
      }
      
      .btn {
        padding: 0.75rem 2rem;
        border-radius: 0.5rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 1rem;
      }
      
      .btn-menu {
        background-color: #d97706;
        color: white;
      }
      
      .btn-menu:hover {
        background-color: #b45309;
        transform: translateY(-2px);
      }
      
      .menu-section {
        padding: 4rem 1rem;
        background-color: white;
      }
      
      .section-title {
        font-size: 2rem;
        font-weight: bold;
        text-align: center;
        margin-bottom: 3rem;
        color: #92400e;
      }
      
      .menu-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
      }
      
      .menu-item {
        text-align: center;
        padding: 1.5rem;
      }
      
      .menu-image {
        background-color: #fef3c7;
        height: 12rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
      }
      
      .menu-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #111827;
      }
      
      .menu-description {
        color: #4b5563;
        margin-bottom: 0.5rem;
      }
      
      .menu-price {
        color: #d97706;
        font-weight: bold;
        font-size: 1.125rem;
      }
      
      .restaurant-footer {
        background-color: #92400e;
        color: white;
        padding: 2rem 0;
        text-align: center;
      }
      
      .footer-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }
      
      .footer-info, .footer-hours {
        color: #fcd34d;
        margin-top: 0.5rem;
      }
    `
  },
  {
    id: 'portfolio',
    name: 'Creative Portfolio',
    description: 'Showcase your creative work',
    category: 'portfolio',
    preview: '/templates/portfolio-preview.jpg',
    html: `<div class="portfolio-page">
      <!-- Hero Section -->
      <section class="portfolio-hero">
        <div class="container">
          <h1 class="hero-title">Creative Designer</h1>
          <p class="hero-description">
            Bringing ideas to life through innovative design and creative solutions.
          </p>
          <button class="btn btn-portfolio">View My Work</button>
        </div>
      </section>

      <!-- About Section -->
      <section class="about-section">
        <div class="container">
          <div class="about-content">
            <h2 class="section-title">About Me</h2>
            <p class="about-text">
              I'm a passionate creative designer with over 5 years of experience in visual design, 
              branding, and digital experiences. I love turning complex problems into simple, 
              beautiful, and intuitive solutions.
            </p>
          </div>
        </div>
      </section>

      <!-- Portfolio Grid -->
      <section class="work-section">
        <div class="container">
          <h2 class="section-title">Recent Work</h2>
          <div class="work-grid">
            <div class="work-item">
              <div class="work-image work-image-1">
                <div class="work-overlay">
                  <span class="work-view">View Project</span>
                </div>
              </div>
              <h3 class="work-title">Brand Identity</h3>
              <p class="work-description">Complete branding package for tech startup</p>
            </div>
            <div class="work-item">
              <div class="work-image work-image-2">
                <div class="work-overlay">
                  <span class="work-view">View Project</span>
                </div>
              </div>
              <h3 class="work-title">Web Design</h3>
              <p class="work-description">Modern e-commerce website design</p>
            </div>
            <div class="work-item">
              <div class="work-image work-image-3">
                <div class="work-overlay">
                  <span class="work-view">View Project</span>
                </div>
              </div>
              <h3 class="work-title">Mobile App</h3>
              <p class="work-description">iOS app interface design</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Contact Section -->
      <section class="contact-section">
        <div class="container">
          <h2 class="contact-title">Let's Work Together</h2>
          <p class="contact-description">
            Have a project in mind? I'd love to hear about it and discuss how we can bring your vision to life.
          </p>
          <button class="btn btn-contact">Get In Touch</button>
        </div>
      </section>
    </div>`,
    css: `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
      }
      
      .portfolio-page {
        min-height: 100vh;
        background-color: #f9fafb;
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
      }
      
      .portfolio-hero {
        background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
        color: white;
        padding: 5rem 1rem;
        text-align: center;
      }
      
      .hero-title {
        font-size: 3rem;
        font-weight: bold;
        margin-bottom: 1.5rem;
      }
      
      .hero-description {
        font-size: 1.25rem;
        margin-bottom: 2rem;
        max-width: 42rem;
        margin-left: auto;
        margin-right: auto;
        opacity: 0.9;
      }
      
      .btn {
        padding: 0.75rem 2rem;
        border-radius: 0.5rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 1rem;
      }
      
      .btn-portfolio {
        background-color: white;
        color: #8b5cf6;
      }
      
      .btn-portfolio:hover {
        background-color: #f3f4f6;
        transform: translateY(-2px);
      }
      
      .about-section {
        padding: 4rem 1rem;
      }
      
      .about-content {
        max-width: 48rem;
        margin: 0 auto;
        text-align: center;
      }
      
      .section-title {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 1.5rem;
        color: #111827;
      }
      
      .about-text {
        font-size: 1.125rem;
        color: #4b5563;
        line-height: 1.8;
      }
      
      .work-section {
        padding: 4rem 1rem;
        background-color: white;
      }
      
      .work-section .section-title {
        text-align: center;
        margin-bottom: 3rem;
      }
      
      .work-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
      }
      
      .work-item {
        cursor: pointer;
      }
      
      .work-image {
        height: 16rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        position: relative;
        overflow: hidden;
        transition: transform 0.3s ease;
      }
      
      .work-image-1 {
        background: linear-gradient(135deg, #f472b6 0%, #8b5cf6 100%);
      }
      
      .work-image-2 {
        background: linear-gradient(135deg, #60a5fa 0%, #06b6d4 100%);
      }
      
      .work-image-3 {
        background: linear-gradient(135deg, #4ade80 0%, #10b981 100%);
      }
      
      .work-overlay {
        position: absolute;
        inset: 0;
        background-color: rgba(0, 0, 0, 0);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s ease;
      }
      
      .work-view {
        color: white;
        font-weight: 600;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .work-item:hover .work-image {
        transform: scale(1.05);
      }
      
      .work-item:hover .work-overlay {
        background-color: rgba(0, 0, 0, 0.3);
      }
      
      .work-item:hover .work-view {
        opacity: 1;
      }
      
      .work-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #111827;
      }
      
      .work-description {
        color: #4b5563;
      }
      
      .contact-section {
        padding: 4rem 1rem;
        background-color: #111827;
        color: white;
        text-align: center;
      }
      
      .contact-title {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 1.5rem;
      }
      
      .contact-description {
        color: #d1d5db;
        margin-bottom: 2rem;
        max-width: 42rem;
        margin-left: auto;
        margin-right: auto;
      }
      
      .btn-contact {
        background-color: #8b5cf6;
        color: white;
      }
      
      .btn-contact:hover {
        background-color: #7c3aed;
        transform: translateY(-2px);
      }
    `
  },
  {
    id: 'tech-startup',
    name: 'Tech Startup',
    description: 'Modern tech company landing page',
    category: 'tech',
    preview: '/templates/tech-preview.jpg',
    html: `<div class="tech-page">
      <!-- Navigation -->
      <nav class="tech-nav">
        <div class="container">
          <div class="nav-content">
            <div class="tech-logo">TechFlow</div>
            <div class="nav-links">
              <a href="#features" class="nav-link">Features</a>
              <a href="#pricing" class="nav-link">Pricing</a>
              <a href="#contact" class="nav-link">Contact</a>
              <button class="btn btn-nav">Get Started</button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="tech-hero">
        <div class="container">
          <div class="hero-content">
            <h1 class="hero-title">
              Build Better Products
              <span class="hero-highlight">Faster</span>
            </h1>
            <p class="hero-description">
              Streamline your development workflow with our powerful tools and integrations. 
              Ship features 10x faster with confidence.
            </p>
            <div class="hero-buttons">
              <button class="btn btn-primary-large">Start Free Trial</button>
              <button class="btn btn-secondary-large">Watch Demo</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="tech-features">
        <div class="container">
          <div class="features-header">
            <h2 class="section-title">Everything You Need</h2>
            <p class="section-subtitle">Powerful features to accelerate your development</p>
          </div>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon feature-icon-1">⚡</div>
              <h3 class="feature-title">Lightning Fast</h3>
              <p class="feature-description">Deploy in seconds with our optimized infrastructure and CDN.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon feature-icon-2">🔒</div>
              <h3 class="feature-title">Secure by Default</h3>
              <p class="feature-description">Enterprise-grade security with automatic SSL and DDoS protection.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon feature-icon-3">🚀</div>
              <h3 class="feature-title">Scale Effortlessly</h3>
              <p class="feature-description">Auto-scaling infrastructure that grows with your business.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="tech-cta">
        <div class="container">
          <h2 class="cta-title">Ready to Transform Your Workflow?</h2>
          <p class="cta-description">
            Join over 10,000 developers who are building better products with TechFlow.
          </p>
          <button class="btn btn-cta-large">Start Your Free Trial</button>
        </div>
      </section>
    </div>`,
    css: `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
      }
      
      .tech-page {
        min-height: 100vh;
        background-color: white;
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
      }
      
      .tech-nav {
        background-color: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        position: sticky;
        top: 0;
        z-index: 50;
      }
      
      .nav-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 0;
        flex-wrap: wrap;
      }
      
      .tech-logo {
        font-size: 1.5rem;
        font-weight: bold;
        color: #4f46e5;
      }
      
      .nav-links {
        display: flex;
        align-items: center;
        gap: 2rem;
        flex-wrap: wrap;
      }
      
      .nav-link {
        color: #4b5563;
        text-decoration: none;
        transition: color 0.3s ease;
      }
      
      .nav-link:hover {
        color: #4f46e5;
      }
      
      .btn {
        padding: 0.5rem 1.5rem;
        border-radius: 0.5rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 1rem;
      }
      
      .btn-nav {
        background-color: #4f46e5;
        color: white;
      }
      
      .btn-nav:hover {
        background-color: #4338ca;
      }
      
      .tech-hero {
        background: linear-gradient(135deg, #eef2ff 0%, #f3e8ff 100%);
        padding: 5rem 1rem;
      }
      
      .hero-content {
        text-align: center;
        max-width: 64rem;
        margin: 0 auto;
      }
      
      .hero-title {
        font-size: 3.75rem;
        font-weight: bold;
        color: #111827;
        margin-bottom: 1.5rem;
      }
      
      .hero-highlight {
        color: #4f46e5;
      }
      
      .hero-description {
        font-size: 1.25rem;
        color: #4b5563;
        margin-bottom: 2rem;
        line-height: 1.8;
      }
      
      .hero-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .btn-primary-large, .btn-secondary-large {
        padding: 1rem 2rem;
        font-size: 1.125rem;
      }
      
      .btn-primary-large {
        background-color: #4f46e5;
        color: white;
      }
      
      .btn-primary-large:hover {
        background-color: #4338ca;
        transform: translateY(-2px);
      }
      
      .btn-secondary-large {
        background-color: transparent;
        color: #374151;
        border: 2px solid #d1d5db;
      }
      
      .btn-secondary-large:hover {
        background-color: #f9fafb;
        transform: translateY(-2px);
      }
      
      .tech-features {
        padding: 5rem 1rem;
      }
      
      .features-header {
        text-align: center;
        margin-bottom: 4rem;
      }
      
      .section-title {
        font-size: 2.5rem;
        font-weight: bold;
        color: #111827;
        margin-bottom: 1rem;
      }
      
      .section-subtitle {
        font-size: 1.25rem;
        color: #4b5563;
      }
      
      .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
      }
      
      .feature-card {
        padding: 2rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        transition: box-shadow 0.3s ease;
      }
      
      .feature-card:hover {
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      }
      
      .feature-icon {
        width: 3rem;
        height: 3rem;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1rem;
        font-size: 1.25rem;
      }
      
      .feature-icon-1 {
        background-color: #eef2ff;
        color: #4f46e5;
      }
      
      .feature-icon-2 {
        background-color: #f0fdf4;
        color: #16a34a;
      }
      
      .feature-icon-3 {
        background-color: #faf5ff;
        color: #a855f7;
      }
      
      .feature-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
        color: #111827;
      }
      
      .feature-description {
        color: #4b5563;
      }
      
      .tech-cta {
        padding: 5rem 1rem;
        background-color: #4f46e5;
        color: white;
        text-align: center;
      }
      
      .cta-title {
        font-size: 2.5rem;
        font-weight: bold;
        margin-bottom: 1.5rem;
      }
      
      .cta-description {
        font-size: 1.25rem;
        margin-bottom: 2rem;
        opacity: 0.9;
        max-width: 42rem;
        margin-left: auto;
        margin-right: auto;
      }
      
      .btn-cta-large {
        background-color: white;
        color: #4f46e5;
        padding: 1rem 2rem;
        font-size: 1.125rem;
      }
      
      .btn-cta-large:hover {
        background-color: #f3f4f6;
        transform: translateY(-2px);
      }
    `
  },
  {
    id: 'fitness',
    name: 'Fitness Studio',
    description: 'Perfect for gyms and fitness centers',
    category: 'fitness',
    preview: '/templates/fitness-preview.jpg',
    html: `<div class="fitness-page">
      <!-- Hero Section -->
      <section class="fitness-hero">
        <div class="container">
          <h1 class="hero-title">Transform Your Body</h1>
          <p class="hero-description">
            Join the ultimate fitness experience. Professional trainers, state-of-the-art equipment, 
            and a community that motivates you to achieve your goals.
          </p>
          <button class="btn btn-hero">Start Your Journey</button>
        </div>
      </section>

      <!-- Programs Section -->
      <section class="programs-section">
        <div class="container">
          <h2 class="section-title">Our Programs</h2>
          <div class="programs-grid">
            <div class="program-card">
              <div class="program-icon">💪</div>
              <h3 class="program-title">Strength Training</h3>
              <p class="program-description">Build muscle and increase strength with our comprehensive weight training programs.</p>
              <ul class="program-features">
                <li>• Personal Training Sessions</li>
                <li>• Group Classes</li>
                <li>• Nutrition Guidance</li>
              </ul>
            </div>
            <div class="program-card">
              <div class="program-icon">❤️</div>
              <h3 class="program-title">Cardio Fitness</h3>
              <p class="program-description">Improve your cardiovascular health with high-energy cardio workouts.</p>
              <ul class="program-features">
                <li>• HIIT Classes</li>
                <li>• Cycling</li>
                <li>• Running Programs</li>
              </ul>
            </div>
            <div class="program-card">
              <div class="program-icon">🧘</div>
              <h3 class="program-title">Yoga & Flexibility</h3>
              <p class="program-description">Find balance and improve flexibility with our yoga and stretching classes.</p>
              <ul class="program-features">
                <li>• Hatha Yoga</li>
                <li>• Power Yoga</li>
                <li>• Meditation Sessions</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Membership Section -->
      <section class="membership-section">
        <div class="container">
          <h2 class="section-title">Membership Plans</h2>
          <div class="membership-grid">
            <div class="membership-card">
              <h3 class="membership-name">Basic</h3>
              <div class="membership-price">$29<span class="price-period">/month</span></div>
              <ul class="membership-features">
                <li><span class="feature-check">✓</span> Gym Access</li>
                <li><span class="feature-check">✓</span> Group Classes</li>
                <li><span class="feature-check">✓</span> Locker Room</li>
              </ul>
              <button class="btn btn-membership">Choose Plan</button>
            </div>
            <div class="membership-card membership-popular">
              <div class="popular-badge">POPULAR</div>
              <h3 class="membership-name">Premium</h3>
              <div class="membership-price">$59<span class="price-period">/month</span></div>
              <ul class="membership-features">
                <li><span class="feature-check">✓</span> Everything in Basic</li>
                <li><span class="feature-check">✓</span> Personal Training</li>
                <li><span class="feature-check">✓</span> Nutrition Plan</li>
                <li><span class="feature-check">✓</span> 24/7 Access</li>
              </ul>
              <button class="btn btn-membership-popular">Choose Plan</button>
            </div>
            <div class="membership-card">
              <h3 class="membership-name">Elite</h3>
              <div class="membership-price">$99<span class="price-period">/month</span></div>
              <ul class="membership-features">
                <li><span class="feature-check">✓</span> Everything in Premium</li>
                <li><span class="feature-check">✓</span> VIP Lounge</li>
                <li><span class="feature-check">✓</span> Massage Therapy</li>
                <li><span class="feature-check">✓</span> Guest Passes</li>
              </ul>
              <button class="btn btn-membership">Choose Plan</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Contact Section -->
      <section class="contact-section">
        <div class="container">
          <h2 class="contact-title">Ready to Start?</h2>
          <p class="contact-description">
            Visit our gym today for a free consultation and tour. Your fitness journey starts here!
          </p>
          <div class="contact-buttons">
            <button class="btn btn-contact-primary">Book Free Trial</button>
            <button class="btn btn-contact-secondary">Call Now</button>
          </div>
        </div>
      </section>
    </div>`,
    css: `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
      }
      
      .fitness-page {
        min-height: 100vh;
        background-color: #111827;
        color: white;
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
      }
      
      .fitness-hero {
        background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
        padding: 5rem 1rem;
        text-align: center;
        position: relative;
      }
      
      .hero-title {
        font-size: 3.75rem;
        font-weight: bold;
        margin-bottom: 1.5rem;
      }
      
      .hero-description {
        font-size: 1.25rem;
        margin-bottom: 2rem;
        max-width: 42rem;
        margin-left: auto;
        margin-right: auto;
        opacity: 0.9;
      }
      
      .btn {
        padding: 1rem 2rem;
        border-radius: 0.5rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 1.125rem;
      }
      
      .btn-hero {
        background-color: white;
        color: #dc2626;
      }
      
      .btn-hero:hover {
        background-color: #f3f4f6;
        transform: translateY(-2px);
      }
      
      .programs-section {
        padding: 5rem 1rem;
        background-color: #1f2937;
      }
      
      .section-title {
        font-size: 2.5rem;
        font-weight: bold;
        text-align: center;
        margin-bottom: 3rem;
      }
      
      .programs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
      }
      
      .program-card {
        background-color: #374151;
        padding: 2rem;
        border-radius: 0.75rem;
      }
      
      .program-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }
      
      .program-title {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 1rem;
      }
      
      .program-description {
        color: #d1d5db;
        margin-bottom: 1.5rem;
      }
      
      .program-features {
        list-style: none;
        color: #d1d5db;
      }
      
      .program-features li {
        margin-bottom: 0.5rem;
      }
      
      .membership-section {
        padding: 5rem 1rem;
        background-color: #111827;
      }
      
      .membership-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
        max-width: 80rem;
        margin: 0 auto;
      }
      
      .membership-card {
        background-color: #1f2937;
        padding: 2rem;
        border-radius: 0.75rem;
        border: 2px solid #374151;
        text-align: center;
        position: relative;
      }
      
      .membership-popular {
        background-color: #dc2626;
        border-color: #b91c1c;
      }
      
      .popular-badge {
        position: absolute;
        top: -0.75rem;
        left: 50%;
        transform: translateX(-50%);
        background-color: #fbbf24;
        color: #111827;
        padding: 0.25rem 1rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 600;
      }
      
      .membership-name {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 1rem;
      }
      
      .membership-price {
        font-size: 2.5rem;
        font-weight: bold;
        color: #ef4444;
        margin-bottom: 1.5rem;
      }
      
      .membership-popular .membership-price {
        color: white;
      }
      
      .price-period {
        font-size: 1.125rem;
        color: #9ca3af;
      }
      
      .membership-popular .price-period {
        opacity: 0.7;
      }
      
      .membership-features {
        list-style: none;
        margin-bottom: 2rem;
        text-align: left;
      }
      
      .membership-features li {
        display: flex;
        align-items: center;
        margin-bottom: 0.75rem;
      }
      
      .feature-check {
        color: #10b981;
        margin-right: 0.5rem;
      }
      
      .membership-popular .feature-check {
        color: #6ee7b7;
      }
      
      .btn-membership {
        width: 100%;
        background-color: #dc2626;
        color: white;
      }
      
      .btn-membership:hover {
        background-color: #b91c1c;
      }
      
      .btn-membership-popular {
        width: 100%;
        background-color: white;
        color: #dc2626;
      }
      
      .btn-membership-popular:hover {
        background-color: #f3f4f6;
      }
      
      .contact-section {
        padding: 5rem 1rem;
        background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
        text-align: center;
      }
      
      .contact-title {
        font-size: 2.5rem;
        font-weight: bold;
        margin-bottom: 1.5rem;
      }
      
      .contact-description {
        font-size: 1.25rem;
        margin-bottom: 2rem;
        opacity: 0.9;
        max-width: 42rem;
        margin-left: auto;
        margin-right: auto;
      }
      
      .contact-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .btn-contact-primary {
        background-color: white;
        color: #dc2626;
      }
      
      .btn-contact-primary:hover {
        background-color: #f3f4f6;
      }
      
      .btn-contact-secondary {
        background-color: transparent;
        color: white;
        border: 2px solid white;
      }
      
      .btn-contact-secondary:hover {
        background-color: white;
        color: #dc2626;
      }
    `
  }
];

export const getTemplatesByCategory = (category = null) => {
  if (!category) return websiteTemplates;
  return websiteTemplates.filter(template => template.category === category);
};

export const getTemplateById = (id) => {
  return websiteTemplates.find(template => template.id === id);
}; 