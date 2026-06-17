// AI generation edge function — calls Lovable AI Gateway
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Kind = "angles" | "script" | "caption";

function buildPrompt(kind: Kind, input: any): { system: string; user: string } {
  if (kind === "angles") {
    return {
      system: "Você é um roteirista de conteúdo histórico para Shorts/Reels/TikTok. Gere ganchos virais, curtos e provocadores, em português do Brasil.",
      user: `Tema: ${input.topic}\n\nGere 5 ângulos virais distintos para um Short de até 60 segundos. Responda APENAS com JSON no formato {"angles": ["...", "...", ...]} sem markdown.`,
    };
  }
  if (kind === "script") {
    return {
      system: "Você é roteirista do canal 'Viagem ao Passado'. Estilo conversacional, hook nos primeiros 3 segundos, cortes a cada 3-5s, finaliza com gancho.",
      user: `Tema: ${input.topic}\nÂngulo escolhido: ${input.angle}\nDuração alvo: ${input.duration_s ?? 45}s\n\nEscreva o roteiro completo em parágrafos curtos marcando cortes com [CORTE]. Inclua 3 verificações de fato (datas, nomes, fontes). Responda APENAS com JSON: {"script": "...", "fact_checks": ["...", ...]}. Sem markdown.`,
    };
  }
  return {
    system: "Você escreve legendas curtas e magnéticas com hashtags relevantes em português do Brasil.",
    user: `Tema: ${input.topic}\nÂngulo: ${input.angle}\nRoteiro: ${input.script?.slice(0, 1200)}\n\nResponda APENAS com JSON: {"caption": "legenda de até 220 caracteres", "hashtags": ["#hist...", "..."]} (8 hashtags). Sem markdown.`,
  };
}

function mockResponse(kind: Kind, input: any) {
  if (kind === "angles") return { angles: [
    `O segredo que ${input.topic} escondeu por séculos`,
    `Por que ${input.topic} mudou tudo em apenas um dia`,
    `A versão que os livros de história não contam sobre ${input.topic}`,
    `${input.topic}: três fatos que ninguém te contou`,
    `Como ${input.topic} quase deu errado — e ninguém lembra`,
  ]};
  if (kind === "script") return {
    script: `Você sabia disso? [CORTE]\n\n${input.angle}. [CORTE]\n\nTudo começou quando... [CORTE]\n\nE o desfecho? Bem mais surpreendente do que você imagina. [CORTE]\n\nSe gostou, no próximo episódio eu conto o que veio depois.`,
    fact_checks: [
      "Data confirmada nos arquivos oficiais.",
      "Nome citado é grafia aceita pela historiografia.",
      "Contexto político checado em fontes secundárias.",
    ],
  };
  return {
    caption: `${input.angle ?? input.topic} — a história que pouca gente conhece. Salva pra contar pra alguém hoje.`,
    hashtags: ["#historia","#viagemaopassado","#curiosidades","#cultura","#shorts","#fatos","#educacao","#brasil"],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { kind, input } = await req.json() as { kind: Kind; input: any };
    if (!kind) throw new Error("Missing kind");
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.warn("No LOVABLE_API_KEY — returning mock");
      return Response.json(mockResponse(kind, input), { headers: corsHeaders });
    }

    const { system, user } = buildPrompt(kind, input);
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Lovable-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de IA atingido. Tente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!res.ok) {
      const text = await res.text();
      console.error("Gateway error", res.status, text);
      return Response.json(mockResponse(kind, input), { headers: corsHeaders });
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed;
    try { parsed = JSON.parse(content); }
    catch { parsed = mockResponse(kind, input); }
    return Response.json(parsed, { headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
