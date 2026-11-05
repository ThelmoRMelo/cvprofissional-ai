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

type IntermediateLayout = {
  id: string;
  name: string;
  accent: string;
  dark: string;
  background: string;
  layout: 'sidebar' | 'banner' | 'columns' | 'timeline' | 'minimal';
  prompt: string;
};

const INTERMEDIATE_LAYOUTS: IntermediateLayout[] = [
  { id: 'c1f0a002-0000-4000-8000-000000000001', name: 'Intermediário Azul Executivo', accent: '#1687e8', dark: '#0b2d50', background: '#f4f8fc', layout: 'sidebar', prompt: 'Inspirado no modelo de faixa lateral azul: contato e habilidades à esquerda, conteúdo profissional em coluna principal.' },
  { id: 'c1f0a002-0000-4000-8000-000000000002', name: 'Intermediário Âmbar em Destaque', accent: '#f4b72f', dark: '#14264b', background: '#fffaf0', layout: 'banner', prompt: 'Inspirado no modelo de destaque amarelo: objetivo em bloco colorido, títulos escuros e seções bem hierarquizadas.' },
  { id: 'c1f0a002-0000-4000-8000-000000000003', name: 'Intermediário Céu Profissional', accent: '#1594ed', dark: '#073a78', background: '#eff7ff', layout: 'sidebar', prompt: 'Inspirado no modelo azul claro com coluna de contato, foto circular e barras para habilidades.' },
  { id: 'c1f0a002-0000-4000-8000-000000000004', name: 'Intermediário Verde Equilíbrio', accent: '#1a9b78', dark: '#123c3b', background: '#f1faf7', layout: 'columns', prompt: 'Layout equilibrado em verde, com cabeçalho limpo e formação e habilidades lado a lado.' },
  { id: 'c1f0a002-0000-4000-8000-000000000005', name: 'Intermediário Grafite Moderno', accent: '#75849a', dark: '#202b3b', background: '#f5f6f8', layout: 'banner', prompt: 'Cabeçalho grafite forte, linhas finas e estrutura moderna para perfis corporativos.' },
  { id: 'c1f0a002-0000-4000-8000-000000000006', name: 'Intermediário Vinho Elegante', accent: '#bb536d', dark: '#4b2438', background: '#fff6f7', layout: 'timeline', prompt: 'Detalhes vinho e linha do tempo discreta para destacar evolução profissional.' },
  { id: 'c1f0a002-0000-4000-8000-000000000007', name: 'Intermediário Roxo Criativo', accent: '#8a63d2', dark: '#352454', background: '#f8f5ff', layout: 'columns', prompt: 'Acentos roxos e composição em duas colunas para áreas criativas e digitais.' },
  { id: 'c1f0a002-0000-4000-8000-000000000008', name: 'Intermediário Turquesa Essencial', accent: '#13a6ad', dark: '#123f51', background: '#f0fbfc', layout: 'minimal', prompt: 'Design turquesa minimalista, com bastante respiro e leitura rápida.' },
  { id: 'c1f0a002-0000-4000-8000-000000000009', name: 'Intermediário Coral Dinâmico', accent: '#ef765c', dark: '#3b3543', background: '#fff7f3', layout: 'timeline', prompt: 'Destaques corais e marcadores visuais para competências e trajetória.' },
  { id: 'c1f0a002-0000-4000-8000-000000000010', name: 'Intermediário Marinho Clássico', accent: '#2874b8', dark: '#10294b', background: '#f3f7fc', layout: 'minimal', prompt: 'Composição marinho clássica com cabeçalho estruturado e seções claras.' },
];

