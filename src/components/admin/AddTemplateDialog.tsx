import { useState, useRef, useEffect } from 'react';
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

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const DRAFT_KEY = 'cv-template-draft';

type CompressedData = { base64: string; mimeType: string; blob: Blob };
type DraftData = {
  formData: { name: string; category: Plan; previewUrl: string; prompt: string };
  file?: { name: string; size: number; base64: string; mimeType: string };
};

const base64ToBlob = (base64: string, mimeType: string) => {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
};

const readDraft = (): DraftData | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DraftData) : null;
  } catch {
    return null;
  }
};

/** True when an unfinished "Adicionar modelo" form was saved (e.g. the phone reloaded the app). */
export const hasTemplateDraft = () => readDraft() !== null;

const isValidFileType = (file: File): boolean => {
  if (file.type) {
    if (file.type.startsWith('image/') || file.type === 'application/pdf') return true;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'bmp', 'webp', 'heic', 'pdf'].includes(ext);
};

function compressImageForMobile(file: File, maxDim = 1024, quality = 0.75): Promise<{ base64: string; mimeType: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const extensionMimeTypes: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', bmp: 'image/bmp',
      webp: 'image/webp', heic: 'image/heic', pdf: 'application/pdf',
    };
    const mimeType = file.type.startsWith('image/') || file.type === 'application/pdf'
      ? file.type
      : extensionMimeTypes[extension] || file.type || 'application/octet-stream';
    const isImage = mimeType.startsWith('image/');
    const resolveOriginal = () => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({ base64: result.split(',')[1], mimeType, blob: file });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    if (!isImage) {
      resolveOriginal();
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Falha no canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, quality);
      const base64 = dataUrl.split(',')[1];

      canvas.toBlob(
        (blob) => resolve({ base64, mimeType, blob: blob || file }),
        mimeType,
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Preserve formats the browser cannot decode (for example, HEIC on older mobile browsers).
      resolveOriginal();
    };
    img.src = url;
  });
}

