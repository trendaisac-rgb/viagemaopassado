import { createClient } from "jsr:@supabase/supabase-js@2";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const CRON_KEY = "vap-cron-7c3f9a21";
const cors: Record<string,string> = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key" };
const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const THEMES = [
  { theme: "Operação Mincemeat — o cadáver que enganou Hitler", angle: "Um morto com documentos falsos mudou a 2ª Guerra" },
  { theme: "O Paradoxo de Fermi — cadê todo mundo no universo?", angle: "O silêncio cósmico que tira o sono dos cientistas" },
  { theme: "Como as pirâmides de Gizé foram construídas", angle: "2,3 milhões de blocos sem roda nem ferro" },
  { theme: "Nero tocou violino enquanto Roma queimava?", angle: "O mito que durou 2 mil anos" },
  { theme: "Mansa Musa — o homem mais rico da história", angle: "Quebrou a economia do Egito só passando por lá" },
  { theme: "A Mary Celeste — o navio achado sem ninguém a bordo", angle: "Comida na mesa, tudo intacto, zero tripulação" },
  { theme: "O mecanismo de Antikythera — o computador de 2 mil anos", angle: "Tecnologia grega que sumiu por séculos" },
  { theme: "A rainha Nzinga que humilhou Portugal", angle: "Virou trono sobre um servo" },
  { theme: "O manuscrito Voynich — o livro que ninguém lê", angle: "600 anos e nenhuma palavra decifrada" },
  { theme: "A explosão de Tunguska na Sibéria", angle: "Mil km² de floresta arrasada, zero cratera" },
  { theme: "A Biblioteca de Alexandria que perdemos", angle: "E se nunca tivesse queimado?" },
  { theme: "Hipátia — a cientista linchada por uma multidão", angle: "A mulher que sabia demais para a época" },
  { theme: "A Câmara de Âmbar — o tesouro nazista que sumiu", angle: "Uma sala de ouro e âmbar evaporou" },
  { theme: "Genghis Khan — o túmulo que ninguém achou", angle: "Mataram todos que cavaram a cova" },
  { theme: "Pompeia — congelada no tempo pela lava", angle: "Corpos contam o último dia da cidade" },
  { theme: "D.B. Cooper — sequestrou um avião e sumiu", angle: "O único caso não resolvido da aviação" },
  { theme: "A muralha da China é visível do espaço?", angle: "O mito que todo mundo repete (e é falso)" },
  { theme: "Stonehenge — quem moveu pedras de 25 toneladas?", angle: "E por quê, 5 mil anos atrás?" },
  { theme: "O exército de terracota — 8 mil soldados de barro", angle: "Enterrados para proteger um imperador morto" },
  { theme: "A Esfinge perdeu o nariz por causa de Napoleão?", angle: "A verdade sobre o rosto mutilado" },
  { theme: "Rasputin — por que era tão difícil de matar?", angle: "Veneno, tiros, afogamento... e resistiu" },
  { theme: "A colônia perdida de Roanoke", angle: "115 pessoas sumiram deixando uma palavra" },
  { theme: "Ada Lovelace — a primeira programadora", angle: "Código 100 anos antes do computador" },
  { theme: "Como Aníbal cruzou os Alpes com elefantes", angle: "A jogada mais ousada da Antiguidade" },
  { theme: "A ponte aérea de Berlim", angle: "Alimentar uma cidade só pelo céu" },
  { theme: "O incidente do Passo Dyatlov", angle: "9 alpinistas mortos de um jeito inexplicável" },
  { theme: "Cleópatra viveu mais perto de nós do que das pirâmides", angle: "A linha do tempo que quebra a cabeça" },
  { theme: "A gripe espanhola — a pandemia esquecida", angle: "Matou mais que a 1ª Guerra Mundial" },
  { theme: "O cavalo de Troia existiu de verdade?", angle: "O que a arqueologia diz do truque famoso" },
  { theme: "Tesla x Edison — a guerra das correntes", angle: "O gênio que morreu pobre e esquecido" },
  { theme: "Machu Picchu — por que os incas a abandonaram?", angle: "Construída e esquecida em 100 anos" },
  { theme: "A maldição de Tutancâmon", angle: "As mortes de quem abriu a tumba" },
  { theme: "A espiã dupla que enganou os nazistas no Dia D", angle: "Coragem que mudou a Normandia" },
  { theme: "O homem que vendeu a Torre Eiffel — duas vezes", angle: "O golpista mais audacioso de Paris" },
  { theme: "Os vikings chegaram à América antes de Colombo?", angle: "500 anos antes, e ninguém deu bola" },
  { theme: "A Guerra dos Emus — a Austrália perdeu para pássaros", angle: "Um exército derrotado por aves" },
  { theme: "Quem desenhou as linhas de Nazca e por quê?", angle: "Figuras gigantes só visíveis do céu" },
  { theme: "Atlântida — mito de Platão ou cidade real?", angle: "A lenda que move caçadores de ruínas" },
  { theme: "Como mumificavam os faraós", angle: "70 dias para a vida eterna" },
  { theme: "O eclipse que parou uma guerra", angle: "O céu escureceu e largaram as armas" },
  { theme: "Petra — a cidade esculpida na rocha", angle: "Um povo do deserto ergueu uma maravilha" },
  { theme: "Por que Roma caiu de verdade?", angle: "Spoiler: não foram só os bárbaros" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    if (req.headers.get("x-cron-key") !== CRON_KEY) return json({ error: "forbidden" }, 401);
    const admin = createClient(SUPA_URL, SERVICE);
    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(Number((body as any)?.count ?? 2), 1), 6);

    const { data: u } = await admin.auth.admin.listUsers();
    const ids = (u?.users ?? []).map((x: any) => x.id);
    if (ids.length === 0) return json({ ok: true, note: "sem usuários ainda" });

    let inserted = 0;
    for (const uid of ids) {
      const { data: ex } = await admin.from("content_ideas").select("theme").eq("user_id", uid);
      const used = new Set((ex ?? []).map((r: any) => String(r.theme).trim().toLowerCase()));

      let ideas: { theme: string; angle: string }[] = [];
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (apiKey) {
        try {
          const avoid = [...used].slice(0, 40).join("; ") || "(nenhum)";
          const res = await fetch(GATEWAY_URL, {
            method: "POST",
            headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ model: MODEL, temperature: 1.05, response_format: { type: "json_object" }, messages: [
              { role: "system", content: "Roteirista-chefe do canal de história 'Viagem ao Passado'. Temas de Shorts surpreendentes e variados (mistérios, curiosidades, 'será que...', como foi feito), PT-BR, ganchos fortes, sem repetir." },
              { role: "user", content: "Gere " + (count + 2) + " ideias DISTINTAS no tom de 'Operação Mincemeat', 'Paradoxo de Fermi', 'como as pirâmides foram construídas'. NÃO repita: " + avoid + ". JSON {\"ideas\":[{\"theme\":\"...\",\"angle\":\"...\"}]} sem markdown." },
            ] }),
          });
          if (res.ok) { const d = await res.json(); const p = JSON.parse(d?.choices?.[0]?.message?.content ?? "{}"); if (Array.isArray(p.ideas)) ideas = p.ideas; }
        } catch (_) { /* banco */ }
      }
      ideas = ideas.filter((i) => i?.theme && !used.has(String(i.theme).trim().toLowerCase()));
      if (ideas.length < count) {
        const pool = THEMES.filter((t) => !used.has(t.theme.trim().toLowerCase())).sort(() => Math.random() - 0.5);
        for (const t of pool) { if (ideas.length >= count) break; ideas.push(t); }
      }
      const rows = ideas.slice(0, count).map((i) => ({ user_id: uid, theme: String(i.theme).slice(0, 200), angle: String(i.angle ?? "").slice(0, 300), source: "auto", status: "suggested" }));
      if (rows.length) { const { data } = await admin.from("content_ideas").insert(rows).select(); inserted += data?.length ?? 0; }
    }
    return json({ ok: true, inserted, users: ids.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