const makePreviewUrl = ({ accent, dark, background, layout }: IntermediateLayout) => {
  const sidebar = layout === 'sidebar';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="594" viewBox="0 0 420 594"><rect width="420" height="594" rx="12" fill="${background}"/><rect x="0" y="0" width="${sidebar ? 126 : 420}" height="594" fill="${dark}"/><rect x="${sidebar ? 126 : 0}" y="0" width="${sidebar ? 294 : 420}" height="14" fill="${accent}"/><circle cx="${sidebar ? 63 : 350}" cy="78" r="36" fill="#fff" opacity=".94"/><circle cx="${sidebar ? 63 : 350}" cy="78" r="29" fill="${accent}" opacity=".32"/><rect x="${sidebar ? 151 : 30}" y="48" width="${sidebar ? 160 : 250}" height="12" rx="6" fill="${dark}"/><rect x="${sidebar ? 151 : 30}" y="69" width="${sidebar ? 125 : 190}" height="8" rx="4" fill="${accent}"/><rect x="${sidebar ? 151 : 30}" y="96" width="${sidebar ? 235 : 360}" height="2" fill="${accent}"/><g fill="${sidebar ? '#fff' : dark}" opacity=".9"><rect x="${sidebar ? 22 : 30}" y="140" width="${sidebar ? 80 : 145}" height="9" rx="4"/><rect x="${sidebar ? 22 : 30}" y="160" width="${sidebar ? 90 : 210}" height="5" rx="2"/><rect x="${sidebar ? 22 : 30}" y="174" width="${sidebar ? 92 : 170}" height="5" rx="2"/></g><g fill="${accent}" opacity=".9"><rect x="${sidebar ? 151 : 30}" y="${sidebar ? 132 : 142}" width="${sidebar ? 235 : 350}" height="23" rx="7"/></g><g fill="${dark}" opacity=".85"><rect x="${sidebar ? 151 : 30}" y="${sidebar ? 169 : 181}" width="${sidebar ? 174 : 230}" height="9" rx="4"/></g><g fill="#91a0b4" opacity=".58"><rect x="${sidebar ? 151 : 30}" y="${sidebar ? 188 : 200}" width="${sidebar ? 225 : 350}" height="5" rx="2"/><rect x="${sidebar ? 151 : 30}" y="${sidebar ? 201 : 212}" width="${sidebar ? 206 : 315}" height="5" rx="2"/><rect x="${sidebar ? 151 : 30}" y="${sidebar ? 214 : 224}" width="${sidebar ? 214 : 330}" height="5" rx="2"/></g><rect x="${sidebar ? 151 : 30}" y="260" width="${sidebar ? 235 : 350}" height="23" rx="7" fill="${accent}" opacity=".9"/><g fill="#91a0b4" opacity=".58"><rect x="${sidebar ? 151 : 30}" y="297" width="${sidebar ? 215 : 330}" height="5" rx="2"/><rect x="${sidebar ? 151 : 30}" y="310" width="${sidebar ? 228 : 348}" height="5" rx="2"/><rect x="${sidebar ? 151 : 30}" y="323" width="${sidebar ? 190 : 300}" height="5" rx="2"/></g><rect x="${sidebar ? 151 : 30}" y="362" width="${sidebar ? 235 : 350}" height="23" rx="7" fill="${dark}" opacity=".92"/><g fill="#91a0b4" opacity=".58"><rect x="${sidebar ? 151 : 30}" y="399" width="${sidebar ? 205 : 320}" height="5" rx="2"/><rect x="${sidebar ? 151 : 30}" y="412" width="${sidebar ? 222 : 340}" height="5" rx="2"/><rect x="${sidebar ? 151 : 30}" y="425" width="${sidebar ? 194 : 295}" height="5" rx="2"/></g></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const makeIntermediateHtml = ({ accent, dark, background, layout }: IntermediateLayout) => {
  const sideLayout = layout === 'sidebar';
  const aside = `<aside style="background:${dark};color:#fff;padding:25px 18px;${sideLayout ? '' : 'border-top:5px solid ' + accent + ';'}"><div style="width:76px;height:76px;margin:0 auto 18px;border-radius:50%;overflow:hidden;background:#fff;text-align:center;line-height:76px;color:${dark};">{{foto}}</div><h2 style="color:${accent};font-size:13px;text-transform:uppercase;letter-spacing:1px;">Contato</h2><p style="font-size:11px;line-height:1.7;">{{telefone}}<br>{{email}}<br>{{endereco}}<br>{{linkedin}}</p><h2 style="color:${accent};font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-top:24px;">Habilidades</h2><div style="font-size:11px;line-height:1.9;">{{habilidades}}</div></aside>`;
  const header = `<header style="border-bottom:2px solid ${accent};padding:24px 26px 18px;background:${layout === 'banner' ? dark : background};color:${layout === 'banner' ? '#fff' : dark};"><h1 style="font-size:27px;line-height:1.1;margin:0 0 6px;font-weight:750;">{{nome}}</h1><p style="font-size:12px;color:${layout === 'banner' ? accent : dark};margin:0;">Profissional | {{endereco}}</p></header>`;
  const objective = `<section style="padding:16px 22px;background:${layout === 'banner' ? accent : background};border-radius:10px;margin:16px 0;"><h2 style="font-size:13px;color:${dark};margin:0 0 6px;text-transform:uppercase;">Perfil profissional</h2><p style="font-size:12px;line-height:1.55;margin:0;color:#263449;">{{objetivo}}</p></section>`;
  const experience = `<section style="margin:16px 0;"><h2 style="font-size:14px;color:${dark};border-bottom:3px solid ${accent};padding:7px 10px;text-transform:uppercase;">Experiência profissional</h2><div style="font-size:12px;line-height:1.5;padding:8px 10px;">{{experiencias}}</div></section>`;
  const education = `<section style="margin:16px 0;"><h2 style="font-size:14px;color:${dark};border-bottom:3px solid ${accent};padding:7px 10px;text-transform:uppercase;">Formação acadêmica</h2><div style="font-size:12px;line-height:1.5;padding:8px 10px;">{{educacao}}</div></section>`;
  const main = `${header}<div style="padding:0 24px 20px;">${objective}${experience}${layout === 'columns' ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">${education}<section><h2 style="font-size:14px;color:${dark};border-bottom:3px solid ${accent};padding:7px 10px;text-transform:uppercase;">Competências</h2><div style="font-size:12px;padding:8px 10px;">{{habilidades}}</div></section></div>` : `${education}<section style="margin:16px 0;"><h2 style="font-size:14px;color:${dark};border-bottom:3px solid ${accent};padding:7px 10px;text-transform:uppercase;">Competências</h2><div style="font-size:12px;padding:8px 10px;">{{habilidades}}</div></section>`}</div>`;
  return `<main style="font-family:Arial,Helvetica,sans-serif;color:#233047;background:${background};min-height:100%;${sideLayout ? 'display:grid;grid-template-columns:31% 69%;' : ''}">${sideLayout ? `${aside}<div>${main}</div>` : `${main}${layout === 'columns' ? '' : aside}`}</main>`;
};

const INTERMEDIATE_STARTER_TEMPLATES: TemplateModel[] = INTERMEDIATE_LAYOUTS.map((layout) => ({
  ...layout,
  category: 'intermediate',
  previewUrl: makePreviewUrl(layout),
  generatedHtml: makeIntermediateHtml(layout),
  isActive: true,
  createdAt: new Date('2026-02-01T00:00:00.000Z'),
  updatedAt: new Date('2026-02-01T00:00:00.000Z'),
}));

const STARTER_TEMPLATES = [...BASIC_STARTER_TEMPLATES, ...INTERMEDIATE_STARTER_TEMPLATES];

const mergeStarterTemplates = (templates: TemplateModel[]) => {
  const byId = new Map(templates.map((template) => [template.id, template]));
  for (const starter of STARTER_TEMPLATES) if (!byId.has(starter.id)) byId.set(starter.id, starter);
  return [...byId.values()];
};

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: STARTER_TEMPLATES,

      loadFromCloud: async (persistStarterTemplates = false) => {
        const list = await fetchTemplates();
        const templates = mergeStarterTemplates(list ?? get().templates);
        set({ templates });
        if (persistStarterTemplates && list) {
          const existingIds = new Set(list.map((template) => template.id));
          const missing = STARTER_TEMPLATES.filter((template) => !existingIds.has(template.id));
          if (missing.length) {
            const rows = missing.map((template) => ({ id: template.id, ...templateToRow(template), created_at: template.createdAt.toISOString(), updated_at: template.updatedAt.toISOString() }));
            const { error } = await supabase.from('templates').upsert(rows as never, { onConflict: 'id' });
            if (error) console.error('Não foi possível cadastrar os modelos iniciais:', error);
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
