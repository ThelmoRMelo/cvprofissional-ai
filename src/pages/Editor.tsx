import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, Lock, FileText } from 'lucide-react';
import { useResumeStore } from '@/store/resumeStore';
import { ResumeForm } from '@/components/editor/ResumeForm';
import { ResumePreview } from '@/components/editor/ResumePreview';
import { TemplateSelector } from '@/components/editor/TemplateSelector';
import { PaymentSection } from '@/components/editor/PaymentSection';
import { PLANS, ResumeTemplate, type Resume } from '@/types/resume';
import { cn } from '@/lib/utils';
import { WhatsAppFloatingButton } from '@/components/public/WhatsAppFloatingButton';
import { fetchResumeFromCloud, upsertResumeToCloud } from '@/lib/resumeCloud';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { resumes, currentResume, setCurrentResume, updateResume, updatePaymentStatus, applyRemoteUpdate } = useResumeStore();

  useEffect(() => {
    // Block printing
    document.body.classList.add('print-blocked');
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        alert('Impressão desabilitada. Por favor, realize o pagamento para baixar seu currículo.');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('print-blocked');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const localResume = useResumeStore.getState().resumes.find((resume) => resume.id === id);
    if (localResume) setCurrentResume(localResume);
    void fetchResumeFromCloud(id).then((cloudResume) => {
      if (!active) return;
      if (!cloudResume) {
        if (localResume) void upsertResumeToCloud(localResume).catch((error) => console.warn('Rascunho local ainda não sincronizado:', error));
        else navigate('/');
        return;
      }
      const latestLocalResume = useResumeStore.getState().resumes.find((resume) => resume.id === id) ?? localResume;
      const localIsNewer = latestLocalResume && new Date(latestLocalResume.updatedAt).getTime() > cloudResume.updatedAt.getTime();
      if (localIsNewer) {
        void upsertResumeToCloud(latestLocalResume).catch((error) => console.warn('Não foi possível sincronizar o rascunho local:', error));
        setCurrentResume(latestLocalResume);
      } else {
        applyRemoteUpdate(id, cloudResume);
        setCurrentResume(cloudResume);
      }
    }).catch((error) => {
      console.warn('Falha ao carregar currículo da nuvem; usando o rascunho local:', error);
      if (active && !localResume) navigate('/');
    });
    return () => { active = false; };
  }, [id, setCurrentResume, applyRemoteUpdate, navigate]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const refreshStatus = async () => {
      try {
        const remoteResume = await fetchResumeFromCloud(id);
        if (active && remoteResume) applyRemoteUpdate(id, { paymentStatus: remoteResume.paymentStatus, downloadEnabled: remoteResume.downloadEnabled, receiptUrl: remoteResume.receiptUrl });
      } catch (error) {
        console.warn('Falha ao atualizar o status do currículo:', error);
      }
    };
    const channel = (supabase as any).channel(`resume-status-${id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'resumes', filter: `id=eq.${id}` }, (payload: { new: { payment_status?: Resume['paymentStatus']; download_enabled?: boolean; receipt_url?: string | null } }) => {
      const row = payload.new as { payment_status?: Resume['paymentStatus']; download_enabled?: boolean; receipt_url?: string | null };
      applyRemoteUpdate(id, { paymentStatus: row.payment_status, downloadEnabled: row.download_enabled, receiptUrl: row.receipt_url ?? undefined });
    }).subscribe();
    const interval = window.setInterval(() => { void refreshStatus(); }, 15000);
    return () => { active = false; window.clearInterval(interval); void supabase.removeChannel(channel); };
  }, [id, applyRemoteUpdate]);

  if (!currentResume || currentResume.id !== id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  const plan = PLANS[currentResume.plan];
  const canDownload = currentResume.paymentStatus === 'confirmed' && currentResume.downloadEnabled;

  const handleUpdate = (data: Partial<typeof currentResume>) => {
    updateResume(currentResume.id, data);
  };

  const handleTemplateChange = (template: ResumeTemplate) => {
    updateResume(currentResume.id, { template });
  };

  const handleUploadReceipt = async (url: string) => {
    updatePaymentStatus(currentResume.id, 'receipt_sent', url);
    const updatedResume = useResumeStore.getState().resumes.find((resume) => resume.id === currentResume.id);
    if (updatedResume) await upsertResumeToCloud(updatedResume);
    toast.success('Comprovante enviado com sucesso.');
  };

  const handleDownload = () => {
    if (!canDownload) return;
    // In production, this would generate and download a PDF
    alert('Download do PDF iniciado!');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {currentResume.personalData.fullName || 'Novo Currículo'}
                </p>
                <p className="text-xs text-muted-foreground">Plano {plan.name}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={!canDownload}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all',
              canDownload
                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                : 'bg-secondary text-muted-foreground cursor-not-allowed'
            )}
          >
            {canDownload ? (
              <Download className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {canDownload ? 'Baixar PDF' : 'Download bloqueado'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6">
              <ResumeForm resume={currentResume} onUpdate={handleUpdate} />
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <TemplateSelector
                selected={currentResume.template}
                onSelect={handleTemplateChange}
              />
            </div>

            <PaymentSection
              resume={currentResume}
              onUploadReceipt={handleUploadReceipt}
            />
          </div>

          {/* Right Column - Preview */}
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-medium text-foreground mb-4">Pré-visualização</h3>
              <div className="bg-secondary/50 rounded-xl p-4 flex items-center justify-center overflow-hidden">
                <ResumePreview resume={currentResume} template={currentResume.template} />
              </div>
              
              {!canDownload && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
                  <Lock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Download disponível após liberação do pagamento
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Envie seu comprovante e aguarde a confirmação para baixar o PDF.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <WhatsAppFloatingButton />
    </div>
  );
}
