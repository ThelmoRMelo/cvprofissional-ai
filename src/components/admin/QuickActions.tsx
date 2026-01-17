import { Plus, LayoutGrid, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  onAddTemplate: () => void;
  onManageTemplates: () => void;
  onViewPending: () => void;
  onViewConfirmed: () => void;
}

export function QuickActions({ 
  onAddTemplate, 
  onManageTemplates, 
  onViewPending, 
  onViewConfirmed 
}: QuickActionsProps) {
  const actions = [
    {
      icon: Plus,
      label: 'Adicionar modelo',
      description: 'Novo template de currículo',
      onClick: onAddTemplate,
      color: 'bg-accent text-accent-foreground hover:bg-accent/90',
      iconBg: 'bg-accent-foreground/20',
    },
    {
      icon: LayoutGrid,
      label: 'Gerenciar modelos',
      description: 'Editar e organizar templates',
      onClick: onManageTemplates,
      color: 'bg-secondary text-foreground hover:bg-secondary/80',
      iconBg: 'bg-muted',
    },
    {
      icon: Clock,
      label: 'Pendentes',
      description: 'Comprovantes aguardando',
      onClick: onViewPending,
      color: 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 border border-yellow-500/20',
      iconBg: 'bg-yellow-100',
    },
    {
      icon: CheckCircle,
      label: 'Confirmados',
      description: 'Pagamentos aprovados',
      onClick: onViewConfirmed,
      color: 'bg-green-500/10 text-green-700 hover:bg-green-500/20 border border-green-500/20',
      iconBg: 'bg-green-100',
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={cn(
            'flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left group',
            action.color
          )}
        >
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110',
            action.iconBg
          )}>
            <action.icon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{action.label}</p>
            <p className="text-xs opacity-70 truncate">{action.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
