import { useNavigate } from 'react-router-dom';
import { Check, Star, Eye } from 'lucide-react';
import { Plan, PLANS } from '@/types/resume';
import { useResumeStore } from '@/store/resumeStore';
import { useTemplateStore } from '@/store/templateStore';
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
  const templates = useTemplateStore((state) => state.templates);

  const handleSelectPlan = (plan: Plan) => {
    const resume = createResume(plan);
    navigate(`/editor/${resume.id}`);
  };

  // Get active templates for each plan
  const getTemplatesForPlan = (plan: Plan) => {
    if (plan === 'professional') {
      // Professional gets all active templates
      return templates.filter((t) => t.isActive);
    } else if (plan === 'intermediate') {
      // Intermediate gets basic + intermediate templates
      return templates.filter((t) => t.isActive && (t.category === 'basic' || t.category === 'intermediate'));
    } else {
      // Basic gets only basic templates
      return templates.filter((t) => t.isActive && t.category === 'basic');
    }
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
            const planTemplates = getTemplatesForPlan(planKey);

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

                <ul className="space-y-3 mb-6">
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

                {/* Templates Preview */}
                <div className="mb-6">
                  <p className={cn(
                    'text-xs font-medium mb-2',
                    isFeatured ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    {planTemplates.length > 0 
                      ? `${planTemplates.length} modelo${planTemplates.length > 1 ? 's' : ''} disponíve${planTemplates.length > 1 ? 'is' : 'l'}:`
                      : 'Modelos em breve'}
                  </p>
                  {planTemplates.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {planTemplates.slice(0, 3).map((template) => (
                        <div
                          key={template.id}
                          className="relative w-12 h-16 rounded-md overflow-hidden border-2 border-white/20 shrink-0 group cursor-pointer bg-secondary"
                          title={template.name}
                        >
                          <img
                            src={template.previewUrl && template.previewUrl.trim() !== '' ? template.previewUrl : '/placeholder.svg'}
                            alt={template.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      ))}
                      {planTemplates.length > 3 && (
                        <div className={cn(
                          'w-12 h-16 rounded-md flex items-center justify-center text-xs font-medium shrink-0',
                          isFeatured ? 'bg-white/10 text-white' : 'bg-secondary text-muted-foreground'
                        )}>
                          +{planTemplates.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