export function AddTemplateDialog({ open, onOpenChange, onTemplateCreated }: AddTemplateDialogProps) {
  const [initialDraft] = useState(readDraft);
  const [formData, setFormData] = useState(
    initialDraft?.formData ?? { name: '', category: 'basic' as Plan, previewUrl: '', prompt: '' },
  );
  const [compressedData, setCompressedData] = useState<CompressedData | null>(() => {
    const f = initialDraft?.file;
    if (!f) return null;
    try { return { base64: f.base64, mimeType: f.mimeType, blob: base64ToBlob(f.base64, f.mimeType) }; } catch { return null; }
  });
  const [referenceFile, setReferenceFile] = useState<File | null>(() => {
    const f = initialDraft?.file;
    if (!f || !compressedData) return null;
    return new File([compressedData.blob], f.name, { type: f.mimeType });
  });
  const [isCompressing, setIsCompressing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>(() => {
    const f = initialDraft?.file;
    return f && f.mimeType.startsWith('image/') ? `data:${f.mimeType};base64,${f.base64}` : '';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep an unfinished form saved on the device so that, if the phone reloads the app
  // while choosing a photo, the admin comes back to the same form with the image attached.
  useEffect(() => {
    if (!open) return;
    const hasContent = formData.name || formData.prompt || formData.previewUrl || compressedData;
    if (!hasContent) { localStorage.removeItem(DRAFT_KEY); return; }
    const draft: DraftData = { formData };
    if (compressedData && referenceFile && compressedData.base64.length < 3_000_000) {
      draft.file = { name: referenceFile.name, size: referenceFile.size, base64: compressedData.base64, mimeType: compressedData.mimeType };
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData })); } catch { /* storage full */ }
    }
  }, [open, formData, compressedData, referenceFile]);

  const resetForm = () => {
    localStorage.removeItem(DRAFT_KEY);
    setFormData({ name: '', category: 'basic', previewUrl: '', prompt: '' });
    setReferenceFile(null);
    setCompressedData(null);
    setPreviewImage('');
  };

  const handleManualClose = () => {
    if (isGenerating || isCompressing) return;
    resetForm();
    onOpenChange(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidFileType(file)) {
      toast.error('Formato inválido. Aceitos: JPG, PNG, WEBP, BMP ou PDF');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo permitido: 15MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsCompressing(true);
    try {
      setReferenceFile(file);
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'bmp', 'webp', 'heic'].includes(extension);
      if (isImage) {
        const compressed = await compressImageForMobile(file);
        setCompressedData(compressed);
        setPreviewImage(`data:${compressed.mimeType};base64,${compressed.base64}`);
      } else {
        const original = await compressImageForMobile(file);
        setCompressedData(original);
        setPreviewImage('');
      }
      toast.success(`Arquivo "${file.name}" carregado com sucesso.`);
    } catch (error) {
      console.error('Falha ao processar arquivo de referência:', error);
      setReferenceFile(null);
      setCompressedData(null);
      setPreviewImage('');
      toast.error('Não foi possível processar a imagem selecionada.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!formData.name.trim()) {
      toast.error('Informe o nome do modelo.');
      return;
    }

    if (!formData.prompt.trim() && !referenceFile) {
      toast.error('Adicione um prompt ou anexe uma imagem de referência.');
      return;
    }

    setIsGenerating(true);

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      let referenceFileUrl: string | undefined;

      // Use the data compressed during selection and upload that same optimized blob.
      if (referenceFile && compressedData) {
        imageBase64 = compressedData.base64;
        imageMimeType = compressedData.mimeType;

        // Upload to storage for future reference
        const extension = compressedData.mimeType === 'image/jpeg'
          ? 'jpg'
          : referenceFile.name.split('.').pop()?.toLowerCase() || 'bin';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('template-references')
          .upload(fileName, compressedData.blob, { contentType: compressedData.mimeType });

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

      // Use the generated preview URL from AI, or fallback to user-provided URL, or placeholder
      const finalPreviewUrl = data.previewUrl && data.previewUrl !== '/placeholder.svg' 
        ? data.previewUrl 
        : (formData.previewUrl || '/placeholder.svg');

      // Create the template
      onTemplateCreated({
        name: formData.name,
        category: formData.category,
        previewUrl: finalPreviewUrl,
        referenceFileUrl,
        prompt: formData.prompt,
        generatedHtml: data.html,
        isActive: true,
      });

      toast.success('Modelo criado com sucesso!');
      
      // Reset state and close after successful generation, even before React commits isGenerating=false.
      resetForm();
      onOpenChange(false);

    } catch (error) {
      console.error('Error generating template:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar modelo');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !isGenerating && !isCompressing) handleManualClose(); }}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          if (isGenerating) event.preventDefault();
        }}
      >
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
                disabled={isGenerating || isCompressing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria / Plano *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: Plan) => setFormData({ ...formData, category: value })}
                disabled={isGenerating || isCompressing}
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
                disabled={isGenerating || isCompressing}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating || isCompressing}
                className="gap-2 shrink-0"
              >
                {isCompressing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isCompressing ? 'Otimizando...' : 'Upload'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.bmp,.webp,.heic"
                onChange={handleFileSelect}
                disabled={isGenerating || isCompressing}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Aceita fotos, imagens ou PDF (máx. 15 MB). O arquivo é otimizado antes do envio.
            </p>
          </div>

          {/* File/Preview Display */}
          {(referenceFile || formData.previewUrl || previewImage) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {referenceFile && (
                <div className="border rounded-lg p-4 bg-secondary/50">
                  <div className="flex items-center gap-3">
                    {referenceFile.type === 'application/pdf' || referenceFile.name.toLowerCase().endsWith('.pdf') ? (
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
                        setCompressedData(null);
                        setPreviewImage('');
                      }}
                      disabled={isGenerating || isCompressing}
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
              disabled={isGenerating || isCompressing}
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
          <Button type="button" variant="outline" onClick={handleManualClose} disabled={isGenerating || isCompressing}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleGenerate} disabled={isGenerating || isCompressing || !formData.name.trim()} className="gap-2">
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
