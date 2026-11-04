import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TemplateModel, Plan } from '@/types/resume';
import { supabase } from '@/integrations/supabase/client';
import { fetchTemplates, templateToRow } from '@/lib/cloudSync';

interface TemplateState {
  templates: TemplateModel[];
  loadFromCloud: (persistStarterTemplates?: boolean) => Promise<void>;
  addTemplate: (template: Omit<TemplateModel, 'id' | 'createdAt' | 'updatedAt'>) => TemplateModel;
  updateTemplate: (id: string, data: Partial<TemplateModel>) => void;
  deleteTemplate: (id: string) => void;
  toggleTemplateActive: (id: string) => void;
  getActiveTemplates: () => TemplateModel[];
  getTemplatesByCategory: (category: Plan) => TemplateModel[];
  getTemplateById: (id: string) => TemplateModel | undefined;
}

const report = ({ error }: { error: unknown }) => { if (error) console.error('Erro ao salvar modelo', error); };

const BASIC_STARTER_TEMPLATES: TemplateModel[] = [
  { id: 'c1f0a001-0000-4000-8000-000000000001', name: 'Básico Essencial', category: 'basic', previewUrl: '/basic-essencial.svg', prompt: 'Currículo de uma coluna, direto e fácil de ler.', generatedHtml: '<main class="resume basic-essential"><header><h1>Nome Completo</h1><p>Contato · E-mail · Cidade</p></header><section><h2>Objetivo</h2><p>Resumo profissional objetivo.</p></section><section><h2>Experiência</h2><p>Cargo · Empresa · Período</p></section><section><h2>Formação</h2><p>Curso · Instituição</p></section><section><h2>Habilidades</h2><p>Competência · Competência</p></section></main>', isActive: true, createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z') },
  { id: 'c1f0a001-0000-4000-8000-000000000002', name: 'Básico ATS', category: 'basic', previewUrl: '/basic-ats.svg', prompt: 'Currículo ATS de uma coluna, sem elementos decorativos excessivos.', generatedHtml: '<main class="resume basic-ats"><header><h1>Nome Completo</h1><p>Telefone | E-mail | Cidade</p></header><section><h2>Resumo Profissional</h2><p>Resumo claro com palavras-chave da vaga.</p></section><section><h2>Experiência Profissional</h2><p>Cargo, Empresa e resultados.</p></section><section><h2>Educação</h2><p>Formação e instituição.</p></section><section><h2>Competências</h2><p>Competência 1 · Competência 2</p></section></main>', isActive: true, createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z') },
  { id: 'c1f0a001-0000-4000-8000-000000000003', name: 'Básico Clássico', category: 'basic', previewUrl: '/basic-classico.svg', prompt: 'Currículo clássico com tipografia serifada e hierarquia formal.', generatedHtml: '<main class="resume basic-classic"><header><h1>Nome Completo</h1><p>Informações de contato</p></header><hr/><section><h2>Perfil</h2><p>Apresentação profissional.</p></section><section><h2>Histórico Profissional</h2><p>Função · Organização · Datas</p></section><section><h2>Formação Acadêmica</h2><p>Curso · Instituição</p></section><section><h2>Conhecimentos</h2><p>Conhecimento · Conhecimento</p></section></main>', isActive: true, createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z') },
  { id: 'c1f0a001-0000-4000-8000-000000000004', name: 'Básico Compacto', category: 'basic', previewUrl: '/basic-compacto.svg', prompt: 'Currículo compacto para destacar mais informações em uma página.', generatedHtml: '<main class="resume basic-compact"><header><h1>Nome Completo</h1><p>Contato · Localização</p></header><section><h2>Resumo</h2><p>Perfil em poucas linhas.</p></section><section><h2>Experiência</h2><p>Cargo e empresa · resultados principais.</p></section><section><h2>Formação</h2><p>Curso · Ano</p></section><section><h2>Habilidades</h2><p>Lista concisa de competências.</p></section></main>', isActive: true, createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z') },
  { id: 'c1f0a001-0000-4000-8000-000000000005', name: 'Básico Destaque', category: 'basic', previewUrl: '/basic-destaque.svg', prompt: 'Currículo básico com cabeçalho verde discreto e seções bem separadas.', generatedHtml: '<main class="resume basic-highlight"><header><h1>Nome Completo</h1><p>Contato · E-mail · Cidade</p></header><section><h2>Objetivo</h2><p>Objetivo profissional.</p></section><section><h2>Experiência</h2><p>Função · Empresa · Período</p></section><section><h2>Educação</h2><p>Curso · Instituição</p></section><section><h2>Habilidades</h2><p>Competências profissionais.</p></section></main>', isActive: true, createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z') },
];

const mergeStarterTemplates = (templates: TemplateModel[]) => {
  const byId = new Map(templates.map((template) => [template.id, template]));
  for (const starter of BASIC_STARTER_TEMPLATES) if (!byId.has(starter.id)) byId.set(starter.id, starter);
  return [...byId.values()];
};

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: BASIC_STARTER_TEMPLATES,

      loadFromCloud: async (persistStarterTemplates = false) => {
        const list = await fetchTemplates();
        const templates = mergeStarterTemplates(list ?? get().templates);
        set({ templates });
        if (persistStarterTemplates && list) {
          const existingIds = new Set(list.map((template) => template.id));
          const missing = BASIC_STARTER_TEMPLATES.filter((template) => !existingIds.has(template.id));
          if (missing.length) {
            const rows = missing.map((template) => ({ id: template.id, ...templateToRow(template), created_at: template.createdAt.toISOString(), updated_at: template.updatedAt.toISOString() }));
            const { error } = await supabase.from('templates').upsert(rows as never, { onConflict: 'id' });
            if (error) console.error('Não foi possível cadastrar os modelos Básicos iniciais:', error);
          }
        }
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
    {
      name: 'template-storage-v2',
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<TemplateState> | undefined) ?? {};
        return {
          ...currentState,
          templates: mergeStarterTemplates(persisted.templates ?? currentState.templates),
        };
      },
    }
  )
);
