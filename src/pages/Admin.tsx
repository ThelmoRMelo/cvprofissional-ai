import { useState, type FormEvent } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { type PaymentStatus, type Plan } from '@/types/resume';
import type { PlanPaymentConfig, SiteSettings } from '@/types/settings';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatsCards } from '@/components/admin/StatsCards';
import { ResumesTable } from '@/components/admin/ResumesTable';
import { TemplateManagement } from '@/components/admin/TemplateManagement';

const tabs = ['Visão Geral & Currículos', 'Modelos de Currículo', 'QR Codes & Pagamentos Pix', 'Conteúdo do Site (CMS)', 'Atendimento & WhatsApp'] as const;
type Tab = typeof tabs[number];
const plans: Plan[] = ['basic', 'intermediate', 'professional'];
const planNames: Record<Plan, string> = { basic: 'Básico', intermediate: 'Intermediário', professional: 'Profissional' };

export default function Admin() {
  const { resumes, updatePaymentStatus, toggleDownloadEnabled } = useResumeStore();
  const { settings, updateSettings, updatePlanConfig, setAdminPin } = useSettingsStore();
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('admin_authenticated') === 'true');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');

  const login = (event: FormEvent) => {
    event.preventDefault();
    if (pin === settings.adminPin) {
      sessionStorage.setItem('admin_authenticated', 'true');
      setAuthenticated(true);
      setPinError('');
    } else setPinError('PIN incorreto. Tente novamente.');
  };
  const logout = () => { sessionStorage.removeItem('admin_authenticated'); setAuthenticated(false); setPin(''); };
  const stats = {
    total: resumes.length,
    pending: resumes.filter((r) => r.paymentStatus === 'pending').length,
    receiptSent: resumes.filter((r) => r.paymentStatus === 'receipt_sent').length,
    confirmed: resumes.filter((r) => r.paymentStatus === 'confirmed').length,
    revenue: resumes.filter((r) => r.paymentStatus === 'confirmed').reduce((sum, r) => sum + settings.plans[r.plan].price, 0),
  };

  if (!authenticated) return <main className="flex min-h-screen items-center justify-center bg-secondary/40 px-4"><form onSubmit={login} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8 shadow-lg"><div className="text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">CV</div><h1 className="text-2xl font-bold text-foreground">Acesso administrativo</h1><p className="mt-2 text-sm text-muted-foreground">Digite seu PIN de 4 a 6 dígitos.</p></div><input autoFocus inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-2xl tracking-[0.5em]" placeholder="••••" aria-label="PIN administrativo" required />{pinError && <p role="alert" className="text-center text-sm text-destructive">{pinError}</p>}<button className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground">Entrar</button></form></main>;

  return <div className="min-h-screen bg-background"><AdminHeader title="Painel Administrativo" onLogout={logout} /><main className="container mx-auto space-y-6 px-4 py-8"><nav className="flex gap-2 overflow-x-auto pb-2" aria-label="Seções administrativas">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === item ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>{item}</button>)}</nav>
    {tab === tabs[0] && <div className="space-y-7"><section><h2 className="mb-4 text-xl font-semibold">Métricas</h2><StatsCards stats={stats} onCardClick={(value) => setFilter(value)} activeFilter={filter} /></section><section id="resumes-table"><h2 className="mb-4 text-xl font-semibold">Currículos e pagamentos</h2><ResumesTable resumes={resumes} filter={filter} onFilterChange={setFilter} onConfirmPayment={(id) => updatePaymentStatus(id, 'confirmed')} onToggleDownload={toggleDownloadEnabled} /></section></div>}
    {tab === tabs[1] && <TemplateManagement onBack={() => setTab(tabs[0])} />}
    {tab === tabs[2] && <section className="space-y-5"><div><h2 className="text-2xl font-bold">QR Codes & pagamentos Pix</h2><p className="text-sm text-muted-foreground">Cada plano possui seu próprio preço e dados Pix.</p></div><div className="grid gap-5 lg:grid-cols-3">{plans.map((plan) => <PlanPaymentForm key={plan} plan={plan} value={settings.plans[plan]} onChange={(value) => updatePlanConfig(plan, value)} />)}</div></section>}
    {tab === tabs[3] && <SettingsForm settings={settings} onChange={updateSettings} setAdminPin={setAdminPin} />}
    {tab === tabs[4] && <section className="max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6"><div><h2 className="text-2xl font-bold">Atendimento & WhatsApp</h2><p className="text-sm text-muted-foreground">O botão flutuante será exibido no site quando houver um número válido.</p></div><label className="block space-y-2 text-sm font-medium">Número com código do país<input value={settings.supportPhone} onChange={(e) => updateSettings({ supportPhone: e.target.value })} placeholder="5585999999999" className="w-full rounded-lg border border-input bg-background px-3 py-2" /></label><label className="block space-y-2 text-sm font-medium">Mensagem padrão<textarea value={settings.whatsappMessage} onChange={(e) => updateSettings({ whatsappMessage: e.target.value })} rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2" /></label></section>}
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

function SettingsForm({ settings, onChange, setAdminPin }: { settings: SiteSettings; onChange: (data: Partial<SiteSettings>) => void; setAdminPin: (pin: string) => void }) {
  const textField = (label: string, key: keyof SiteSettings, multiline = false) => <label key={key} className="block space-y-1 text-sm font-medium">{label}{multiline ? <textarea value={String(settings[key])} onChange={(e) => onChange({ [key]: e.target.value } as Partial<SiteSettings>)} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2" /> : <input value={String(settings[key])} onChange={(e) => onChange({ [key]: e.target.value } as Partial<SiteSettings>)} className="w-full rounded-lg border border-input bg-background px-3 py-2" />}</label>;
  return <section className="max-w-3xl space-y-5 rounded-2xl border border-border bg-card p-6"><div><h2 className="text-2xl font-bold">Conteúdo do site (CMS)</h2><p className="text-sm text-muted-foreground">As alterações são aplicadas imediatamente nesta aplicação.</p></div>{textField('Nome da empresa', 'companyName')}{textField('Selo do Hero', 'heroBadge')}{textField('Título do Hero', 'heroTitle')}{textField('Subtítulo do Hero', 'heroSubtitle', true)}{textField('Texto do botão do Hero', 'heroButtonText')}<label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={settings.announcementBannerEnabled} onChange={(e) => onChange({ announcementBannerEnabled: e.target.checked })} />Exibir faixa de anúncio</label>{textField('Texto do anúncio', 'announcementBannerText', true)}{textField('Texto do rodapé', 'footerText')}
    <div className="border-t border-border pt-5"><label className="block space-y-1 text-sm font-medium">Novo PIN administrativo (4 a 6 dígitos)<input type="password" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} onChange={(e) => { const value = e.target.value.replace(/\D/g, ''); if (value.length >= 4 && value.length <= 6) setAdminPin(value); }} placeholder="Defina um PIN para salvar" className="w-full rounded-lg border border-input bg-background px-3 py-2" /></label><p className="mt-1 text-xs text-muted-foreground">O PIN é armazenado nas configurações locais deste navegador.</p></div>
  </section>;
}
