import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Plan, PLANS, TemplateModel } from '@/types/resume';
import { useResumeStore } from '@/store/resumeStore';
import { useTemplateStore } from '@/store/templateStore';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
  const settings = useSettingsStore((state) => state.settings);
  const [selectedPreview, setSelectedPreview] = useState<{ template: TemplateModel; planKey: Plan } | null>(null);

  const handleSelectPlan = (plan: Plan, templateId?: string) => {
    const resume = createResume(plan, templateId);
    navigate(`/editor/${resume.id}`);
  };

  // Each plan only displays active templates registered in its own category.
  const getTemplatesForPlan = (plan: Plan): TemplateModel[] =>
    templates.filter((template) => template.isActive && template.category === plan);

  return (
    <section id="planos" className="bg-background py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-4 text-center font-display text-3xl font-bold text-foreground md:text-4xl">
          Escolha seu plano
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
          Preços acessíveis com modelos exclusivos para cada categoria profissional
        </p>

        <div className="mx-auto grid max-w-5xl items-stretch gap-8 md:grid-cols-3">
          {planOrder.map((planKey, index) => {
            const plan = { ...PLANS[planKey], price: settings.plans[planKey].price };
            const style = planStyles[planKey];
            const isFeatured = planKey === 'professional';
            const planTemplates = getTemplatesForPlan(planKey);

            return (
              <div
                key={planKey}
                className={cn(
                  'card-plan relative flex flex-col justify-between',
                  isFeatured && 'card-plan-featured scale-105 border-accent',
                  !isFeatured && 'hover:border-accent/50',
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div>
                  {style.badge && (
                    <div
                      className={cn(
                        'absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold',
                        isFeatured ? 'bg-accent text-accent-foreground' : 'bg-plan-intermediate text-white',
                      )}
                    >
                      <Star className="mr-1 inline h-3 w-3" />
                      {style.badge}
                    </div>
                  )}

                  <div className="mb-6 text-center">
                    <h3 className={cn('mb-2 font-display text-xl font-bold', isFeatured ? 'text-primary-foreground' : 'text-foreground')}>
                      {plan.name}
                    </h3>
                    <div className={cn('flex items-baseline justify-center gap-1', isFeatured ? 'text-primary-foreground' : 'text-foreground')}>
                      <span className="text-sm">R$</span>
                      <span className="font-display text-5xl font-bold">{plan.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>

                  <ul className="mb-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <div className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', isFeatured ? 'bg-accent' : 'bg-accent/10')}>
                          <Check className={cn('h-3 w-3', isFeatured ? 'text-accent-foreground' : 'text-accent')} />
                        </div>
                        <span className={cn('text-sm', isFeatured ? 'text-primary-foreground/90' : 'text-muted-foreground')}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mb-6 border-t border-border/40 pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className={cn('text-xs font-semibold', isFeatured ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                        {planTemplates.length > 0
                          ? `${planTemplates.length} modelo${planTemplates.length > 1 ? 's' : ''} deste plano:`
                          : 'Modelos deste plano:'}
                      </p>
                      {planTemplates.length > 3 && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80">Role para ver todos →</span>
                      )}
                    </div>

                    {planTemplates.length > 0 ? (
                      <div className="group/carousel relative">
                        <button
                          type="button"
                          aria-label="Rolar modelos para a esquerda"
                          onClick={(event) => {
                            const container = event.currentTarget.parentElement?.querySelector('[data-template-carousel]');
                            container?.scrollBy({ left: -180, behavior: 'smooth' });
                          }}
                          className="absolute -left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground opacity-100 shadow transition-opacity md:opacity-0 md:group-hover/carousel:opacity-100 md:focus:opacity-100"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div
                          data-template-carousel
                          tabIndex={0}
                          aria-label={`Modelos do plano ${plan.name}`}
                          className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-2 pt-1 scroll-smooth focus:outline-none"
                          style={{ scrollbarWidth: 'thin' }}
                        >
                          {planTemplates.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => setSelectedPreview({ template, planKey })}
                              className={cn(
                                'group relative h-24 w-16 shrink-0 snap-start overflow-hidden rounded-lg border-2 text-left shadow-sm transition-all duration-200 hover:scale-105',
                                isFeatured ? 'border-white/30 hover:border-accent' : 'border-border bg-secondary hover:border-primary',
                              )}
                              title={`Clique para ampliar: ${template.name}`}
                            >
                              <img
                                src={template.previewUrl?.trim() || '/placeholder.svg'}
                                alt={template.name}
                                className="h-full w-full object-cover"
                                onError={(event) => { event.currentTarget.src = '/placeholder.svg'; }}
                              />
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-1 text-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                <Eye className="mb-0.5 h-4 w-4 text-white" />
                                <span className="line-clamp-2 text-[9px] font-medium leading-tight text-white">{template.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          aria-label="Rolar modelos para a direita"
                          onClick={(event) => {
                            const container = event.currentTarget.parentElement?.querySelector('[data-template-carousel]');
                            container?.scrollBy({ left: 180, behavior: 'smooth' });
                          }}
                          className="absolute -right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground opacity-100 shadow transition-opacity md:opacity-0 md:group-hover/carousel:opacity-100 md:focus:opacity-100"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className={cn(
                        'rounded-lg border border-dashed p-3 text-center text-xs',
                        isFeatured ? 'border-white/20 bg-white/5 text-primary-foreground/70' : 'border-border bg-muted/30 text-muted-foreground',
                      )}>
                        Novos modelos sendo adicionados em breve pelo admin.
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectPlan(planKey)}
                  className={cn(
                    'mt-2 w-full rounded-xl px-6 py-3 font-semibold transition-all duration-300',
                    isFeatured
                      ? 'bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 hover:shadow-xl'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                >
                  Criar meu currículo
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={Boolean(selectedPreview)} onOpenChange={(open) => { if (!open) setSelectedPreview(null); }}>
        <DialogContent className="max-h-[90vh] w-[92vw] max-w-md overflow-y-auto p-6">
          {selectedPreview && (
            <>
              <DialogHeader className="mb-2 text-left">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
                    Plano {PLANS[selectedPreview.planKey].name}
                  </span>
                </div>
                <DialogTitle className="font-display text-xl font-bold">{selectedPreview.template.name}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {selectedPreview.template.prompt || 'Modelo exclusivo otimizado para ATS e recrutadores.'}
                </DialogDescription>
              </DialogHeader>

              <div className="relative my-3 aspect-[1/1.414] w-full overflow-hidden rounded-xl border border-border bg-secondary shadow-md">
                <img
                  src={selectedPreview.template.previewUrl?.trim() || '/placeholder.svg'}
                  alt={selectedPreview.template.name}
                  className="h-full w-full bg-white object-contain"
                  onError={(event) => { event.currentTarget.src = '/placeholder.svg'; }}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPreview(null)}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const plan = selectedPreview.planKey;
                    const templateId = selectedPreview.template.id;
                    setSelectedPreview(null);
                    handleSelectPlan(plan, templateId);
                  }}
                  className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  Escolher este plano
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
