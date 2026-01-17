import { useState } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import { PLANS, PaymentStatus } from '@/types/resume';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { QuickActions } from '@/components/admin/QuickActions';
import { StatsCards } from '@/components/admin/StatsCards';
import { ResumesTable } from '@/components/admin/ResumesTable';
import { TemplateManagement } from '@/components/admin/TemplateManagement';

type AdminView = 'dashboard' | 'templates';

export default function Admin() {
  const { resumes, updatePaymentStatus, toggleDownloadEnabled } = useResumeStore();
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');
  const [view, setView] = useState<AdminView>('dashboard');
  const [showAddTemplate, setShowAddTemplate] = useState(false);

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

  const handleCardClick = (cardFilter: 'all' | 'pending' | 'receipt_sent' | 'confirmed') => {
    setFilter(cardFilter);
    // Scroll to table
    document.getElementById('resumes-table')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleQuickAction = {
    addTemplate: () => {
      setShowAddTemplate(true);
      setView('templates');
    },
    manageTemplates: () => {
      setShowAddTemplate(false);
      setView('templates');
    },
    viewPending: () => {
      setFilter('receipt_sent');
      setView('dashboard');
      setTimeout(() => {
        document.getElementById('resumes-table')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    viewConfirmed: () => {
      setFilter('confirmed');
      setView('dashboard');
      setTimeout(() => {
        document.getElementById('resumes-table')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title={view === 'templates' ? 'Modelos de Currículo' : 'Painel Admin'} />

      <div className="container mx-auto px-4 py-8">
        {view === 'dashboard' ? (
          <div className="space-y-8">
            {/* Quick Actions */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">Ações rápidas</h2>
              <QuickActions
                onAddTemplate={handleQuickAction.addTemplate}
                onManageTemplates={handleQuickAction.manageTemplates}
                onViewPending={handleQuickAction.viewPending}
                onViewConfirmed={handleQuickAction.viewConfirmed}
              />
            </section>

            {/* Stats */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">Visão geral</h2>
              <StatsCards
                stats={stats}
                onCardClick={handleCardClick}
                activeFilter={filter}
              />
            </section>

            {/* Resumes Table */}
            <section id="resumes-table">
              <h2 className="text-lg font-semibold text-foreground mb-4">Currículos</h2>
              <ResumesTable
                resumes={resumes}
                filter={filter}
                onFilterChange={setFilter}
                onConfirmPayment={handleConfirmPayment}
                onToggleDownload={toggleDownloadEnabled}
              />
            </section>
          </div>
        ) : (
          <TemplateManagement
            onBack={() => setView('dashboard')}
            initialShowAdd={showAddTemplate}
          />
        )}
      </div>
    </div>
  );
}
