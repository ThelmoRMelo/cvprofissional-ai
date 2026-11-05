import { useState } from 'react';
import { Plus, Edit, Trash2, Eye, LayoutGrid, ArrowLeft, Code, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTemplateStore } from '@/store/templateStore';
import { Plan, PLANS, TemplateModel } from '@/types/resume';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AddTemplateDialog, hasTemplateDraft } from './AddTemplateDialog';
import { toast } from 'sonner';

interface TemplateManagementProps {
  onBack: () => void;
  initialShowAdd?: boolean;
  isOnline?: boolean;
}

export function TemplateManagement({ onBack, initialShowAdd = false, isOnline = true }: TemplateManagementProps) {
  const { templates, addTemplate, updateTemplate, deleteTemplate, toggleTemplateActive } = useTemplateStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(() => (initialShowAdd || hasTemplateDraft()) && isOnline);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateModel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'basic' as Plan,
    previewUrl: '',
    prompt: '',
  });
  const [filterCategory, setFilterCategory] = useState<Plan | 'all'>('all');

  const filteredTemplates = templates.filter((t) =>
    filterCategory === 'all' ? true : t.category === filterCategory
  );
  const visibleCategories: Plan[] = filterCategory === 'all'
    ? ['basic', 'intermediate', 'professional']
    : [filterCategory];

  const handleOpenAddDialog = () => {
    if (!isOnline) {
      toast.warning('Ação indisponível enquanto estiver offline.');
      return;
    }
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (template: TemplateModel) => {
    if (!isOnline) {
      toast.warning('Ação indisponível enquanto estiver offline.');
      return;
    }
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      previewUrl: template.previewUrl,
      prompt: template.prompt || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleTemplateCreated = (templateData: Omit<TemplateModel, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!isOnline) {
      toast.warning('Ação indisponível enquanto estiver offline.');
      return;
    }
    addTemplate(templateData);
  };

  const handleSaveEdit = () => {
    if (!isOnline) {
      toast.warning('Ação indisponível enquanto estiver offline.');
      return;
    }
    if (!formData.name || !editingTemplate) return;
    updateTemplate(editingTemplate.id, formData);
    setIsEditDialogOpen(false);
    setFormData({ name: '', category: 'basic', previewUrl: '', prompt: '' });
  };

  const handleDelete = (id: string) => {
    if (!isOnline) {
      toast.warning('Ação indisponível enquanto estiver offline.');
      return;
    }
    if (confirm('Tem certeza que deseja excluir este modelo?')) {
      deleteTemplate(id);
    }
  };

  const getCategoryBadge = (category: Plan) => {
    const styles = {
      basic: 'bg-gray-100 text-gray-700',
      intermediate: 'bg-blue-100 text-blue-700',
      professional: 'bg-accent/10 text-accent',
    };
    return (
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', styles[category])}>
        {PLANS[category].name}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {!isOnline && (
        <div role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-200">
          Você está offline. A criação, edição e exclusão de modelos exigem conexão com a nuvem.
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <LayoutGrid className="w-6 h-6" />
              Modelos de Currículo
            </h2>
            <p className="text-muted-foreground text-sm">
              Gerencie os templates disponíveis para os clientes
            </p>
          </div>
        </div>
        <Button onClick={handleOpenAddDialog} disabled={!isOnline} title={!isOnline ? 'Ação indisponível offline' : undefined} className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar modelo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'basic', 'intermediate', 'professional'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filterCategory === cat
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {cat === 'all' ? 'Todos' : PLANS[cat].name}
          </button>
        ))}
      </div>

      {/* Horizontal template carousels grouped by plan */}
      <div className="space-y-7">
        {visibleCategories.map((category) => {
          const categoryTemplates = filteredTemplates.filter((template) => template.category === category);
          return (
            <section key={category} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{PLANS[category].name}</h3>
                  {getCategoryBadge(category)}
                  <span className="text-xs text-muted-foreground">{categoryTemplates.length} modelo{categoryTemplates.length === 1 ? '' : 's'}</span>
                </div>
                <Button size="sm" variant="outline" onClick={handleOpenAddDialog} disabled={!isOnline} title={!isOnline ? 'Ação indisponível offline' : undefined} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              <div className="group/admin-carousel relative" data-template-carousel-group>
                <button
                  type="button"
                  aria-label={`Rolar modelos ${PLANS[category].name} para a esquerda`}
                  onClick={(event) => event.currentTarget.parentElement?.querySelector<HTMLElement>('[data-template-carousel]')?.scrollBy({ left: -200, behavior: 'smooth' })}
                  className="absolute -left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition-transform hover:scale-105"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div
                  data-template-carousel
                  tabIndex={0}
                  aria-label={`Modelos ${PLANS[category].name}`}
                  className="flex h-[19rem] touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto px-3 py-1 scroll-smooth focus:outline-none"
                  style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
                >
                  {categoryTemplates.map((template) => (
                    <article
                      key={template.id}
                      className={cn(
                        'group relative flex h-[17.5rem] w-56 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg',
                        !template.isActive && 'opacity-70',
                      )}
                    >
                      <div className="relative h-32 shrink-0 overflow-hidden bg-secondary">
                        <img
                          src={template.previewUrl?.trim() || '/placeholder.svg'}
                          alt={template.name}
                          className="h-full w-full object-cover"
                          onError={(event) => { event.currentTarget.src = '/placeholder.svg'; }}
                        />
                        <span className={cn(
                          'absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-semibold',
                          template.isActive ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground',
                        )}>
                          {template.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col justify-between p-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="line-clamp-2 text-sm font-semibold text-foreground" title={template.name}>{template.name}</h4>
                          <Switch
                            checked={template.isActive}
                            onCheckedChange={() => toggleTemplateActive(template.id)}
                            disabled={!isOnline}
                            title={!isOnline ? 'Ação indisponível offline' : undefined}
                            aria-label={`${template.isActive ? 'Desativar' : 'Ativar'} ${template.name}`}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => window.open(template.previewUrl || '/placeholder.svg', '_blank', 'noopener,noreferrer')}
                            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-3.5 w-3.5" /> Ver
                          </button>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" onClick={() => handleOpenEditDialog(template)} disabled={!isOnline} title={!isOnline ? 'Ação indisponível offline' : `Editar ${template.name}`} className="h-8 w-8">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => handleDelete(template.id)} disabled={!isOnline} title={!isOnline ? 'Ação indisponível offline' : `Excluir ${template.name}`} className="h-8 w-8">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {categoryTemplates.length === 0 && (
                    <div className="flex h-56 w-full shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 text-sm text-muted-foreground">
                      Nenhum modelo cadastrado nesta categoria.
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Rolar modelos ${PLANS[category].name} para a direita`}
                  onClick={(event) => event.currentTarget.parentElement?.querySelector<HTMLElement>('[data-template-carousel]')?.scrollBy({ left: 200, behavior: 'smooth' })}
                  className="absolute -right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition-transform hover:scale-105"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {/* Add Template Dialog with AI */}
      <AddTemplateDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onTemplateCreated={handleTemplateCreated}
      />

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar modelo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do modelo</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Moderno Executivo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Categoria / Plano</Label>
              <Select
                value={formData.category}
                onValueChange={(value: Plan) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">{PLANS.basic.name}</SelectItem>
                  <SelectItem value="intermediate">{PLANS.intermediate.name}</SelectItem>
                  <SelectItem value="professional">{PLANS.professional.name}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-preview">URL da imagem de preview</Label>
              <Input
                id="edit-preview"
                value={formData.previewUrl}
                onChange={(e) => setFormData({ ...formData, previewUrl: e.target.value })}
                placeholder="https://... ou /placeholder.svg"
              />
            </div>
            {formData.previewUrl && (
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={formData.previewUrl}
                  alt="Preview"
                  className="w-full h-40 object-cover"
                  onError={(e) => (e.currentTarget.src = '/placeholder.svg')}
                />
              </div>
            )}
            {editingTemplate?.generatedHtml && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Template HTML gerado
                </Label>
                <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground max-h-32 overflow-y-auto">
                  <code className="whitespace-pre-wrap break-all">
                    {editingTemplate.generatedHtml.substring(0, 500)}...
                  </code>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={!isOnline || !formData.name} title={!isOnline ? 'Ação indisponível offline' : undefined}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
