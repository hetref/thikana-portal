import Navigation from "@/components/landing-pages/Navigation";
import Hero from "@/components/landing-pages/Hero";
import Clients from "@/components/landing-pages/Clients";

const LandingPage = () => (
    <div className="max-w-7xl mx-auto">
      <Navigation />
      <Hero />
      <Clients />
    </div>
  );
  
  export default LandingPage;