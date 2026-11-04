import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useResumeStore } from '@/store/resumeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { type PaymentStatus, type Plan } from '@/types/resume';
import type { PlanPaymentConfig, SiteSettings } from '@/types/settings';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatsCards } from '@/components/admin/StatsCards';
import { ResumesTable } from '@/components/admin/ResumesTable';
import { TemplateManagement } from '@/components/admin/TemplateManagement';
import { fetchResumesForAdmin, updateResumeByAdmin } from '@/lib/resumeCloud';
import { toast } from 'sonner';
import { Wifi, WifiOff } from 'lucide-react';

const tabs = ['Visão Geral & Currículos', 'Modelos de Currículo', 'QR Codes & Pagamentos Pix', 'Conteúdo do Site (CMS)', 'Atendimento & WhatsApp'] as const;
type Tab = typeof tabs[number];
const plans: Plan[] = ['basic', 'intermediate', 'professional'];
const planNames: Record<Plan, string> = { basic: 'Básico', intermediate: 'Intermediário', professional: 'Profissional' };

export default function Admin() {
  const { resumes, replaceResumes, applyRemoteUpdate } = useResumeStore();
  const { settings, updateSettings, updatePlanConfig, setAdminPin } = useSettingsStore();
  const { session, isAdmin, loading, adminExists } = useAdminAuth();
  const isOnline = useOnlineStatus();
  const wasOffline = useRef(!isOnline);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');
  const isAuthenticatedAdmin = Boolean(session && isAdmin);

  useEffect(() => {
    if (!isAuthenticatedAdmin) return;
    let active = true;
    let hasLoaded = false;
    const loadResumes = async (reportError = false) => {
      try {
        const remoteResumes = await fetchResumesForAdmin();
        if (active) {
          replaceResumes(remoteResumes);
          hasLoaded = true;
        }
      } catch (error) {
        console.error('Falha ao carregar currículos da nuvem:', error);
        if (active && reportError && !hasLoaded) toast.error('Não foi possível acessar a nuvem. Exibindo os dados salvos neste dispositivo.');
      }
    };
    void loadResumes(true);
    const channel = supabase.channel('admin-resumes').on('postgres_changes', { event: '*', schema: 'public', table: 'resumes' }, () => { void loadResumes(); }).subscribe();
    const interval = window.setInterval(() => { void loadResumes(); }, 15000);
    return () => { active = false; window.clearInterval(interval); void supabase.removeChannel(channel); };
  }, [isAuthenticatedAdmin, replaceResumes]);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }
    if (!isAuthenticatedAdmin || !wasOffline.current) return;
    wasOffline.current = false;
    void fetchResumesForAdmin()
      .then((remoteResumes) => {
        replaceResumes(remoteResumes);
        toast.success('Conexão restabelecida. Dados sincronizados com a nuvem.');
      })
      .catch((error) => console.error('Erro na sincronização:', error));
    void useSettingsStore.getState().loadFromCloud()
      .catch((error) => console.error('Erro ao sincronizar configurações:', error));
  }, [isOnline, isAuthenticatedAdmin, replaceResumes]);

  const confirmPayment = async (id: string) => {
    if (!isOnline) {
      toast.warning('Ação indisponível enquanto estiver offline.');
      return;
    }
    try {
      await updateResumeByAdmin(id, { paymentStatus: 'confirmed' });
      applyRemoteUpdate(id, { paymentStatus: 'confirmed' });
      toast.success('Pagamento confirmado.');
    } catch (error) {
      console.error('Falha ao confirmar pagamento na nuvem:', error);
      toast.error('Não foi possível confirmar o pagamento.');
    }
  };
  const toggleDownload = async (id: string) => {
    if (!isOnline) {
      toast.warning('Ação indisponível enquanto estiver offline.');
      return;
    }
    const resume = useResumeStore.getState().resumes.find((item) => item.id === id);
    if (!resume || resume.paymentStatus !== 'confirmed') return;
    const enabled = !resume.downloadEnabled;
    try {
      await updateResumeByAdmin(id, { downloadReleased: enabled });
      applyRemoteUpdate(id, { downloadEnabled: enabled });
      toast.success(enabled ? 'Download liberado.' : 'Download bloqueado.');
    } catch (error) {
      console.error('Falha ao atualizar liberação de download na nuvem:', error);
      toast.error('Não foi possível atualizar a liberação do download.');
    }
  };

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setAuthError('');
    if (!adminExists) {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      setAuthError(error ? error.message : 'Conta criada! Confirme o e-mail recebido e depois entre aqui.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError('E-mail ou senha incorretos.');
    }
    setBusy(false);
  };
  const logout = () => { void supabase.auth.signOut(); };
  const stats = {
    total: resumes.length,
    pending: resumes.filter((r) => r.paymentStatus === 'pending').length,
    receiptSent: resumes.filter((r) => r.paymentStatus === 'receipt_sent').length,
    confirmed: resumes.filter((r) => r.paymentStatus === 'confirmed').length,
    revenue: resumes.filter((r) => r.paymentStatus === 'confirmed').reduce((sum, r) => sum + settings.plans[r.plan].price, 0),
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</main>;

  if (session && !isAdmin) return <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center"><h1 className="text-2xl font-bold">Acesso negado</h1><p className="text-muted-foreground">Esta conta não tem permissão de administrador.</p><button onClick={logout} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">Sair</button></main>;

  if (!session) return <main className="flex min-h-screen items-center justify-center bg-secondary/40 px-4"><form onSubmit={login} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-8 shadow-lg"><div className="text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">CV</div><h1 className="text-2xl font-bold text-foreground">{adminExists ? 'Acesso administrativo' : 'Criar conta do administrador'}</h1><p className="mt-2 text-sm text-muted-foreground">{adminExists ? 'Entre com seu e-mail e senha.' : 'A primeira conta criada será a única com acesso ao painel.'}</p></div><input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" aria-label="E-mail" required className="w-full rounded-lg border border-input bg-background px-4 py-3" /><input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha (mín. 8 caracteres)" aria-label="Senha" required className="w-full rounded-lg border border-input bg-background px-4 py-3" />{authError && <p role="alert" className="text-center text-sm text-muted-foreground">{authError}</p>}<button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">{adminExists ? 'Entrar' : 'Criar conta'}</button></form></main>;

  const offlineSettingsNotice = !isOnline && <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">Você está offline. As alterações serão salvas localmente e sincronizadas quando a conexão retornar.</p>;
  return <div className="min-h-screen bg-background"><AdminHeader title="Painel Administrativo" onLogout={logout} /><main className="container mx-auto space-y-6 px-4 py-8">{!isOnline && <div role="status" className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-800 shadow-sm dark:text-amber-200"><WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" /><span>Você está offline. Exibindo os últimos dados salvos. Ações de confirmação e alteração estão desativadas até a internet voltar.</span></div>}<nav className="flex gap-2 overflow-x-auto pb-2" aria-label="Seções administrativas">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === item ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>{item}</button>)}</nav>
    {tab === tabs[0] && <div className="space-y-7"><section><h2 className="mb-4 text-xl font-semibold">Métricas</h2><StatsCards stats={stats} onCardClick={(value) => setFilter(value)} activeFilter={filter} /></section><section id="resumes-table"><h2 className="mb-4 text-xl font-semibold">Currículos e pagamentos</h2><ResumesTable resumes={resumes} filter={filter} onFilterChange={setFilter} onConfirmPayment={confirmPayment} onToggleDownload={toggleDownload} isOnline={isOnline} /></section></div>}
    {tab === tabs[1] && <TemplateManagement onBack={() => setTab(tabs[0])} />}
    {tab === tabs[2] && <section className="space-y-5">{offlineSettingsNotice}<div><div className="flex items-center gap-2"><h2 className="text-2xl font-bold">QR Codes & pagamentos Pix</h2>{isOnline && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Wifi className="h-3.5 w-3.5 text-green-600" />Conectado</span>}</div><p className="text-sm text-muted-foreground">Cada plano possui seu próprio preço e dados Pix.</p></div><fieldset disabled={!isOnline} className="grid gap-5 lg:grid-cols-3 disabled:opacity-60">{plans.map((plan) => <PlanPaymentForm key={plan} plan={plan} value={settings.plans[plan]} onChange={(value) => updatePlanConfig(plan, value)} />)}</fieldset></section>}
    {tab === tabs[3] && <div className="space-y-5">{offlineSettingsNotice}<SettingsForm settings={settings} onChange={updateSettings} setAdminPin={setAdminPin} isOnline={isOnline} /></div>}
    {tab === tabs[4] && <section className="max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6">{offlineSettingsNotice}<fieldset disabled={!isOnline} className="space-y-5 disabled:opacity-60"><div><h2 className="text-2xl font-bold">Atendimento & WhatsApp</h2><p className="text-sm text-muted-foreground">O botão flutuante será exibido no site quando houver um número válido.</p></div><label className="block space-y-2 text-sm font-medium">Número com código do país<input value={settings.supportPhone} onChange={(e) => updateSettings({ supportPhone: e.target.value })} placeholder="5585999999999" className="w-full rounded-lg border border-input bg-background px-3 py-2" /></label><label className="block space-y-2 text-sm font-medium">Mensagem padrão<textarea value={settings.whatsappMessage} onChange={(e) => updateSettings({ whatsappMessage: e.target.value })} rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2" /></label></fieldset></section>}
  </main></div>;
}

