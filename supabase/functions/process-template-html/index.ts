import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const SYSTEM_PROMPT = `Você é um especialista em clonagem pixel-perfect de currículos em HTML/CSS.
Sua tarefa: reproduzir FIELMENTE o design da imagem enviada — é uma CÓPIA, não uma inspiração.
Copie exatamente: número e largura proporcional das colunas, faixas/barras laterais, cores (use os hexadecimais observados), fundo, tipografia (peso, tamanho relativo, caixa alta, espaçamento entre letras), hierarquia, ordem das seções, ícones (desenhe com CSS/SVG inline ou caracteres unicode), linhas divisórias, bordas, cantos, espaçamentos e posição/formato da foto (circular, quadrada, com borda etc.).
Regras obrigatórias:
- Página A4: um container raiz com width:794px; min-height:1123px; box-sizing:border-box; overflow:hidden.
- HTML autossuficiente: todo CSS em uma tag <style>; NENHUM JavaScript, NENHUMA fonte, imagem ou CSS externo. Use fontes de sistema próximas (Arial, Helvetica, Georgia, 'Times New Roman', Verdana).
- NÃO mantenha nenhum dado pessoal da imagem. Substitua por placeholders exatos:
  {{nome}}, {{profissao}}, {{email}}, {{telefone}}, {{endereco}}, {{objetivo}}, {{experiencias}}, {{educacao}}, {{competencias}}, {{linkedin}}, {{portfolio}}, {{foto}}.
- {{foto}} deve ser usado como valor do src: <img src="{{foto}}" ...> no mesmo local e formato da foto original.
- {{experiencias}}, {{educacao}} e {{competencias}} são blocos HTML que serão injetados; coloque cada um dentro do container da seção correspondente, mantendo títulos de seção como no original.
- Títulos de seção (ex.: "Experiência", "Formação") podem ser mantidos como texto fixo.
Responda APENAS com o HTML completo, sem markdown nem explicações.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Não autenticado.' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(auth.replace('Bearer ', ''));
    if (claimsErr || !claims?.claims?.sub) return json({ error: 'Sessão inválida.' }, 401);
    const { data: isAdmin } = await userClient.rpc('has_role', { _user_id: claims.claims.sub, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Acesso restrito ao administrador.' }, 403);

    const body = await req.json().catch(() => ({}));
    const id = typeof body?.template_id === 'string' ? body.template_id : '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'template_id inválido.' }, 400);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: tpl } = await admin.from('templates').select('id, preview_url, reference_file_url').eq('id', id).maybeSingle();
    if (!tpl) return json({ error: 'Modelo não encontrado.' }, 404);
    const imageUrl = tpl.reference_file_url || tpl.preview_url;
    if (!imageUrl) return json({ error: 'Modelo sem imagem de referência.' }, 400);

    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) return json({ error: 'IA não configurada.' }, 500);
    const ai = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: [
            { type: 'text', text: 'Clone fielmente este currículo em HTML/CSS A4 com os placeholders.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ] },
        ],
      }),
    });
    if (ai.status === 429) return json({ error: 'Muitas solicitações à IA. Tente em instantes.' }, 429);
    if (ai.status === 402) return json({ error: 'Créditos de IA esgotados.' }, 402);
    if (!ai.ok) { console.error('AI error', ai.status, await ai.text()); return json({ error: 'Falha no processamento da IA.' }, 502); }
    const out = await ai.json();
    let html: string = out?.choices?.[0]?.message?.content ?? '';
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '');
    if (!html.includes('{{nome}}')) return json({ error: 'A IA não retornou um HTML válido. Tente novamente.' }, 502);

    const { error: upErr } = await admin.from('templates').update({ generated_html: html, updated_at: new Date().toISOString() }).eq('id', id);
    if (upErr) return json({ error: 'Não foi possível salvar o HTML.' }, 500);
    return json({ generated_html: html });
  } catch (e) {
    console.error(e);
    return json({ error: 'Erro inesperado.' }, 500);
  }
});
