<script>
  // Component state
  let isMenuOpen = false;
  
  // Toggle mobile menu
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }
  
  // Mock data for the features section
  const features = [
    {
      title: "Multiple Choice",
      description: "Berbagai macam timer yang ada.",
      icon: "⚡"
    },
    {
      title: "Responsive Design",
      description: "Looks great on all devices from mobile phones to desktop monitors.",
      icon: "📱"
    },
    {
      title: "Beautiful UI",
      description: "Memiliki tampilan yang menarik",
      icon: "🛠️"
    }
  ];
</script>

<style>
  /* Global styles */
  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 0;
    color: #333;
    background-color: #f8f9fa;
  }
  
  /* Navigation */
  nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background-color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .logo {
    font-weight: 700;
    font-size: 1.5rem;
    color: #6366f1;
  }
  
  .nav-links {
    display: flex;
    gap: 2rem;
  }
  
  .nav-links a {
    text-decoration: none;
    color: #4b5563;
    font-weight: 500;
    transition: color 0.2s ease;
  }
  
  .nav-links a:hover {
    color: #6366f1;
  }
  
  .menu-button {
    display: none;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
  }
  
  /* Hero section */
  .hero {
    padding: 5rem 2rem;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
  }
  
  .hero h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    max-width: 800px;
  }
  
  .hero p {
    font-size: 1.25rem;
    margin-bottom: 2rem;
    max-width: 600px;
    opacity: 0.9;
  }
  
  .cta-buttons {
    display: flex;
    gap: 1rem;
  }
  
  .button {
    padding: 0.75rem 1.5rem;
    border-radius: 0.375rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s ease;
  }
  
  .primary-button {
    background-color: white;
    color: #6366f1;
  }
  
  .primary-button:hover {
    background-color: #f9fafb;
    transform: translateY(-2px);
  }
  
  .secondary-button {
    background-color: transparent;
    color: white;
    border: 2px solid white;
  }
  
  .secondary-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
  
  /* Features section */
  .features {
    padding: 5rem 2rem;
    background-color: white;
  }
  
  .section-title {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 3rem;
    color: #1f2937;
  }
  
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .feature-card {
    background-color: #f9fafb;
    border-radius: 0.5rem;
    padding: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  }
  
  .feature-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }
  
  .feature-title {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
    color: #1f2937;
  }
  
  /* Footer */
  footer {
    padding: 2rem;
    background-color: #1f2937;
    color: white;
    text-align: center;
  }
  
  /* Responsive styles */
  @media (max-width: 768px) {
    .nav-links {
      display: none;
    }
    
    .nav-links.open {
      display: flex;
      flex-direction: column;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background-color: white;
      padding: 1rem 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .menu-button {
      display: block;
    }
    
    .hero h1 {
      font-size: 2rem;
    }
    
    .hero p {
      font-size: 1rem;
    }
    
    .cta-buttons {
      flex-direction: column;
    }
  }
</style>

<main>
  <!-- Navigation Bar -->
  <nav>
    <div class="logo">Tunggu.in</div>
    <div class="nav-links" class:open={isMenuOpen}>
      <a href="#home">Home</a>
      <a href="#features">Features</a>
      <a href="#about">About</a>
      <a href="#contact">Contact</a>
    </div>
    <button class="menu-button" on:click={toggleMenu}>
      {isMenuOpen ? '✕' : '☰'}
    </button>
  </nav>
  
  <!-- Hero Section -->
  <section class="hero" id="home">
    <h1>Tunggu.in revolutionary app for menunggu anything</h1>
    <p>Mari menunggu segala hal dengan mudah, tepat waktu, dan menyenangkan</p>
    <div class="cta-buttons">
      <a href="#get-started" class="button primary-button">Get Started</a>
      <a href="#learn-more" class="button secondary-button">Learn More</a>
    </div>
  </section>
  
  <!-- Features Section -->
  <section class="features" id="features">
    <h2 class="section-title">Key Features</h2>
    <div class="features-grid">
      {#each features as feature}
        <div class="feature-card">
          <div class="feature-icon">{feature.icon}</div>
          <h3 class="feature-title">{feature.title}</h3>
          <p>{feature.description}</p>
        </div>
      {/each}
    </div>
  </section>
  
  <!-- Footer -->
  <footer>
    <p>&copy; 2025 Tunggu.in. All rights reserved.</p>
  </footer>
</main>