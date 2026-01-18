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
    const { prompt, category, imageBase64, imageMimeType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating template with prompt:", prompt);
    console.log("Category:", category);
    console.log("Has image:", !!imageBase64);

    const systemPrompt = `Você é um especialista em design de currículos profissionais. Sua tarefa é gerar um template de currículo em HTML + CSS inline que seja:

1. ELEGANTE e PROFISSIONAL
2. Responsivo e bem estruturado
3. Com campos dinâmicos usando a sintaxe {{campo}}

Os campos dinâmicos disponíveis são:
- {{nome}} - Nome completo
- {{email}} - Email
- {{telefone}} - Telefone
- {{endereco}} - Endereço
- {{objetivo}} - Objetivo profissional
- {{experiencias}} - Lista de experiências (cada uma com cargo, empresa, periodo, descricao)
- {{educacao}} - Lista de formações (cada uma com curso, instituicao, periodo)
- {{habilidades}} - Lista de habilidades

REGRAS IMPORTANTES:
1. Use APENAS CSS inline nos elementos HTML
2. O HTML deve ser completo e auto-contido
3. Use cores profissionais baseadas na categoria: ${category === 'basic' ? 'tons de cinza e preto' : category === 'intermediate' ? 'azul escuro e cinza' : 'gradientes elegantes em tons de azul/verde escuro'}
4. NÃO use JavaScript
5. Estruture bem as seções: Dados Pessoais, Objetivo, Experiência, Educação, Habilidades
6. O design deve parecer um currículo real, pronto para impressão
7. Use fontes web-safe como Arial, Helvetica, Georgia
8. Retorne APENAS o código HTML, sem explicações

Exemplo de estrutura esperada:
<div style="...">
  <header style="...">
    <h1 style="...">{{nome}}</h1>
    <p style="...">{{email}} | {{telefone}}</p>
  </header>
  ...
</div>`;

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
            text: `Use esta imagem como referência visual para o layout do currículo. Inspire-se no design, cores e estrutura mostrados. Instruções adicionais do usuário: ${prompt || "Crie um currículo profissional baseado nesta referência."}`
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
        model: "google/gemini-2.5-flash",
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
    let previewUrl = '/placeholder.svg';
    
    try {
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
