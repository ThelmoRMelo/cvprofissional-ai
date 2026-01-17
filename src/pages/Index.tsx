import { Header } from '@/components/landing/Header';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingSection } from '@/components/landing/PricingSection';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        
        {/* Footer */}
        <footer className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-primary-foreground/60 text-sm">
              © 2024 CurrículoPro. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
