import { createClient } from "jsr:@supabase/supabase-js@2";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const cors: Record<string,string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const MOCK = [
  { theme: "A última carta de Cleópatra", angle: "O bilhete que selou o fim de uma dinastia" },
  { theme: "O homem que vendeu a Torre Eiffel — duas vezes", angle: "O golpe que ninguém acreditou ser possível" },
  { theme: "A noite em que Roma queimou", angle: "O que Nero realmente fazia enquanto a cidade ardia" },
  { theme: "O exército de terracota perdido", angle: "Por que 8 mil soldados foram enterrados vivos em barro" },
  { theme: "A rainha africana que humilhou Portugal", angle: "Nzinga e a cadeira que virou trono humano" },
  { theme: "O código que afundou a Alemanha nazista", angle: "A máquina que encurtou a guerra em 2 anos" },
  { theme: "O imperador que fugiu vestido de mulher", angle: "A noite mais vergonhosa de um trono milenar" },
  { theme: "A expedição que sumiu no Mato Grosso", angle: "Percy Fawcett e a cidade que nunca foi achada" },
];

function buildPrompt(count: number, niche: string) {
  return {
    system: "Você é o roteirista-chefe do canal de história 'Viagem ao Passado'. Sugere temas virais para Shorts: figuras históricas, eventos, curiosidades, mistérios. PT-BR, ganchos fortes.",
    user: `Gere ${count} ideias DISTINTAS e originais de episódio${niche ? " sobre: " + niche : ""}. Cada uma com um 'theme' (título curto) e um 'angle' (gancho viral). Responda APENAS com JSON: {"ideas":[{"theme":"...","angle":"..."}]} sem markdown.`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const userClient = createClient(SUPA_URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "não autenticado" }, 401);
    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(Number(body?.count ?? 3), 1), 8);
    const niche = String(body?.niche ?? "");

    let ideas: { theme: string; angle: string }[] = [];
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (apiKey) {
      try {
        const { system, user: u } = buildPrompt(count, niche);
        const res = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, { role: "user", content: u }], response_format: { type: "json_object" } }),
        });
        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
          if (Array.isArray(parsed.ideas)) ideas = parsed.ideas;
        }
      } catch (_) { /* cai no mock */ }
    }
    if (ideas.length === 0) {
      const shuffled = [...MOCK].sort(() => Math.random() - 0.5);
      ideas = shuffled.slice(0, count);
    }

    const admin = createClient(SUPA_URL, SERVICE);
    const rows = ideas.slice(0, count).map(i => ({ user_id: user.id, theme: String(i.theme ?? "").slice(0, 200), angle: String(i.angle ?? "").slice(0, 300), source: "auto", status: "suggested" }));
    const { data: inserted, error } = await admin.from("content_ideas").insert(rows).select();
    if (error) return json({ error: error.message }, 500);
    return json({ ideas: inserted });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
