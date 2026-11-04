import type { Resume, Plan, PaymentStatus, ResumeTemplate } from '@/types/resume';
import { supabase } from '@/integrations/supabase/client';

// The deployed resumes table is managed outside this repository, so keep its
// wire format here instead of claiming a generated schema that is not present.
const resumesTable = () => (supabase as any).from('resumes');

export interface ResumeRow {
  id: string;
  client_name?: string | null;
  plan: Plan;
  template: ResumeTemplate;
  payment_status: PaymentStatus;
  download_enabled: boolean;
  receipt_url?: string | null;
  personal_data: Resume['personalData'];
  experiences: Resume['experiences'];
  education: Resume['education'];
  skills: Resume['skills'];
  created_at: string;
  updated_at: string;
}

export async function upsertResumeToCloud(resume: Resume): Promise<void> {
  const row: ResumeRow = {
    id: resume.id,
    client_name: resume.clientName,
    plan: resume.plan,
    template: resume.template,
    payment_status: resume.paymentStatus,
    download_enabled: resume.downloadEnabled,
    receipt_url: resume.receiptUrl ?? null,
    personal_data: resume.personalData,
    experiences: resume.experiences,
    education: resume.education,
    skills: resume.skills,
    created_at: new Date(resume.createdAt).toISOString(),
    updated_at: new Date(resume.updatedAt).toISOString(),
  };
  const { error } = await resumesTable().upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function fetchResumeFromCloud(id: string): Promise<Resume | null> {
  const { data, error } = await resumesTable().select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToResume(data as ResumeRow) : null;
}

export async function fetchResumesFromCloud(): Promise<Resume[]> {
  const { data, error } = await resumesTable().select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ResumeRow[]).map(rowToResume);
}

export async function updateResumeCloud(id: string, changes: Partial<Pick<Resume, 'paymentStatus' | 'downloadEnabled'>>): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (changes.paymentStatus !== undefined) row.payment_status = changes.paymentStatus;
  if (changes.downloadEnabled !== undefined) row.download_enabled = changes.downloadEnabled;
  const { error } = await resumesTable().update(row).eq('id', id);
  if (error) throw error;
}

export function rowToResume(row: ResumeRow): Resume {
  return {
    id: row.id,
    clientName: row.client_name ?? row.personal_data?.fullName ?? '',
    plan: row.plan,
    template: row.template ?? 'modern',
    paymentStatus: row.payment_status ?? 'pending',
    downloadEnabled: Boolean(row.download_enabled),
    receiptUrl: row.receipt_url ?? undefined,
    personalData: row.personal_data ?? { fullName: '', email: '', phone: '', address: '' },
    experiences: row.experiences ?? [],
    education: row.education ?? [],
    skills: row.skills ?? [],
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

export async function uploadReceipt(file: File, resumeId: string): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${resumeId}/${Date.now()}-${safeName}`;
  const { data, error } = await supabase.storage.from('receipts').upload(filePath, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  const { data: publicUrl } = supabase.storage.from('receipts').getPublicUrl(data.path);
  return publicUrl.publicUrl;
}
