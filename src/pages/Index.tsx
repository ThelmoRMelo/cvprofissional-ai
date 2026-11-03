import { Header } from '@/components/landing/Header';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { WhatsAppFloatingButton } from '@/components/public/WhatsAppFloatingButton';
import { useSettingsStore } from '@/store/settingsStore';

const Index = () => {
  const settings = useSettingsStore((state) => state.settings);
  return (
    <div className="min-h-screen">
      <Header />
      {settings.announcementBannerEnabled && settings.announcementBannerText && <div className="bg-accent px-4 py-2 text-center text-sm font-medium text-accent-foreground">{settings.announcementBannerText}</div>}
      <main className="pt-16">
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        
        {/* Footer */}
        <footer className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-primary-foreground/60 text-sm">
              © {new Date().getFullYear()} {settings.companyName}. {settings.footerText}
            </p>
          </div>
        </footer>
      </main>
      <WhatsAppFloatingButton />
    </div>
  );
};

export default Index;
