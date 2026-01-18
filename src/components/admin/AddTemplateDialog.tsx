import { useState, useRef } from 'react';
import { Upload, Loader2, Sparkles, FileText, Image as ImageIcon } from 'lucide-react';
import { Plan, PLANS } from '@/types/resume';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateCreated: (template: {
    name: string;
    category: Plan;
    previewUrl: string;
    referenceFileUrl?: string;
    prompt?: string;
    generatedHtml?: string;
    isActive: boolean;
  }) => void;
}

const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/bmp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function AddTemplateDialog({ open, onOpenChange, onTemplateCreated }: AddTemplateDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'basic' as Plan,
    previewUrl: '',
    prompt: '',
  });
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast.error('Formato inválido. Aceitos: PDF, JPG, PNG, BMP');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    setReferenceFile(file);

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImage('');
    }

    toast.success(`Arquivo "${file.name}" selecionado`);
  };

  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve({ base64, mimeType: file.type });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    if (!formData.name) {
      toast.error('Digite o nome do modelo');
      return;
    }

    if (!formData.prompt && !referenceFile) {
      toast.error('Adicione um prompt ou faça upload de uma imagem de referência');
      return;
    }

    setIsGenerating(true);

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      let referenceFileUrl: string | undefined;

      // Upload reference file to storage if provided
      if (referenceFile) {
        const fileData = await fileToBase64(referenceFile);
        imageBase64 = fileData.base64;
        imageMimeType = fileData.mimeType;

        // Upload to storage for future reference
        const fileName = `${Date.now()}-${referenceFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('template-references')
          .upload(fileName, referenceFile);

        if (uploadError) {
          console.warn('Could not upload reference file:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('template-references')
            .getPublicUrl(fileName);
          referenceFileUrl = urlData.publicUrl;
        }
      }

      // Call edge function to generate template
      const { data, error } = await supabase.functions.invoke('generate-template', {
        body: {
          prompt: formData.prompt,
          category: formData.category,
          imageBase64,
          imageMimeType,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao gerar template');
      }

      // Create the template
      onTemplateCreated({
        name: formData.name,
        category: formData.category,
        previewUrl: formData.previewUrl || '/placeholder.svg',
        referenceFileUrl,
        prompt: formData.prompt,
        generatedHtml: data.html,
        isActive: true,
      });

      toast.success('Modelo criado com sucesso!');
      
      // Reset form
      setFormData({ name: '', category: 'basic', previewUrl: '', prompt: '' });
      setReferenceFile(null);
      setPreviewImage('');
      onOpenChange(false);

    } catch (error) {
      console.error('Error generating template:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar modelo');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setFormData({ name: '', category: 'basic', previewUrl: '', prompt: '' });
      setReferenceFile(null);
      setPreviewImage('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Adicionar modelo com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name and Category */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do modelo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Moderno Executivo"
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria / Plano *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: Plan) => setFormData({ ...formData, category: value })}
                disabled={isGenerating}
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
          </div>

          {/* Preview URL and Upload */}
          <div className="space-y-2">
            <Label>Imagem de preview / Referência visual</Label>
            <div className="flex gap-2">
              <Input
                value={formData.previewUrl}
                onChange={(e) => setFormData({ ...formData, previewUrl: e.target.value })}
                placeholder="URL da imagem de preview"
                className="flex-1"
                disabled={isGenerating}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.bmp"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Aceita: PDF, JPG, PNG, BMP (máx. 10MB). O arquivo será usado como referência visual para a IA.
            </p>
          </div>

          {/* File/Preview Display */}
          {(referenceFile || formData.previewUrl || previewImage) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {referenceFile && (
                <div className="border rounded-lg p-4 bg-secondary/50">
                  <div className="flex items-center gap-3">
                    {referenceFile.type === 'application/pdf' ? (
                      <FileText className="w-10 h-10 text-red-500" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-blue-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{referenceFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(referenceFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReferenceFile(null);
                        setPreviewImage('');
                      }}
                      disabled={isGenerating}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              )}
              {(previewImage || formData.previewUrl) && (
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={previewImage || formData.previewUrl}
                    alt="Preview"
                    className="w-full h-40 object-cover"
                    onError={(e) => (e.currentTarget.src = '/placeholder.svg')}
                  />
                </div>
              )}
            </div>
          )}

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt para a IA</Label>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              placeholder="Descreva como o currículo deve ser estruturado e estilizado. Ex: 'Crie um currículo moderno com cores escuras, seções bem definidas e layout de duas colunas. Destaque as habilidades com ícones.'"
              rows={5}
              disabled={isGenerating}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Esse prompt será enviado à IA junto com a imagem de referência (se houver) para gerar o modelo HTML.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
            <h4 className="font-medium text-accent mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Como funciona
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• A IA irá gerar um template HTML + CSS baseado no seu prompt e imagem</li>
              <li>• O modelo terá campos dinâmicos que o cliente poderá editar</li>
              <li>• Download ficará bloqueado até liberação manual no painel</li>
              <li>• Uma marca d'água será aplicada enquanto o download estiver bloqueado</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !formData.name} className="gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar com IA
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
