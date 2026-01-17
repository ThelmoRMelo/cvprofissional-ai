import { Users, FileText, Check, DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  stats: {
    total: number;
    pending: number;
    receiptSent: number;
    confirmed: number;
    revenue: number;
  };
  onCardClick: (filter: 'all' | 'pending' | 'receipt_sent' | 'confirmed') => void;
  activeFilter: string;
}

export function StatsCards({ stats, onCardClick, activeFilter }: StatsCardsProps) {
  const cards = [
    {
      id: 'all',
      icon: Users,
      value: stats.total,
      label: 'Total de currículos',
      iconBg: 'bg-secondary',
      iconColor: 'text-foreground',
      trend: '+12% este mês',
    },
    {
      id: 'receipt_sent',
      icon: FileText,
      value: stats.receiptSent,
      label: 'Aguardando análise',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      highlight: stats.receiptSent > 0,
    },
    {
      id: 'confirmed',
      icon: Check,
      value: stats.confirmed,
      label: 'Confirmados',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      id: 'revenue',
      icon: DollarSign,
      value: `R$ ${stats.revenue.toFixed(2).replace('.', ',')}`,
      label: 'Receita total',
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
      isRevenue: true,
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <button
          key={card.id}
          onClick={() => !card.isRevenue && onCardClick(card.id as any)}
          disabled={card.isRevenue}
          className={cn(
            'bg-card rounded-xl border border-border p-5 text-left transition-all duration-200 group',
            !card.isRevenue && 'hover:border-accent hover:shadow-lg cursor-pointer',
            card.isRevenue && 'cursor-default',
            activeFilter === card.id && !card.isRevenue && 'border-accent ring-2 ring-accent/20',
            card.highlight && 'animate-pulse border-yellow-400'
          )}
        >
          <div className="flex items-start justify-between">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-transform',
              !card.isRevenue && 'group-hover:scale-110',
              card.iconBg
            )}>
              <card.icon className={cn('w-6 h-6', card.iconColor)} />
            </div>
            {card.trend && (
              <div className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                {card.trend}
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-foreground font-display">
              {typeof card.value === 'number' ? card.value : card.value}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
