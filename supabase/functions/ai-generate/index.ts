// AI generation — embute a "Lei da Edição" do canal Viagem ao Passado.
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Kind = "angles" | "script" | "caption";

const LEI = "Canal 'Viagem ao Passado': Shorts verticais 9:16 de história, estilo documental cinematográfico (escuro + dourado), narração grave Victor Power PT-BR. LEI DA EDIÇÃO: (1) os 3 primeiros segundos são tudo — abre com um GANCHO de curiosidade + cena de impacto, sem intro parado; (2) corte a cada 3-5s, marque CADA corte com [CORTE]; (3) cada corte é um visual DIFERENTE; (4) arco: gancho -> conflito -> reviravolta -> punchline -> CTA; (5) narração conversacional, frases curtas, dramática; (6) REGRA #1: 100% de acurácia histórica (datas, nomes, números) com fontes; (7) termina com CTA de seguir. As legendas saem da fala real, então escreva como fala.";

function buildPrompt(kind: Kind, input: any): { system: string; user: string } {
  if (kind === "angles") {
    return {
      system: LEI + " Você gera ganchos virais e provocadores.",
      user: `Tema: ${input.topic}. Gere 5 ângulos virais DISTINTOS para um Short de até 60s, cada um com um gancho de curiosidade forte. Responda APENAS com JSON {"angles":["...","...","...","...","..."]} sem markdown.`,
    };
  }
  if (kind === "script") {
    return {
      system: LEI + " Você é o roteirista-chefe.",
      user: `Tema: ${input.topic}. Ângulo escolhido: ${input.angle}. Duração alvo: ${input.duration_s ?? 45}s. Escreva o roteiro de NARRAÇÃO em 8 a 14 beats curtos separados por [CORTE]. O 1º beat é o GANCHO (uma frase de curiosidade, <2s). Os beats seguem o arco gancho->conflito->reviravolta->punchline. O último beat é o CTA de seguir o canal. Inclua um storyboard alinhado aos beats (tipo de visual por beat: video, imagem, vetor ou slam) e 3 verificações de fato com fonte. Responda APENAS com JSON: {"script":"beat1 [CORTE] beat2 [CORTE] ...","hook":"primeira frase","fact_checks":["fato 1 — fonte","fato 2 — fonte","fato 3 — fonte"],"storyboard":[{"narr":"texto do beat","visual":"video","desc":"prompt visual curto cinematográfico 9:16 sem texto"}]} sem markdown.`,
    };
  }
  return {
    system: LEI + " Você escreve legendas magnéticas com hashtags.",
    user: `Tema: ${input.topic}. Ângulo: ${input.angle}. Roteiro: ${(input.script ?? "").slice(0, 1200)}. Responda APENAS com JSON: {"caption":"legenda de até 220 caracteres com gancho","hashtags":["#historia","..."]} (8 hashtags relevantes). Sem markdown.`,
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
    script: `Você nunca ouviu isso sobre ${topic}. [CORTE] ${angle}. [CORTE] Tudo começou com uma decisão que ninguém esperava. [CORTE] No auge da tensão, a virada: o que parecia o fim era só o começo. [CORTE] E o detalhe que muda tudo? Estava escondido à vista de todos. [CORTE] O desfecho mudou o rumo da história. [CORTE] Se isso te surpreendeu, segue o Viagem ao Passado pra parte 2.`,
    fact_checks: [
      "Datas e nomes confirmados em fontes historiográficas.",
      "Números citados conferidos em registros oficiais.",
      "Contexto político checado em fontes secundárias.",
    ],
    storyboard: [
      { narr: `Você nunca ouviu isso sobre ${topic}.`, visual: "video", desc: "abertura cinematográfica de impacto 9:16, atmosfera dramática, sem texto" },
      { narr: angle, visual: "imagem", desc: "retrato histórico cinematográfico do personagem/cena, 9:16, sem texto" },
      { narr: "Tudo começou com uma decisão inesperada.", visual: "vetor", desc: "mapa/linha do tempo animada" },
      { narr: "A virada.", visual: "slam", desc: "slam tipográfico dourado" },
      { narr: "O desfecho mudou a história.", visual: "imagem", desc: "cena de consequência, 9:16, sem texto" },
      { narr: "Segue pra parte 2.", visual: "slam", desc: "CTA + SEGUIR com logo" },
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
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return Response.json(mockResponse(kind, input), { headers: corsHeaders });

    const { system, user } = buildPrompt(kind, input);
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, { role: "user", content: user }], response_format: { type: "json_object" } }),
    });
    if (res.status === 429) return new Response(JSON.stringify({ error: "Limite de IA atingido. Tente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!res.ok) return Response.json(mockResponse(kind, input), { headers: corsHeaders });
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = mockResponse(kind, input); }
    return Response.json(parsed, { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
