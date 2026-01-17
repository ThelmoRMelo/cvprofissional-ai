import { useNavigate } from 'react-router-dom';
import { Check, Star } from 'lucide-react';
import { Plan, PLANS } from '@/types/resume';
import { useResumeStore } from '@/store/resumeStore';
import { cn } from '@/lib/utils';

const planOrder: Plan[] = ['basic', 'intermediate', 'professional'];

const planStyles: Record<Plan, { badge?: string; accent: string; bg: string }> = {
  basic: { accent: 'text-plan-basic', bg: 'bg-plan-basic' },
  intermediate: { badge: 'Mais Popular', accent: 'text-plan-intermediate', bg: 'bg-plan-intermediate' },
  professional: { badge: 'Melhor Valor', accent: 'text-plan-professional', bg: 'bg-plan-professional' },
};

export function PricingSection() {
  const navigate = useNavigate();
  const createResume = useResumeStore((state) => state.createResume);

  const handleSelectPlan = (plan: Plan) => {
    const resume = createResume(plan);
    navigate(`/editor/${resume.id}`);
  };

  return (
    <section id="planos" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-center text-foreground mb-4">
          Escolha seu plano
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          Preços acessíveis para todos os perfis profissionais
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {planOrder.map((planKey, index) => {
            const plan = PLANS[planKey];
            const style = planStyles[planKey];
            const isFeatured = planKey === 'professional';

            return (
              <div
                key={planKey}
                className={cn(
                  'card-plan relative',
                  isFeatured && 'card-plan-featured scale-105 border-accent',
                  !isFeatured && 'hover:border-accent/50'
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {style.badge && (
                  <div className={cn(
                    'absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold',
                    isFeatured ? 'bg-accent text-accent-foreground' : 'bg-plan-intermediate text-white'
                  )}>
                    <Star className="w-3 h-3 inline mr-1" />
                    {style.badge}
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className={cn(
                    'font-display font-bold text-xl mb-2',
                    isFeatured ? 'text-primary-foreground' : 'text-foreground'
                  )}>
                    {plan.name}
                  </h3>
                  <div className={cn(
                    'flex items-baseline justify-center gap-1',
                    isFeatured ? 'text-primary-foreground' : 'text-foreground'
                  )}>
                    <span className="text-sm">R$</span>
                    <span className="text-5xl font-display font-bold">
                      {plan.price.toFixed(0)}
                    </span>
                    <span className="text-2xl font-display font-bold">,00</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center',
                        isFeatured ? 'bg-accent' : 'bg-accent/10'
                      )}>
                        <Check className={cn(
                          'w-3 h-3',
                          isFeatured ? 'text-accent-foreground' : 'text-accent'
                        )} />
                      </div>
                      <span className={cn(
                        'text-sm',
                        isFeatured ? 'text-primary-foreground/90' : 'text-muted-foreground'
                      )}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(planKey)}
                  className={cn(
                    'w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300',
                    isFeatured
                      ? 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-xl'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  Criar meu currículo
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
