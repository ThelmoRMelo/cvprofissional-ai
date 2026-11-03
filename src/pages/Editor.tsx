import { useEffect } from 'react';
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

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { resumes, currentResume, setCurrentResume, updateResume, updatePaymentStatus } = useResumeStore();

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
    if (id) {
      const resume = resumes.find((r) => r.id === id);
      if (resume) {
        setCurrentResume(resume);
      } else {
        navigate('/');
      }
    }
  }, [id, resumes, setCurrentResume, navigate]);

  if (!currentResume) {
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

  const handleUploadReceipt = (url: string) => {
    updatePaymentStatus(currentResume.id, 'receipt_sent', url);
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
