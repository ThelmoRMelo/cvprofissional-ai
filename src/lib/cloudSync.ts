import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '@/types/settings';
import type { Plan, TemplateModel } from '@/types/resume';

type TemplateRow = {
  id: string; name: string; category: string; preview_url: string; reference_file_url: string | null;
  prompt: string | null; generated_html: string | null; is_active: boolean; created_at: string; updated_at: string;
};

export const rowToTemplate = (r: TemplateRow): TemplateModel => ({
  id: r.id, name: r.name, category: r.category as Plan, previewUrl: r.preview_url,
  referenceFileUrl: r.reference_file_url ?? undefined, prompt: r.prompt ?? undefined,
  generatedHtml: r.generated_html ?? undefined, isActive: r.is_active,
  createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
});

export const templateToRow = (t: Partial<TemplateModel>) => {
  const row: Record<string, unknown> = {};
  if (t.name !== undefined) row.name = t.name;
  if (t.category !== undefined) row.category = t.category;
  if (t.previewUrl !== undefined) row.preview_url = t.previewUrl;
  if (t.referenceFileUrl !== undefined) row.reference_file_url = t.referenceFileUrl;
  if (t.prompt !== undefined) row.prompt = t.prompt;
  if (t.generatedHtml !== undefined) row.generated_html = t.generatedHtml;
  if (t.isActive !== undefined) row.is_active = t.isActive;
  return row;
};

export async function fetchSettings(): Promise<SiteSettings | null> {
  const { data } = await supabase.from('site_settings').select('data').eq('id', 1).maybeSingle();
  if (!data) return null;
  const d = data.data as Partial<SiteSettings>;
  return { ...DEFAULT_SITE_SETTINGS, ...d, plans: { ...DEFAULT_SITE_SETTINGS.plans, ...(d.plans ?? {}) } };
}

export async function saveSettings(settings: SiteSettings) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { adminPin, ...rest } = settings;
  const { error } = await supabase.from('site_settings').upsert({ id: 1, data: rest as never, updated_at: new Date().toISOString() });
  if (error) console.error('Erro ao salvar configurações', error);
  return !error;
}

export async function fetchTemplates(): Promise<TemplateModel[] | null> {
  const { data, error } = await supabase.from('templates').select('*').order('created_at');
  if (error) return null;
  return (data as TemplateRow[]).map(rowToTemplate);
}
