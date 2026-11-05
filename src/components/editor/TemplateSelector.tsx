import { Plan, ResumeTemplate } from '@/types/resume';
import { useTemplateStore } from '@/store/templateStore';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface TemplateSelectorProps {
  plan: Plan;
  selected: ResumeTemplate;
  onSelect: (template: ResumeTemplate) => void;
}

export function TemplateSelector({ plan, selected, onSelect }: TemplateSelectorProps) {
  const templates = useTemplateStore((state) => state.templates);
  const planTemplates = templates.filter((template) => template.isActive && template.category === plan);

  if (planTemplates.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="font-medium text-foreground">Modelo do Currículo</h3>
        <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Nenhum modelo cadastrado nesta categoria no momento. O modelo padrão será utilizado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Modelo do Currículo</h3>
        <span className="text-xs text-muted-foreground">
          {planTemplates.length} modelo{planTemplates.length > 1 ? 's' : ''} disponível{planTemplates.length > 1 ? 'is' : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {planTemplates.map((template) => {
          const isSelected = selected === template.id || selected === template.name;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              aria-pressed={isSelected}
              className={cn(
                'group relative flex flex-col justify-between overflow-hidden rounded-xl border-2 p-3 text-left transition-all',
                isSelected ? 'border-accent bg-accent/5 shadow-sm' : 'border-border bg-card hover:border-accent/50',
              )}
            >
              {isSelected && (
                <div className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-accent shadow">
                  <Check className="h-3 w-3 text-accent-foreground" />
                </div>
              )}
              <div className="mb-2 aspect-[1/1.4] w-full overflow-hidden rounded-lg border border-border/50 bg-secondary">
                <img
                  src={template.previewUrl?.trim() || '/placeholder.svg'}
                  alt={template.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  onError={(event) => { event.currentTarget.src = '/placeholder.svg'; }}
                />
              </div>
              <p className="truncate text-xs font-medium text-foreground" title={template.name}>{template.name}</p>
              {template.prompt && <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{template.prompt}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
