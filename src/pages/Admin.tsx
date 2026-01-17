import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Check, X, FileText, ExternalLink, Users, DollarSign } from 'lucide-react';
import { useResumeStore } from '@/store/resumeStore';
import { PLANS, PaymentStatus } from '@/types/resume';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

export default function Admin() {
  const { resumes, updatePaymentStatus, toggleDownloadEnabled } = useResumeStore();
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');

  const filteredResumes = resumes.filter((r) =>
    filter === 'all' ? true : r.paymentStatus === filter
  );

  const stats = {
    total: resumes.length,
    pending: resumes.filter((r) => r.paymentStatus === 'pending').length,
    receiptSent: resumes.filter((r) => r.paymentStatus === 'receipt_sent').length,
    confirmed: resumes.filter((r) => r.paymentStatus === 'confirmed').length,
    revenue: resumes
      .filter((r) => r.paymentStatus === 'confirmed')
      .reduce((acc, r) => acc + PLANS[r.plan].price, 0),
  };

  const handleConfirmPayment = (id: string) => {
    updatePaymentStatus(id, 'confirmed');
  };

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary border-b border-primary-foreground/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar ao site</span>
            </Link>
            <div className="flex items-center gap-2 text-primary-foreground">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="font-display font-bold">Painel Admin</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de currículos</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.receiptSent}</p>
                <p className="text-sm text-muted-foreground">Aguardando análise</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.confirmed}</p>
                <p className="text-sm text-muted-foreground">Confirmados</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  R$ {stats.revenue.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-muted-foreground">Receita total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'pending', 'receipt_sent', 'confirmed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
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
                          {PLANS[resume.plan].name} - R$ {PLANS[resume.plan].price.toFixed(2)}
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
                          onCheckedChange={() => toggleDownloadEnabled(resume.id)}
                          disabled={resume.paymentStatus !== 'confirmed'}
                        />
                      </td>
                      <td className="px-6 py-4">
                        {resume.paymentStatus === 'receipt_sent' && (
                          <button
                            onClick={() => handleConfirmPayment(resume.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            Confirmar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
