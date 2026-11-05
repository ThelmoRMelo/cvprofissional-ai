import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, category, imageBase64, imageMimeType, referenceImageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating template with prompt:", prompt);
    console.log("Category:", category);
    console.log("Has image:", !!imageBase64);

    const systemPrompt = `Você é um especialista em reproduzir currículos em HTML com fidelidade de pixel.
Quando uma IMAGEM de referência for enviada, sua tarefa é fazer uma CÓPIA FIEL do layout dela:
- Mesmo número de colunas e mesmas proporções (ex.: barra lateral de 35% à esquerda, se houver);
- Mesmas cores exatas (estime os códigos hexadecimais de fundos, faixas, títulos e textos);
- Mesma ordem e posição das seções, mesmos títulos de seção (texto igual ao da imagem);
- Mesmos elementos decorativos: faixas, linhas divisórias, ícones simples, barras de habilidade, círculos;
- Mesma tipografia aproximada (serifada/sem serifa, pesos, tamanhos, caixa alta);
- Se a imagem tiver FOTO, coloque {{foto}} exatamente no mesmo lugar e formato (redonda/quadrada), dentro de um contêiner com largura/altura fixas e overflow:hidden.
NÃO invente um design próprio, NÃO simplifique. Substitua apenas os textos pessoais pelos campos dinâmicos.

Campos dinâmicos (use exatamente esta sintaxe):
{{foto}} {{nome}} {{email}} {{telefone}} {{endereco}} {{linkedin}} {{objetivo}} {{experiencias}} {{educacao}} {{habilidades}}
({{experiencias}}, {{educacao}} e {{habilidades}} são substituídos por listas já formatadas — coloque cada um uma única vez, no local da seção correspondente.)

REGRAS TÉCNICAS:
1. Apenas CSS inline; sem JavaScript; sem imagens externas.
2. Contêiner raiz com width:794px; min-height:1123px (A4), box-sizing:border-box.
3. Para colunas use display:flex (não use position absolute para o layout principal).
4. Fontes web-safe (Arial, Helvetica, Georgia, 'Times New Roman', Verdana).
5. Retorne APENAS o HTML, sem explicações nem markdown.
${category === 'basic' ? 'Sem referência: tons de cinza e preto.' : category === 'intermediate' ? 'Sem referência: azul escuro e cinza.' : 'Sem referência: tons elegantes de azul/verde escuro.'}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // If we have an image, include it in the request
    if (imageBase64 && imageMimeType) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Reproduza FIELMENTE este currículo em HTML, copiando layout, colunas, cores, tipografia e posição de cada seção (e da foto, se houver). Instruções adicionais do usuário: ${prompt || "Crie um currículo profissional baseado nesta referência."}`
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${imageMimeType};base64,${imageBase64}`
            }
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: prompt || "Crie um currículo profissional elegante e moderno."
      });
    }

    console.log("Calling AI gateway for HTML generation...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: imageBase64 ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received for HTML");

    const generatedHtml = data.choices?.[0]?.message?.content;

    if (!generatedHtml) {
      throw new Error("No content generated from AI");
    }

    // Clean up the response - remove markdown code blocks if present
    let cleanHtml = generatedHtml
      .replace(/```html\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();

    console.log("Template HTML generated successfully, length:", cleanHtml.length);

    // Now generate preview image using AI image generation
    let previewUrl = typeof referenceImageUrl === 'string' && referenceImageUrl.startsWith('http') ? referenceImageUrl : '/placeholder.svg';
    
    if (previewUrl === '/placeholder.svg') try {
      console.log("Generating preview image...");
      
      const previewPrompt = `Create a professional resume/CV preview thumbnail image. 
The design should be: ${category === 'basic' ? 'minimalist with grayscale colors' : category === 'intermediate' ? 'modern with dark blue and gray tones' : 'elegant with sophisticated gradients in dark blue/green tones'}.
Show a clean A4 resume layout with:
- Header section with name placeholder
- Contact information area
- Professional sections for experience, education, skills
- Clean typography and professional spacing
Style: Professional document preview, high resolution, suitable as a template thumbnail.
Ultra high resolution preview image.`;

      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: previewPrompt
            }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (generatedImage && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          console.log("Preview image generated, uploading to storage...");
          
          // Extract base64 data from the data URL
          const base64Match = generatedImage.match(/^data:([^;]+);base64,(.+)$/);
          
          if (base64Match) {
            const mimeType = base64Match[1];
            const base64Data = base64Match[2];
            
            // Convert base64 to Uint8Array
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Upload to Supabase storage
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const fileName = `preview-${Date.now()}.png`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('template-references')
              .upload(fileName, bytes, {
                contentType: mimeType,
                upsert: true
              });
            
            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage
                .from('template-references')
                .getPublicUrl(fileName);
              
              previewUrl = urlData.publicUrl;
              console.log("Preview image uploaded successfully:", previewUrl);
            } else {
              console.warn("Failed to upload preview image:", uploadError);
            }
          }
        }
      } else {
        console.warn("Failed to generate preview image, using placeholder");
      }
    } catch (imageError) {
      console.warn("Error generating preview image:", imageError);
      // Continue with placeholder
    }

    return new Response(JSON.stringify({ 
      html: cleanHtml,
      previewUrl,
      success: true 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating template:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
