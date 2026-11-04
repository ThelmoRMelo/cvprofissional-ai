export type Plan = 'basic' | 'intermediate' | 'professional';

export type PaymentStatus = 'pending' | 'receipt_sent' | 'confirmed';

export type ResumeTemplate = 'modern' | 'classic' | 'minimal';

export interface PersonalData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  linkedin?: string;
  objective?: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface Skill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface Resume {
  id: string;
  accessToken?: string;
  clientName: string;
  plan: Plan;
  template: ResumeTemplate;
  paymentStatus: PaymentStatus;
  downloadEnabled: boolean;
  receiptUrl?: string;
  receiptPath?: string;
  personalData: PersonalData;
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
  createdAt: Date;
  updatedAt: Date;
}

// Template Model for admin management
export interface TemplateModel {
  id: string;
  name: string;
  category: Plan;
  previewUrl: string;
  referenceFileUrl?: string;
  prompt?: string;
  generatedHtml?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const PLANS = {
  basic: { name: 'Básico', price: 2.0, features: ['1 modelo de currículo', 'Download em PDF'] },
  intermediate: { name: 'Intermediário', price: 3.0, features: ['3 modelos de currículo', 'Download em PDF', 'Cores personalizadas'] },
  professional: { name: 'Profissional', price: 5.0, features: ['Todos os modelos', 'Download em PDF', 'Cores personalizadas', 'Suporte prioritário'] },
} as const;
