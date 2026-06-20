import { createClient } from "jsr:@supabase/supabase-js@2";
// AI generation — FIEL à skill vap-video-remotion (Lei da Edição do canal Viagem ao Passado).
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Kind = "angles" | "script" | "caption";

const SKILL = "Você é o roteirista-chefe do canal 'Viagem ao Passado' — Shorts verticais 9:16 (1080x1920, 30fps) de história, estilo DOCUMENTAL CINEMATOGRÁFICO (fundo escuro azul-petróleo/preto + dourado da marca), narração grave PT-BR 'Victor Power'. Referência oficial vigente: EP009 Paradoxo de Fermi. REGRA #1 — 100% de acurácia histórica: datas, nomes, números, mapas e objetos de época têm que bater com fontes; citações com atribuição; sem anacronismo. A LEI DA EDIÇÃO (nunca quebrar): (1) Os 3 primeiros segundos são tudo — abre com um GANCHO de curiosidade + cena de impacto (um clipe de vídeo de IA por baixo do título, que some em ~1,5s); nada de intro parado ou silêncio. (2) Cada corte = uma cena DIFERENTE; nunca duas iguais seguidas; um visual repete no máximo 1x. (3) Corte a cada 3–5s (pattern interrupt); slams tipográficos de ~1,5–2,5s pontuam as batidas-chave; nenhum corte acima de ~7s. (4) Estrutura alternada: vídeo → vetor → imagem IA → vetor → vídeo…; arco GANCHO → CONFLITO → RESOLUÇÃO → PUNCHLINE → CTA. (5) Mídia por episódio (padrão fixo): 2 clipes de vídeo IA (no HOOK e no CLÍMAX) + 2 imagens IA (os 2 planos-herói: personagem e lugar) + cenas vetoriais únicas (uma por beat) + slams + CTA. Se uma frase não tem visual próprio, crie um ou corte a frase. (6) Legendas sempre, verbatim, ≤5 palavras por bloco, palavra-chave em dourado. Narração: conversacional, frases curtas, GANCHO forte na 1ª frase, escreva como FALA REAL (as legendas saem da narração). Identidade visual dos planos: cinematográfico escuro azul-petróleo/preto + dourado, 9:16, SEM texto na imagem. CTA final do canal: '+ SEGUIR'.";

function buildPrompt(kind: Kind, input: any): { system: string; user: string } {
  if (kind === "angles") {
    return {
      system: SKILL + " Gere ganchos virais e provocadores fiéis à acurácia histórica.",
      user: `Tema: ${input.topic}. Gere 5 ângulos virais DISTINTOS para um Short de até 60s — cada um um gancho de curiosidade forte e historicamente verdadeiro. Responda APENAS com JSON {"angles":["...","...","...","...","..."]} sem markdown.`,
    };
  }
  if (kind === "script") {
    return {
      system: SKILL + " Você escreve o roteiro de NARRAÇÃO e o storyboard seguindo a Lei da Edição à risca.",
      user: `Tema: ${input.topic}. Ângulo: ${input.angle}. Duração alvo: ${input.duration_s ?? 45}s. Escreva a NARRAÇÃO em 8–14 beats curtos separados por [CORTE]. Beat 1 = GANCHO (<2s). Siga o arco gancho→conflito→resolução→punchline e termine no CTA '+ SEGUIR'. Plante CEDO (por volta do 2º beat) uma PERGUNTA DE OPINIÃO BINÁRIA (escolha um lado, sem resposta certa) e repita-a no card final — é a semente dos comentários. Monte um storyboard 1-cena-por-beat respeitando o PADRÃO FIXO de mídia: exatamente 2 beats com visual "video" (hook e clímax), 2 beats com "imagem" (os 2 planos-herói: personagem e lugar), os demais "vetor", e insira 1–2 "slam" nas viradas. Inclua 3 verificações de fato com fonte. Responda APENAS com JSON: {"script":"beat1 [CORTE] beat2 ...","hook":"primeira frase","question":"pergunta de opiniao binaria curta para o card final","fact_checks":["fato — fonte","fato — fonte","fato — fonte"],"storyboard":[{"narr":"texto falado do beat","visual":"video|imagem|vetor|slam","desc":"prompt visual cinematográfico escuro+dourado 9:16 sem texto"}]} sem markdown.`,
    };
  }
  return {
    system: SKILL + " Você escreve legendas magnéticas (texto do post) com hashtags.",
    user: `Tema: ${input.topic}. Ângulo: ${input.angle}. Roteiro: ${(input.script ?? "").slice(0, 1200)}. Responda APENAS com JSON: {"caption":"legenda de até 220 caracteres com gancho","hashtags":["#historia","..."]} (8 hashtags). Sem markdown.`,
  };
}

