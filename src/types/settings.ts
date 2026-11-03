import type { Plan } from '@/types/resume';

export interface PlanPaymentConfig {
  price: number;
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'telefone' | 'email' | 'aleatoria';
  accountHolder: string;
  qrCodeImageUrl: string;
}

export interface SiteSettings {
  companyName: string;
  supportPhone: string;
  whatsappMessage: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  announcementBannerEnabled: boolean;
  announcementBannerText: string;
  footerText: string;
  plans: Record<Plan, PlanPaymentConfig>;
  adminPin: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  companyName: 'CurrículoPro',
  supportPhone: '',
  whatsappMessage: 'Olá! Preciso de ajuda com meu currículo.',
  heroBadge: 'Currículo profissional em minutos',
  heroTitle: 'Crie seu currículo profissional em minutos',
  heroSubtitle: 'Construa um currículo impressionante com nossa ferramenta simples e intuitiva. Preencha seus dados, escolha um modelo e baixe após a confirmação do pagamento.',
  heroButtonText: 'Ver planos',
  announcementBannerEnabled: false,
  announcementBannerText: '',
  footerText: 'Todos os direitos reservados.',
  plans: {
    basic: { price: 2, pixKey: 'pix@curriculopro.com.br', pixKeyType: 'email', accountHolder: '', qrCodeImageUrl: '' },
    intermediate: { price: 3, pixKey: 'pix@curriculopro.com.br', pixKeyType: 'email', accountHolder: '', qrCodeImageUrl: '' },
    professional: { price: 5, pixKey: 'pix@curriculopro.com.br', pixKeyType: 'email', accountHolder: '', qrCodeImageUrl: '' },
  },
  adminPin: '1234',
};
