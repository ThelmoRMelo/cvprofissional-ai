import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateModel, Plan } from '@/types/resume';

interface TemplateState {
  templates: TemplateModel[];
  
  // Actions
  addTemplate: (template: Omit<TemplateModel, 'id' | 'createdAt' | 'updatedAt'>) => TemplateModel;
  updateTemplate: (id: string, data: Partial<TemplateModel>) => void;
  deleteTemplate: (id: string) => void;
  toggleTemplateActive: (id: string) => void;
  getActiveTemplates: () => TemplateModel[];
  getTemplatesByCategory: (category: Plan) => TemplateModel[];
  getTemplateById: (id: string) => TemplateModel | undefined;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// Default templates
const defaultTemplates: TemplateModel[] = [
  {
    id: 'modern-1',
    name: 'Moderno Executivo',
    category: 'professional',
    previewUrl: '/placeholder.svg',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'classic-1',
    name: 'Clássico Profissional',
    category: 'intermediate',
    previewUrl: '/placeholder.svg',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'minimal-1',
    name: 'Minimalista',
    category: 'basic',
    previewUrl: '/placeholder.svg',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: defaultTemplates,

      addTemplate: (templateData) => {
        const newTemplate: TemplateModel = {
          ...templateData,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          templates: [...state.templates, newTemplate],
        }));
        return newTemplate;
      },

      updateTemplate: (id: string, data: Partial<TemplateModel>) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...data, updatedAt: new Date() } : t
          ),
        }));
      },

      deleteTemplate: (id: string) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }));
      },

      toggleTemplateActive: (id: string) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, isActive: !t.isActive, updatedAt: new Date() } : t
          ),
        }));
      },

      getActiveTemplates: () => {
        return get().templates.filter((t) => t.isActive);
      },

      getTemplatesByCategory: (category: Plan) => {
        return get().templates.filter((t) => t.category === category && t.isActive);
      },

      getTemplateById: (id: string) => {
        return get().templates.find((t) => t.id === id);
      },
    }),
    {
      name: 'template-storage',
    }
  )
);