function mockResponse(kind: Kind, input: any) {
  const topic = input.topic ?? "a história";
  const angle = input.angle ?? topic;
  if (kind === "angles") return { angles: [
    `O que ninguém te contou sobre ${topic}`,
    `${topic}: o detalhe que mudou tudo em um único dia`,
    `A versão que os livros escondem sobre ${topic}`,
    `Três fatos sobre ${topic} que parecem mentira — mas aconteceram`,
    `Como ${topic} quase deu MUITO errado`,
  ]};
  if (kind === "script") return {
    hook: `Você nunca ouviu isso sobre ${topic}.`,
    question: `E você: o que pesa mais nessa história sobre ${topic}?`,
    script: `Você nunca ouviu isso sobre ${topic}. [CORTE] ${angle}. [CORTE] Tudo começou com uma decisão que ninguém esperava. [CORTE] No auge da tensão, a virada. [CORTE] E o detalhe que muda tudo estava escondido à vista de todos. [CORTE] O desfecho mudou o rumo da história. [CORTE] Se isso te surpreendeu, segue o Viagem ao Passado.`,
    fact_checks: [
      "Datas e nomes conferidos em fontes historiográficas.",
      "Números citados conferidos em registros oficiais.",
      "Contexto político checado em fontes secundárias.",
    ],
    storyboard: [
      { narr: `Você nunca ouviu isso sobre ${topic}.`, visual: "video", desc: "abertura cinematográfica de impacto, escuro azul-petróleo + dourado, 9:16, sem texto" },
      { narr: angle, visual: "imagem", desc: "retrato histórico do personagem, cinematográfico escuro+dourado, 9:16, sem texto" },
      { narr: "Tudo começou com uma decisão inesperada.", visual: "vetor", desc: "mapa/linha do tempo animada dourada" },
      { narr: "A virada.", visual: "slam", desc: "slam tipográfico dourado" },
      { narr: "No clímax, tudo mudou.", visual: "video", desc: "clipe de clímax cinematográfico, 9:16, sem texto" },
      { narr: "O lugar onde aconteceu.", visual: "imagem", desc: "plano do lugar histórico, cinematográfico escuro+dourado, 9:16, sem texto" },
      { narr: "O desfecho mudou a história.", visual: "vetor", desc: "infográfico de consequência" },
      { narr: "Segue o Viagem ao Passado.", visual: "slam", desc: "CTA + SEGUIR com logo bússola dourada" },
    ],
  };
  return {
    caption: `${angle} — a história que pouca gente conhece. Salva pra contar pra alguém hoje.`,
    hashtags: ["#historia","#viagemaopassado","#curiosidades","#cultura","#shorts","#fatos","#educacao","#brasil"],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { kind, input } = await req.json() as { kind: Kind; input: any };
    if (!kind) throw new Error("Missing kind");
    const { system, user } = buildPrompt(kind, input);
    const admin = createClient(SUPA_URL, SERVICE);
    const { data: oaCred } = await admin.from("integration_credentials").select("client_secret").eq("platform", "openai").maybeSingle();
    const oaKey = oaCred?.client_secret ?? Deno.env.get("OPENAI_API_KEY");

    async function call(url: string, headers: Record<string,string>, model: string) {
      try {
        const res = await fetch(url, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }], response_format: { type: "json_object" } }) });
        if (!res.ok) return null;
        const d = await res.json();
        return JSON.parse(d?.choices?.[0]?.message?.content ?? "{}");
      } catch { return null; }
    }

    let parsed: any = null;
    if (oaKey) parsed = await call("https://api.openai.com/v1/chat/completions", { Authorization: "Bearer " + oaKey }, "gpt-4o-mini");
    if (!parsed) { const lk = Deno.env.get("LOVABLE_API_KEY"); if (lk) parsed = await call(GATEWAY_URL, { "Lovable-API-Key": lk }, MODEL); }
    if (!parsed) parsed = mockResponse(kind, input);
    return Response.json(parsed, { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
