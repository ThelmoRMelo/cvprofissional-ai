import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateModel, Plan } from '@/types/resume';
import { supabase } from '@/integrations/supabase/client';
import { fetchTemplates, templateToRow } from '@/lib/cloudSync';

interface TemplateState {
  templates: TemplateModel[];
  loadFromCloud: () => Promise<void>;
  addTemplate: (template: Omit<TemplateModel, 'id' | 'createdAt' | 'updatedAt'>) => TemplateModel;
  updateTemplate: (id: string, data: Partial<TemplateModel>) => void;
  deleteTemplate: (id: string) => void;
  toggleTemplateActive: (id: string) => void;
  getActiveTemplates: () => TemplateModel[];
  getTemplatesByCategory: (category: Plan) => TemplateModel[];
  getTemplateById: (id: string) => TemplateModel | undefined;
}

const report = ({ error }: { error: unknown }) => { if (error) console.error('Erro ao salvar modelo', error); };

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: [],

      loadFromCloud: async () => {
        const list = await fetchTemplates();
        if (list) set({ templates: list });
      },

      addTemplate: (templateData) => {
        const newTemplate: TemplateModel = { ...templateData, id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date() };
        set((state) => ({ templates: [...state.templates, newTemplate] }));
        void supabase.from('templates').insert({ id: newTemplate.id, ...templateToRow(newTemplate) } as never).then(report);
        return newTemplate;
      },

      updateTemplate: (id, data) => {
        set((state) => ({ templates: state.templates.map((t) => (t.id === id ? { ...t, ...data, updatedAt: new Date() } : t)) }));
        void supabase.from('templates').update({ ...templateToRow(data), updated_at: new Date().toISOString() } as never).eq('id', id).then(report);
      },

      deleteTemplate: (id) => {
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
        void supabase.from('templates').delete().eq('id', id).then(report);
      },

      toggleTemplateActive: (id) => {
        const t = get().templates.find((x) => x.id === id);
        if (t) get().updateTemplate(id, { isActive: !t.isActive });
      },

      getActiveTemplates: () => get().templates.filter((t) => t.isActive),
      getTemplatesByCategory: (category) => get().templates.filter((t) => t.category === category && t.isActive),
      getTemplateById: (id) => get().templates.find((t) => t.id === id),
    }),
    { name: 'template-storage-v2' }
  )
);
