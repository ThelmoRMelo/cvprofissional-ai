import { useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, Lock, FileText } from 'lucide-react';
import { useResumeStore } from '@/store/resumeStore';
import { ResumeForm } from '@/components/editor/ResumeForm';
import { ResumePreview } from '@/components/editor/ResumePreview';
import { TemplateSelector } from '@/components/editor/TemplateSelector';
import { PaymentSection } from '@/components/editor/PaymentSection';
import { PLANS, ResumeTemplate } from '@/types/resume';
import { cn } from '@/lib/utils';
import { WhatsAppFloatingButton } from '@/components/public/WhatsAppFloatingButton';
import { fetchResumeStatusRpc } from '@/lib/resumeCloud';

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentResume, setCurrentResume, updateResume, syncResumeNow, applyRemoteUpdate } = useResumeStore();
  const canDownloadRef = useRef(false);
  const printActionRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    // Block printing
    document.body.classList.add('print-blocked');
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (canDownloadRef.current) printActionRef.current();
        else alert('Impressão desabilitada. Por favor, realize o pagamento para baixar seu currículo.');
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
    const localResume = useResumeStore.getState().resumes.find((resume) => resume.id === id);
    if (!localResume) { navigate('/'); return; }
    setCurrentResume(localResume);
  }, [id, setCurrentResume, navigate]);

  useEffect(() => {
    const accessToken = currentResume?.id === id ? currentResume.accessToken : undefined;
    if (!id) return;
    let active = true;
    const refreshStatus = async () => {
      try {
        const token = accessToken || await syncResumeNow(id);
        if (!token) return;
        const status = await fetchResumeStatusRpc(token);
        if (active && status) applyRemoteUpdate(id, { paymentStatus: status.paymentStatus, downloadEnabled: status.downloadReleased });
      } catch (error) {
        console.warn('Falha ao atualizar o status do currículo:', error);
      }
    };
    void refreshStatus();
    const interval = window.setInterval(() => { void refreshStatus(); }, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [id, currentResume?.id === id ? currentResume.accessToken : undefined, syncResumeNow, applyRemoteUpdate]);

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

  const handleUploadReceipt = async (path: string) => {
    applyRemoteUpdate(currentResume.id, { paymentStatus: 'receipt_sent', receiptPath: path });
  };

  const handleDownload = () => {
    if (!canDownload) return;
    const preview = document.querySelector('.resume-preview');
    if (!preview) return;

    const oldTitle = document.title;
    const wasPrintBlocked = document.body.classList.contains('print-blocked');
    const wasPrintOnly = document.body.classList.contains('print-resume-only');
    const safeName = (currentResume.personalData.fullName || 'Curriculo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\\/:*?"<>|]/g, '')
      .trim() || 'Curriculo';
    let fallbackTimer: number | undefined;
    let restored = false;
    const restorePrintState = () => {
      if (restored) return;
      restored = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      window.removeEventListener('afterprint', restorePrintState);
      document.body.classList.remove('print-resume-only');
      if (wasPrintBlocked) document.body.classList.add('print-blocked');
      if (wasPrintOnly) document.body.classList.add('print-resume-only');
      document.title = oldTitle;
    };

    document.body.classList.remove('print-blocked');
    document.body.classList.add('print-resume-only');
    document.title = `Curriculo - ${safeName}.pdf`;
    window.addEventListener('afterprint', restorePrintState);
    try {
      void document.body.offsetHeight;
      window.print();
      if (!restored) fallbackTimer = window.setTimeout(restorePrintState, 1500);
    } catch (error) {
      restorePrintState();
      console.error('Falha ao abrir a impressão do currículo:', error);
    }
  };

  canDownloadRef.current = canDownload;
  printActionRef.current = handleDownload;

  return (
    <div className="editor-page min-h-screen bg-background">
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
      <div className="editor-content container mx-auto px-4 py-8">
        <div className="editor-grid grid lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="editor-form-column space-y-6">
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
          <div className="editor-preview-column lg:sticky lg:top-24 lg:h-fit">
            <div className="editor-preview-card bg-card rounded-2xl border border-border p-6">
              <h3 className="preview-heading font-medium text-foreground mb-4">Pré-visualização</h3>
              <div className="resume-preview-screen-frame bg-secondary/50 rounded-xl p-4 flex items-center justify-center overflow-hidden">
                <div className="resume-preview-holder">
                  <ResumePreview resume={currentResume} template={currentResume.template} />
                </div>
              </div>
              
              {!canDownload && (
                <div className="download-warning mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
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
