import { ResumeTemplate } from '@/types/resume';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface TemplateSelectorProps {
  selected: ResumeTemplate;
  onSelect: (template: ResumeTemplate) => void;
}

const templates: { id: ResumeTemplate; name: string; description: string }[] = [
  { id: 'modern', name: 'Moderno', description: 'Design contemporâneo com cores vibrantes' },
  { id: 'classic', name: 'Clássico', description: 'Tradicional e profissional' },
  { id: 'minimal', name: 'Minimalista', description: 'Limpo e objetivo' },
];

export function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-foreground">Modelo do Currículo</h3>
      <div className="grid grid-cols-3 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={cn(
              'relative p-4 rounded-xl border-2 text-center transition-all',
              selected === template.id
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-accent/50'
            )}
          >
            {selected === template.id && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-accent-foreground" />
              </div>
            )}
            <div className="w-full aspect-[3/4] bg-secondary rounded-lg mb-2" />
            <p className="font-medium text-sm text-foreground">{template.name}</p>
            <p className="text-xs text-muted-foreground">{template.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
