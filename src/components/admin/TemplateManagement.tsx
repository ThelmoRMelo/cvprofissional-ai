import { useState } from 'react';
import { Plus, Edit, Trash2, Eye, LayoutGrid, ArrowLeft, Code } from 'lucide-react';
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
import { AddTemplateDialog } from './AddTemplateDialog';
import { toast } from 'sonner';

interface TemplateManagementProps {
  onBack: () => void;
  initialShowAdd?: boolean;
  isOnline?: boolean;
}

export function TemplateManagement({ onBack, initialShowAdd = false, isOnline = true }: TemplateManagementProps) {
  const { templates, addTemplate, updateTemplate, deleteTemplate, toggleTemplateActive } = useTemplateStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(initialShowAdd && isOnline);
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

      {/* Templates Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={cn(
              'bg-card rounded-xl border border-border overflow-hidden transition-all hover:shadow-lg group',
              !template.isActive && 'opacity-60'
            )}
          >
            {/* Preview */}
            <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
              <img
                src={template.previewUrl && template.previewUrl.trim() !== '' ? template.previewUrl : '/placeholder.svg'}
                alt={template.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
              <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => handleOpenEditDialog(template)}
                  disabled={!isOnline}
                  title={!isOnline ? 'Ação indisponível offline' : undefined}
                  className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Edit className="w-4 h-4 text-primary" />
                </button>
                <button
                  onClick={() => window.open(template.previewUrl || '/placeholder.svg', '_blank')}
                  className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Eye className="w-4 h-4 text-primary" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  disabled={!isOnline}
                  title={!isOnline ? 'Ação indisponível offline' : undefined}
                  className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
              {!template.isActive && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  Inativo
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-foreground truncate">{template.name}</h3>
                {getCategoryBadge(template.category)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {template.isActive ? 'Ativo na landing' : 'Oculto'}
                </span>
                <Switch
                  checked={template.isActive}
                  onCheckedChange={() => toggleTemplateActive(template.id)}
                  disabled={!isOnline}
                  title={!isOnline ? 'Ação indisponível offline' : undefined}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add New Card */}
        <button
          onClick={handleOpenAddDialog}
          disabled={!isOnline}
          title={!isOnline ? 'Ação indisponível offline' : undefined}
          className="aspect-[3/4] bg-secondary/50 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 hover:border-accent hover:bg-secondary transition-all group disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
            <Plus className="w-8 h-8 text-accent" />
          </div>
          <span className="text-muted-foreground group-hover:text-foreground transition-colors font-medium">
            Adicionar modelo
          </span>
        </button>
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
