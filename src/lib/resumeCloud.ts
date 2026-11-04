import type { Json } from '@/integrations/supabase/types';
import type { Resume, Plan, PaymentStatus, ResumeTemplate } from '@/types/resume';
import { supabase } from '@/integrations/supabase/client';

export interface DbResumeRow {
  id: string;
  access_token: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  plan: Plan;
  template_id?: string | null;
  data: Json;
  payment_status: string;
  payment_proof_path?: string | null;
  download_released: boolean;
  created_at: string;
  updated_at: string;
}

type ResumeData = {
  template?: ResumeTemplate;
  personalData?: Resume['personalData'];
  experiences?: Resume['experiences'];
  education?: Resume['education'];
  skills?: Resume['skills'];
};

const toUiPaymentStatus = (status: string): PaymentStatus =>
  status === 'awaiting_confirmation' ? 'receipt_sent' : status as PaymentStatus;

const toDbPaymentStatus = (status: PaymentStatus) =>
  status === 'receipt_sent' ? 'awaiting_confirmation' : status;

/** Save an anonymous user's resume through the token checked RPC. */
export async function saveResumeClientRpc(resume: Resume): Promise<string> {
  const payloadData: ResumeData = {
    template: resume.template,
    personalData: resume.personalData,
    experiences: resume.experiences,
    education: resume.education,
    skills: resume.skills,
  };
  const { data: token, error } = await (supabase.rpc as any)('save_resume', {
    _token: resume.accessToken ?? null,
    _client_name: resume.clientName || resume.personalData.fullName || '',
    _client_email: resume.personalData.email || '',
    _client_phone: resume.personalData.phone || '',
    _plan: resume.plan || 'basic',
    _template_id: null,
    _data: payloadData as Json,
  });
  if (error) throw error;
  if (typeof token !== 'string' || !token) throw new Error('A função save_resume não retornou um token válido.');
  return token;
}

/** Upload a private proof and link it to the resume with its access token. */
export async function uploadReceiptAndLink(file: File, accessToken: string): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${accessToken}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(filePath, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (uploadError) throw uploadError;
  const { error: rpcError } = await supabase.rpc('set_payment_proof', { _token: accessToken, _path: filePath });
  if (rpcError) throw rpcError;
  return filePath;
}

/** Read only the client-visible status through the access-token RPC. */
export async function fetchResumeStatusRpc(accessToken: string): Promise<{ paymentStatus: PaymentStatus; downloadReleased: boolean } | null> {
  const { data, error } = await supabase.rpc('get_resume_status', { _token: accessToken });
  if (error) throw error;
  if (!data?.length) return null;
  return {
    paymentStatus: toUiPaymentStatus(data[0].payment_status),
    downloadReleased: Boolean(data[0].download_released),
  };
}

/** Admin-only table query. RLS requires an authenticated admin session. */
export async function fetchResumesForAdmin(): Promise<Resume[]> {
  const { data, error } = await supabase.from('resumes').select('*').order('created_at', { ascending: false });
  if (error) throw error;

  return Promise.all(((data ?? []) as unknown as DbResumeRow[]).map(async (row) => {
    let receiptUrl: string | undefined;
    if (row.payment_proof_path) {
      const { data: signed } = await supabase.storage.from('payment-proofs').createSignedUrl(row.payment_proof_path, 3600);
      receiptUrl = signed?.signedUrl;
    }
    const dataObject = (row.data ?? {}) as ResumeData;
    const personalData = dataObject.personalData ?? { fullName: '', email: '', phone: '', address: '' };
    return {
      id: row.id,
      accessToken: row.access_token,
      clientName: row.client_name || personalData.fullName || '',
      plan: row.plan,
      template: dataObject.template ?? 'modern',
      paymentStatus: toUiPaymentStatus(row.payment_status),
      downloadEnabled: Boolean(row.download_released),
      receiptUrl,
      receiptPath: row.payment_proof_path ?? undefined,
      personalData: {
        ...personalData,
        email: personalData.email || row.client_email || '',
        phone: personalData.phone || row.client_phone || '',
      },
      experiences: dataObject.experiences ?? [],
      education: dataObject.education ?? [],
      skills: dataObject.skills ?? [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    } satisfies Resume;
  }));
}

/** Admin-only update. RLS verifies the signed-in admin role. */
export async function updateResumeByAdmin(
  id: string,
  changes: { paymentStatus?: PaymentStatus; downloadReleased?: boolean },
): Promise<void> {
  const updatePayload: { updated_at: string; payment_status?: string; download_released?: boolean } = {
    updated_at: new Date().toISOString(),
  };
  if (changes.paymentStatus !== undefined) updatePayload.payment_status = toDbPaymentStatus(changes.paymentStatus);
  if (changes.downloadReleased !== undefined) updatePayload.download_released = changes.downloadReleased;
  const { error } = await supabase.from('resumes').update(updatePayload).eq('id', id);
  if (error) throw error;
}
