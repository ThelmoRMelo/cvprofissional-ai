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
  layout: 'navy-sidebar' | 'amber-feature' | 'sky-sidebar' | 'green-columns' | 'graphite-header' | 'wine-timeline' | 'violet-panel' | 'teal-minimal' | 'coral-highlights' | 'marine-classic';
  prompt: string;
};

const INTERMEDIATE_LAYOUTS: IntermediateLayout[] = [
  { id: 'c1f0a002-0000-4000-8000-000000000001', name: 'Intermediário Azul Lateral Elegante', accent: '#2874d0', dark: '#1d4c9a', background: '#ffffff', layout: 'navy-sidebar', prompt: 'Foto circular grande e coluna azul-marinho à esquerda com nome, contato e habilidades em barras; objetivo, formação e experiência à direita com cabeçalhos azuis arredondados. Inspirado no terceiro modelo selecionado pelo cliente.' },
];

const REMOVED_INTERMEDIATE_TEMPLATE_IDS = [
  'c1f0a002-0000-4000-8000-000000000002',
  'c1f0a002-0000-4000-8000-000000000003',
  'c1f0a002-0000-4000-8000-000000000004',
  'c1f0a002-0000-4000-8000-000000000005',
  'c1f0a002-0000-4000-8000-000000000006',
  'c1f0a002-0000-4000-8000-000000000007',
  'c1f0a002-0000-4000-8000-000000000008',
  'c1f0a002-0000-4000-8000-000000000009',
  'c1f0a002-0000-4000-8000-000000000010',
];