function PlanPaymentForm({ plan, value, onChange }: { plan: Plan; value: PlanPaymentConfig; onChange: (config: Partial<PlanPaymentConfig>) => void }) {
  const uploadQr = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Selecione um arquivo de imagem.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('A imagem deve ter até 2 MB para ser salva no navegador.'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange({ qrCodeImageUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };
  return <article className="space-y-4 rounded-2xl border border-border bg-card p-5"><h3 className="text-lg font-semibold">Plano {planNames[plan]}</h3><label className="block space-y-1 text-sm">Valor (R$)<input type="number" min="0" step="0.01" value={value.price} onChange={(e) => onChange({ price: Number(e.target.value) })} className="w-full rounded-lg border border-input bg-background px-3 py-2" /></label><label className="block space-y-1 text-sm">Chave Pix<input value={value.pixKey} onChange={(e) => onChange({ pixKey: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2" /></label><label className="block space-y-1 text-sm">Tipo de chave<select value={value.pixKeyType} onChange={(e) => onChange({ pixKeyType: e.target.value as PlanPaymentConfig['pixKeyType'] })} className="w-full rounded-lg border border-input bg-background px-3 py-2">{['cpf', 'cnpj', 'telefone', 'email', 'aleatoria'].map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label className="block space-y-1 text-sm">Titular<input value={value.accountHolder} onChange={(e) => onChange({ accountHolder: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2" /></label><div className="space-y-2 text-sm"><span>Imagem do QR Code (até 2 MB)</span><input type="file" accept="image/*" onChange={(e) => uploadQr(e.target.files?.[0])} className="block w-full text-xs" />{value.qrCodeImageUrl && <div className="flex items-center gap-3"><img src={value.qrCodeImageUrl} alt={`QR Code Pix ${planNames[plan]}`} className="h-24 w-24 rounded-lg border object-contain" /><button onClick={() => onChange({ qrCodeImageUrl: '' })} className="text-sm text-destructive underline">Remover QR Code</button></div>}</div></article>;
}

function SettingsForm({ settings, onChange, setAdminPin, isOnline }: { settings: SiteSettings; onChange: (data: Partial<SiteSettings>) => void; setAdminPin: (pin: string) => void; isOnline: boolean }) {
  const textField = (label: string, key: keyof SiteSettings, multiline = false) => <label key={key} className="block space-y-1 text-sm font-medium">{label}{multiline ? <textarea value={String(settings[key])} onChange={(e) => onChange({ [key]: e.target.value } as Partial<SiteSettings>)} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2" /> : <input value={String(settings[key])} onChange={(e) => onChange({ [key]: e.target.value } as Partial<SiteSettings>)} className="w-full rounded-lg border border-input bg-background px-3 py-2" />}</label>;
  return <section className="max-w-3xl space-y-5 rounded-2xl border border-border bg-card p-6"><fieldset disabled={!isOnline} className="space-y-5 disabled:opacity-60"><div><h2 className="text-2xl font-bold">Conteúdo do site (CMS)</h2><p className="text-sm text-muted-foreground">As alterações são aplicadas imediatamente nesta aplicação.</p></div>{textField('Nome da empresa', 'companyName')}{textField('Selo do Hero', 'heroBadge')}{textField('Título do Hero', 'heroTitle')}{textField('Subtítulo do Hero', 'heroSubtitle', true)}{textField('Texto do botão do Hero', 'heroButtonText')}<label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={settings.announcementBannerEnabled} onChange={(e) => onChange({ announcementBannerEnabled: e.target.checked })} />Exibir faixa de anúncio</label>{textField('Texto do anúncio', 'announcementBannerText', true)}{textField('Texto do rodapé', 'footerText')}
    <div className="border-t border-border pt-5"><label className="block space-y-1 text-sm font-medium">Novo PIN administrativo (4 a 6 dígitos)<input type="password" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} onChange={(e) => { const value = e.target.value.replace(/\D/g, ''); if (value.length >= 4 && value.length <= 6) setAdminPin(value); }} placeholder="Defina um PIN para salvar" className="w-full rounded-lg border border-input bg-background px-3 py-2" /></label><p className="mt-1 text-xs text-muted-foreground">O PIN é armazenado nas configurações locais deste navegador.</p></div>
  </fieldset></section>;
}
