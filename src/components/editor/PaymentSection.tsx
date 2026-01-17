import { useState, useRef } from 'react';
import { Upload, Check, Clock, AlertCircle, QrCode, Copy } from 'lucide-react';
import { Resume, PLANS } from '@/types/resume';
import { cn } from '@/lib/utils';

interface PaymentSectionProps {
  resume: Resume;
  onUploadReceipt: (url: string) => void;
}

const PIX_KEY = 'pix@curriculopro.com.br';

export function PaymentSection({ resume, onUploadReceipt }: PaymentSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const plan = PLANS[resume.plan];
  const isPending = resume.paymentStatus === 'pending';
  const isReceiptSent = resume.paymentStatus === 'receipt_sent';
  const isConfirmed = resume.paymentStatus === 'confirmed';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // Simulate upload - in production, this would upload to storage
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Create a fake URL for demonstration
    const fakeUrl = URL.createObjectURL(file);
    onUploadReceipt(fakeUrl);
    setUploading(false);
  };

  const copyPixKey = async () => {
    await navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
      <div className="text-center">
        <h3 className="font-display font-bold text-xl text-foreground mb-2">
          Pagamento
        </h3>
        <p className="text-muted-foreground text-sm">
          Plano {plan.name}
        </p>
        <div className="text-3xl font-display font-bold text-accent mt-2">
          R$ {plan.price.toFixed(2).replace('.', ',')}
        </div>
      </div>

      {/* Status Badge */}
      <div className={cn(
        'flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-medium mx-auto w-fit',
        isPending && 'bg-yellow-100 text-yellow-800',
        isReceiptSent && 'bg-blue-100 text-blue-800',
        isConfirmed && 'bg-green-100 text-green-800'
      )}>
        {isPending && <Clock className="w-4 h-4" />}
        {isReceiptSent && <AlertCircle className="w-4 h-4" />}
        {isConfirmed && <Check className="w-4 h-4" />}
        <span>
          {isPending && 'Aguardando pagamento'}
          {isReceiptSent && 'Comprovante enviado - Aguardando liberação'}
          {isConfirmed && 'Pagamento confirmado'}
        </span>
      </div>

      {/* Pix Info */}
      {isPending && (
        <>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-40 h-40 bg-secondary rounded-xl flex items-center justify-center">
              <QrCode className="w-20 h-20 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Escaneie o QR Code ou use a chave Pix abaixo
            </p>
          </div>

          <div className="bg-secondary/50 p-4 rounded-xl">
            <p className="text-xs text-muted-foreground mb-2">Chave Pix (E-mail)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-card px-3 py-2 rounded-lg text-sm font-mono text-foreground">
                {PIX_KEY}
              </code>
              <button
                onClick={copyPixKey}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  copied ? 'bg-green-100 text-green-600' : 'bg-card hover:bg-secondary text-muted-foreground'
                )}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.pdf"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                'w-full py-3 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2',
                'bg-accent text-accent-foreground hover:bg-accent/90',
                uploading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Enviando...' : 'Enviar comprovante de pagamento'}
            </button>
          </div>
        </>
      )}

      {isReceiptSent && (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-foreground font-medium mb-2">
            Comprovante recebido!
          </p>
          <p className="text-sm text-muted-foreground">
            Estamos analisando seu pagamento. O download será liberado em breve.
          </p>
        </div>
      )}

      {isConfirmed && resume.downloadEnabled && (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-foreground font-medium mb-2">
            Download liberado!
          </p>
          <p className="text-sm text-muted-foreground">
            Você já pode baixar seu currículo.
          </p>
        </div>
      )}
    </div>
  );
}
