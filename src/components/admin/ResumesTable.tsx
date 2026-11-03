import { Eye, Check, ExternalLink, FileText, MessageCircle } from 'lucide-react';
import { Resume, PLANS, PaymentStatus } from '@/types/resume';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';

interface ResumesTableProps {
  resumes: Resume[];
  filter: PaymentStatus | 'all';
  onFilterChange: (filter: PaymentStatus | 'all') => void;
  onConfirmPayment: (id: string) => void;
  onToggleDownload: (id: string) => void;
}

export function ResumesTable({ 
  resumes, 
  filter, 
  onFilterChange, 
  onConfirmPayment, 
  onToggleDownload 
}: ResumesTableProps) {
  const settings = useSettingsStore((state) => state.settings);
  const filteredResumes = resumes.filter((r) =>
    filter === 'all' ? true : r.paymentStatus === filter
  );

  const getStatusBadge = (status: PaymentStatus) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      receipt_sent: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
    };
    const labels = {
      pending: 'Pendente',
      receipt_sent: 'Comprovante Enviado',
      confirmed: 'Confirmado',
    };
    return (
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', styles[status])}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'receipt_sent', 'confirmed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => onFilterChange(status)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === status
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {status === 'all' && 'Todos'}
            {status === 'pending' && 'Pendentes'}
            {status === 'receipt_sent' && 'Comprovantes'}
            {status === 'confirmed' && 'Confirmados'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {filteredResumes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum currículo encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-foreground">Cliente</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-foreground">Plano</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-foreground">Modelo</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-foreground">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-foreground">Comprovante</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-foreground">Liberar Download</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredResumes.map((resume) => (
                  <tr key={resume.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">
                        {resume.clientName || resume.personalData.fullName || 'Sem nome'}
                      </p>
                      <p className="text-sm text-muted-foreground">{resume.personalData.email || 'Sem email'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        resume.plan === 'basic' && 'bg-gray-100 text-gray-700',
                        resume.plan === 'intermediate' && 'bg-blue-100 text-blue-700',
                        resume.plan === 'professional' && 'bg-accent/10 text-accent'
                      )}>
                        {PLANS[resume.plan].name} - R$ {settings.plans[resume.plan].price.toFixed(2).replace('.', ',')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground capitalize">
                      {resume.template}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(resume.paymentStatus)}
                    </td>
                    <td className="px-6 py-4">
                      {resume.receiptUrl ? (
                        <a
                          href={resume.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:underline text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Switch
                        checked={resume.downloadEnabled}
                        onCheckedChange={() => onToggleDownload(resume.id)}
                        disabled={resume.paymentStatus !== 'confirmed'}
                      />
                    </td>
                    <td className="px-6 py-4">
                      {resume.paymentStatus === 'receipt_sent' && (
                        <button
                          onClick={() => onConfirmPayment(resume.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          Confirmar
                        </button>
                      )}
                      {resume.personalData.phone && <a href={`https://wa.me/${resume.personalData.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${resume.clientName || resume.personalData.fullName || ''}, tudo bem?`)}`} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600"><MessageCircle className="h-4 w-4" />Chamar no WhatsApp</a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