const makePreviewUrl = ({ accent, dark, background, layout }: IntermediateLayout) => {
  const leftSidebar = ['navy-sidebar', 'violet-panel'].includes(layout);
  const rightSidebar = layout === 'sky-sidebar';
  const amber = layout === 'amber-feature';
  const photoX = rightSidebar ? 360 : leftSidebar ? 66 : 360;
  const photoY = amber ? 69 : 64;
  const mainX = leftSidebar ? 153 : 30;
  const mainWidth = leftSidebar || rightSidebar ? 230 : 360;
  const text = (x: number, y: number, value: string, size: number, color: string, weight = 400) => `<text x="${x}" y="${y}" fill="${color}" font-family="Arial,sans-serif" font-size="${size}" font-weight="${weight}">${value}</text>`;
  const row = (x: number, y: number, width: number, color = '#78869a') => `<rect x="${x}" y="${y}" width="${width}" height="5" rx="2.5" fill="${color}" opacity=".62"/>`;
  const section = (y: number, title: string) => `${text(mainX, y, title, 12, dark, 700)}<path d="M${mainX} ${y + 7}h${mainWidth}" stroke="${accent}" stroke-width="3"/>`;
  if (layout === 'navy-sidebar') {
    const bar = (y: number, label: string, value: number) => `${text(16, y, label, 8, '#fff', 700)}<rect x="16" y="${y + 7}" width="148" height="11" rx="6" fill="#fff"/><rect x="16" y="${y + 7}" width="${148 * value}" height="11" rx="6" fill="#c5bdc2"/><text x="137" y="${y + 16}" fill="${dark}" font-family="Arial,sans-serif" font-size="7" font-weight="700">${Math.round(value * 100)}%</text>`;
    const pill = (y: number, label: string) => `<rect x="202" y="${y - 18}" width="226" height="34" rx="17" fill="${dark}"/>${text(220, y + 5, label, 13, '#fff', 700)}`;
    const line = (y: number, width: number, x = 220) => `<rect x="${x}" y="${y}" width="${width}" height="5" rx="2.5" fill="#8290a2" opacity=".62"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="594" viewBox="0 0 420 594"><rect width="420" height="594" fill="#fff"/><path d="M0 0h180v594H0z" fill="${dark}"/><circle cx="90" cy="82" r="64" fill="#fff"/><circle cx="90" cy="82" r="57" fill="#dbe8f6"/><rect x="0" y="163" width="180" height="34" rx="17" fill="#fff"/>${text(17, 185, 'SEU NOME COMPLETO', 13, dark, 700)}${text(18, 218, 'PROFISSÃO / ÁREA', 9, '#fff', 700)}<rect x="0" y="244" width="143" height="27" rx="14" fill="#fff"/>${text(17, 263, 'CONTATO', 11, dark, 700)}${text(17, 292, '⌖  CIDADE - UF', 8, '#fff')}${text(17, 314, '☎  (84) 99999-9999', 8, '#fff')}${text(17, 336, '✉  seu.email@exemplo.com', 7, '#fff')}<rect x="0" y="357" width="143" height="27" rx="14" fill="#fff"/>${text(17, 376, 'HABILIDADES', 11, dark, 700)}${bar(399, 'Comunicação', .72)}${bar(435, 'Organização', .9)}${bar(471, 'Trabalho em equipe', .82)}${bar(507, 'Liderança', .65)}${pill(53, 'SOBRE MIM')}${line(79, 190)}${line(91, 174)}${line(103, 180)}${line(115, 158)}${pill(160, 'FORMAÇÃO')}${text(220, 191, 'Nome do curso', 8, dark, 700)}${line(201, 155)}<path d="M214 213v50" stroke="${accent}" stroke-width="2"/><circle cx="214" cy="215" r="4" fill="${accent}"/><circle cx="214" cy="260" r="4" fill="${accent}"/>${pill(302, 'EXPERIÊNCIA')}${text(220, 335, 'Nome da empresa  |  Cargo atual', 8, dark, 700)}${line(344, 180)}${line(356, 190)}${line(368, 164)}${line(380, 180)}${text(220, 411, 'Nome da empresa  |  Cargo anterior', 8, dark, 700)}${line(420, 185)}${line(432, 174)}${line(444, 189)}<path d="M214 344v105" stroke="${accent}" stroke-width="2"/><circle cx="214" cy="345" r="4" fill="${accent}"/><circle cx="214" cy="449" r="4" fill="${accent}"/></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }
  const sidebar = leftSidebar || rightSidebar;
  const sidebarX = rightSidebar ? 300 : 0;
  const sidebarWidth = 120;
  const sidebarContent = `<circle cx="${sidebarX + sidebarWidth / 2}" cy="73" r="34" fill="#fff"/><circle cx="${sidebarX + sidebarWidth / 2}" cy="73" r="29" fill="${accent}" opacity=".34"/>${text(sidebarX + 14, 129, 'CONTATO', 10, rightSidebar ? dark : '#fff', 700)}${row(sidebarX + 14, 143, 88, rightSidebar ? dark : '#fff')}${row(sidebarX + 14, 157, 78, rightSidebar ? dark : '#fff')}${row(sidebarX + 14, 171, 83, rightSidebar ? dark : '#fff')}${text(sidebarX + 14, 214, 'HABILIDADES', 9, rightSidebar ? dark : '#fff', 700)}${row(sidebarX + 14, 229, 90, accent)}${row(sidebarX + 14, 245, 75, accent)}${row(sidebarX + 14, 261, 84, accent)}${text(sidebarX + 14, 302, 'IDIOMAS', 9, rightSidebar ? dark : '#fff', 700)}${row(sidebarX + 14, 317, 88, rightSidebar ? dark : '#fff')}${row(sidebarX + 14, 333, 61, rightSidebar ? dark : '#fff')}`;
  const coloredHeader = ['amber-feature', 'green-columns', 'graphite-header'].includes(layout);
  const header = `${text(mainX, 58, 'Seu Nome', 23, coloredHeader ? '#fff' : dark, 700)}${text(mainX, 81, 'Completo', 23, coloredHeader ? '#fff' : dark, 700)}${text(mainX, 101, 'Profissão ou Área de Atuação', 10, accent, 700)}`;
  const objective = amber ? `<rect x="22" y="126" width="376" height="66" rx="12" fill="#ffd64f"/>${text(40, 149, 'OBJETIVO', 12, dark, 700)}${row(40, 161, 335, dark)}${row(40, 173, 290, dark)}` : `${section(139, 'OBJETIVO')}${row(mainX, 159, mainWidth * .95)}${row(mainX, 171, mainWidth * .84)}`;
  const sections = `${section(211, 'EXPERIÊNCIA PROFISSIONAL')}${text(mainX, 239, 'Nome da Empresa  |  Cargo Atual', 9, dark, 700)}${row(mainX, 251, mainWidth * .9)}${row(mainX, 263, mainWidth * .97)}${row(mainX, 275, mainWidth * .8)}${text(mainX, 302, 'Nome da Empresa  |  Cargo Anterior', 9, dark, 700)}${row(mainX, 314, mainWidth * .91)}${row(mainX, 326, mainWidth * .72)}${section(365, 'FORMAÇÃO ACADÊMICA')}${text(mainX, 393, 'Nome do Curso', 9, dark, 700)}${row(mainX, 405, mainWidth * .87)}${layout === 'green-columns' || layout === 'amber-feature' ? `${text(mainX, 454, 'HABILIDADES', 11, accent, 700)}${row(mainX, 468, mainWidth * .45, accent)}${text(mainX + mainWidth * .54, 454, 'IDIOMAS', 11, accent, 700)}${row(mainX + mainWidth * .54, 468, mainWidth * .4, accent)}` : `${section(449, 'HABILIDADES')}${row(mainX, 468, mainWidth * .95, accent)}${row(mainX, 480, mainWidth * .7, accent)}`}`;
  const geometry = `<rect width="420" height="594" rx="10" fill="${background}"/>${leftSidebar ? `<path d="M0 0h132v594H0z" fill="${dark}"/>` : ''}${rightSidebar ? `<path d="M300 0h120v594H300z" fill="#dcebfa"/>` : ''}${amber ? `<path d="M0 0h420v118H0z" fill="${dark}"/><path d="M0 0h175c-10 22-20 28-48 28H0z" fill="${accent}"/>` : ''}${layout === 'green-columns' ? `<path d="M0 0h420v100H0z" fill="${dark}"/>` : ''}${layout === 'graphite-header' ? `<path d="M0 0h420v118H0z" fill="${dark}"/><path d="M0 0h420v10H0z" fill="${accent}"/>` : ''}${layout === 'coral-highlights' ? `<path d="M0 0h9v594H0z" fill="${accent}"/>` : ''}${layout === 'wine-timeline' ? `<path d="M45 215v275" stroke="${accent}" stroke-width="3"/>` : ''}${layout === 'marine-classic' ? `<path d="M30 110h360" stroke="${dark}" stroke-width="2"/><path d="M30 115h360" stroke="${accent}" stroke-width="1"/>` : ''}${layout === 'teal-minimal' ? `<path d="M30 110h360" stroke="${accent}" stroke-width="3"/>` : ''}${layout === 'coral-highlights' ? `<rect x="25" y="123" width="370" height="70" rx="11" fill="#ffede7"/>` : ''}${sidebar ? sidebarContent : `<circle cx="${photoX}" cy="${photoY}" r="34" fill="#fff"/><circle cx="${photoX}" cy="${photoY}" r="29" fill="${accent}" opacity=".35"/>`}${header}${objective}${sections}${layout === 'coral-highlights' ? `<path d="M24 530h370" stroke="${accent}" stroke-width="7"/>` : ''}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="594" viewBox="0 0 420 594">${geometry}${sidebar ? sidebarContent : ''}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const makeIntermediateHtml = ({ accent, dark, background, layout }: IntermediateLayout) => {
  const photo = `<div style="width:80px;height:80px;flex:0 0 80px;border-radius:50%;overflow:hidden;background:#e8eef4;text-align:center;line-height:80px;">{{foto}}</div>`;
  const contact = `<div style="font-size:10px;line-height:1.75;overflow-wrap:anywhere;">{{telefone}}<br>{{email}}<br>{{endereco}}<br>{{linkedin}}</div>`;
  const skills = `<section style="margin-top:20px;"><h2 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;color:${accent};">Habilidades</h2><div style="font-size:10px;line-height:1.9;">{{habilidades}}</div></section>`;
  const aside = `<aside style="background:${dark};color:#fff;padding:24px 17px;">${photo}<h2 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:20px 0 8px;color:${accent};">Contato</h2>${contact}${skills}</aside>`;
  const section = (title: string, content: string) => `<section style="margin:16px 0 20px;"><h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.7px;color:${dark};padding:0 0 6px;margin:0 0 9px;border-bottom:2px solid ${accent};">${title}</h2><div style="font-size:11px;line-height:1.5;">${content}</div></section>`;
  const objective = `<section style="padding:13px 16px;margin:14px 0 19px;background:${layout === 'amber-feature' ? '#ffd753' : `${accent}18`};border-radius:${layout === 'amber-feature' ? '12px' : '4px'};"><h2 style="font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:${dark};margin:0 0 5px;">Objetivo profissional</h2><p style="font-size:11px;line-height:1.5;margin:0;">{{objetivo}}</p></section>`;
  const experience = section('Experiência profissional', '<div style="padding-left:12px;">{{experiencias}}</div>');
  const education = section('Formação acadêmica', '{{educacao}}');
  const competence = section('Competências', '{{habilidades}}');
  const standardHeader = (extra = '') => `<header style="padding:${extra ? '22px 24px 14px' : '26px 28px 16px'};background:${extra && extra !== 'photo' ? extra : background};color:${extra && extra !== 'photo' ? '#fff' : dark};"><div style="display:flex;align-items:center;justify-content:space-between;gap:14px;">${extra === 'photo' ? `<div><h1 style="font-size:25px;line-height:1.08;margin:0 0 7px;font-weight:750;">{{nome}}</h1><div style="font-size:11px;color:${accent};">Profissional | {{endereco}}</div></div>${photo}</div>` : `${photo}<div style="flex:1;"><h1 style="font-size:25px;line-height:1.08;margin:0 0 7px;font-weight:750;">{{nome}}</h1><div style="font-size:11px;color:${accent};">Profissional | {{endereco}}</div></div></div>`}</header>`;
  const content = `${objective}${experience}${education}${competence}`;
  const cleanMain = `<div style="padding:2px 25px 20px;">${content}</div>`;
  switch (layout) {
    case 'navy-sidebar':
      return `<main style="display:grid;grid-template-columns:43% 57%;font-family:Arial,sans-serif;color:#203654;background:#fff;min-height:100%;"><aside style="background:${dark};color:#fff;padding:22px 17px;min-height:840px;"><div style="width:152px;height:152px;margin:0 auto 22px;border-radius:50%;overflow:hidden;background:#dbe8f6;border:5px solid #fff;text-align:center;line-height:142px;">{{foto}}</div><div style="margin:0 -17px 8px;background:#fff;color:${dark};padding:8px 4px;text-align:center;font-size:18px;font-weight:800;line-height:1.15;">{{nome}}</div><p style="text-align:center;color:#fff;font-size:12px;margin:0 0 25px;">{{profissao}}</p><h2 style="margin:0 -17px 12px;background:#fff;color:${dark};border-radius:0 18px 18px 0;padding:5px 17px;font-size:14px;">CONTATO</h2><div style="font-size:10px;line-height:1.8;overflow-wrap:anywhere;">⌖ &nbsp;{{endereco}}<br>☎ &nbsp;{{telefone}}<br>✉ &nbsp;{{email}}<br>in &nbsp;{{linkedin}}</div><h2 style="margin:20px -17px 12px;background:#fff;color:${dark};border-radius:0 18px 18px 0;padding:5px 17px;font-size:14px;">HABILIDADES</h2><div style="font-size:10px;line-height:1.9;">{{habilidades_barras}}</div></aside><div style="padding:26px 17px 22px;background:#fff;"><section style="margin:0 0 26px;"><h2 style="margin:0 0 14px -17px;padding:8px 17px;border-radius:0 20px 20px 0;background:${dark};color:#fff;font-size:14px;">SOBRE MIM</h2><p style="font-size:11px;line-height:1.55;margin:0;">{{objetivo}}</p></section><section style="margin:0 0 26px;"><h2 style="margin:0 0 14px -17px;padding:8px 17px;border-radius:0 20px 20px 0;background:${dark};color:#fff;font-size:14px;">FORMAÇÃO</h2><div style="border-left:2px solid ${accent};padding-left:14px;font-size:11px;line-height:1.5;">{{educacao}}</div></section><section><h2 style="margin:0 0 14px -17px;padding:8px 17px;border-radius:0 20px 20px 0;background:${dark};color:#fff;font-size:14px;">EXPERIÊNCIA</h2><div style="border-left:2px solid ${accent};padding-left:14px;font-size:11px;line-height:1.5;">{{experiencias}}</div></section></div></main>`;
    case 'amber-feature':
      return `<main style="font-family:Arial,sans-serif;color:#17243c;background:#fff;min-height:100%;"><div style="position:relative;">${standardHeader('photo')}</div><div style="padding:0 20px;">${objective}${experience}${education}<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">${section('Habilidades', '{{habilidades}}')}${section('Idiomas', 'Português · Inglês · Espanhol')}</div></div></main>`;
    case 'sky-sidebar':
      return `<main style="display:grid;grid-template-columns:70% 30%;font-family:Arial,sans-serif;color:#203654;background:#fff;min-height:100%;"><div>${standardHeader()}<div style="padding:0 25px;">${objective}${experience}${education}${competence}</div></div><aside style="background:#dcebfa;padding:25px 15px;">${photo}<h2 style="font-size:12px;background:${dark};color:#fff;padding:6px 9px;border-radius:6px;margin:14px 0 8px;">CONTATO</h2>${contact}<h2 style="font-size:12px;background:${dark};color:#fff;padding:6px 9px;border-radius:6px;margin:18px 0 8px;">HABILIDADES</h2><div style="font-size:10px;line-height:1.9;">{{habilidades}}</div></aside></main>`;
    case 'green-columns':
      return `<main style="font-family:Arial,sans-serif;color:#253a39;background:#fff;min-height:100%;">${standardHeader(dark)}<div style="padding:8px 28px;">${objective}${experience}<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">${education}${competence}</div></div></main>`;
    case 'graphite-header':
      return `<main style="font-family:Arial,sans-serif;color:#263244;background:#f5f6f8;min-height:100%;border-top:10px solid ${accent};">${standardHeader(dark)}<div style="padding:4px 28px 20px;">${objective}${experience}${education}<div style="padding:8px 12px;background:#fff;border-left:4px solid ${accent};">${competence}</div></div></main>`;
    case 'wine-timeline':
      return `<main style="font-family:Georgia,serif;color:#332933;background:#fff;min-height:100%;border-left:9px solid ${accent};">${standardHeader()}<div style="padding:0 28px 20px;">${objective}<section style="border-left:2px solid ${accent};padding-left:14px;margin:20px 0;">${section('Trajetória profissional', '{{experiencias}}')}</section><div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">${education}${competence}</div></div></main>`;
    case 'violet-panel':
      return `<main style="display:grid;grid-template-columns:32% 68%;font-family:Arial,sans-serif;color:#302746;background:#fff;min-height:100%;"><aside style="padding:25px 17px;background:${dark};color:#fff;border-radius:0 0 32px 0;">${photo}<h2 style="font-size:12px;color:${accent};margin:20px 0 8px;">CONTATO</h2>${contact}${skills}<div style="margin-top:25px;padding:11px;border:1px solid ${accent};border-radius:12px;font-size:10px;">Criatividade com propósito</div></aside><div>${standardHeader()}<div style="padding:0 24px;">${objective}${experience}${education}</div></div></main>`;
    case 'teal-minimal':
      return `<main style="font-family:Arial,sans-serif;color:#253b43;background:#fff;min-height:100%;padding:0 25px;">${standardHeader()}<div style="height:4px;width:100%;background:${accent};margin:0 0 18px;"></div><div>${objective}${experience}<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">${education}${competence}</div></div></main>`;
    case 'coral-highlights':
      return `<main style="font-family:Arial,sans-serif;color:#35333a;background:#fff;min-height:100%;border-left:8px solid ${accent};">${standardHeader()}<div style="padding:0 27px 20px;"><div style="padding:15px;background:#fff0ea;border-radius:12px;">${objective}</div>${experience}<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">${education}<div style="background:#fff7f3;padding:12px;border-radius:12px;">${competence}</div></div></div></main>`;
    case 'marine-classic':
      return `<main style="font-family:Georgia,'Times New Roman',serif;color:#263449;background:#fff;min-height:100%;">${standardHeader()}<div style="height:5px;background:${dark};margin:0 28px 18px;"></div><div style="padding:0 28px 20px;">${objective}${experience}${education}<div style="border-top:1px solid ${accent};padding-top:3px;">${competence}</div></div></main>`;
  }
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
  const removedIds = new Set(REMOVED_INTERMEDIATE_TEMPLATE_IDS);
  const byId = new Map(templates.filter((template) => !removedIds.has(template.id)).map((template) => [template.id, template]));
  for (const starter of STARTER_TEMPLATES) if (!byId.has(starter.id)) byId.set(starter.id, starter);
  return [...byId.values()];
};

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: STARTER_TEMPLATES,

      loadFromCloud: async (persistStarterTemplates = false) => {
        if (persistStarterTemplates) {
          const { error } = await supabase.from('templates').delete().in('id', REMOVED_INTERMEDIATE_TEMPLATE_IDS);
          if (error) console.error('Não foi possível remover os modelos intermediários substituídos:', error);
        }
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
