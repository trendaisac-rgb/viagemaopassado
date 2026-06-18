import { createClient } from "jsr:@supabase/supabase-js@2";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const CRON_KEY = "vap-cron-7c3f9a21";
const cors: Record<string,string> = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key" };
const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const MOCK = [
  { theme: "A última carta de Cleópatra", angle: "O bilhete que selou o fim de uma dinastia" },
  { theme: "O homem que vendeu a Torre Eiffel — duas vezes", angle: "O golpe que ninguém achou possível" },
  { theme: "A noite em que Roma queimou", angle: "O que Nero realmente fazia enquanto a cidade ardia" },
  { theme: "O exército de terracota perdido", angle: "Por que 8 mil soldados foram enterrados em barro" },
  { theme: "A rainha africana que humilhou Portugal", angle: "Nzinga e a cadeira que virou trono humano" },
  { theme: "O código que afundou a Alemanha nazista", angle: "A máquina que encurtou a guerra em 2 anos" },
  { theme: "O imperador que fugiu vestido de mulher", angle: "A noite mais vergonhosa de um trono milenar" },
  { theme: "A expedição que sumiu no Mato Grosso", angle: "Percy Fawcett e a cidade que nunca foi achada" },
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

    let ideas: { theme: string; angle: string }[] = [];
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (apiKey) {
      try {
        const res = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ model: MODEL, response_format: { type: "json_object" }, messages: [
            { role: "system", content: "Roteirista-chefe do canal de história 'Viagem ao Passado'. Sugere temas virais de história (figuras, eventos, curiosidades, mistérios), PT-BR, ganchos fortes." },
            { role: "user", content: `Gere ${count} ideias DISTINTAS e originais. Responda APENAS com JSON {"ideas":[{"theme":"...","angle":"..."}]} sem markdown.` },
          ] }),
        });
        if (res.ok) { const d = await res.json(); const p = JSON.parse(d?.choices?.[0]?.message?.content ?? "{}"); if (Array.isArray(p.ideas)) ideas = p.ideas; }
      } catch (_) { /* mock */ }
    }

    let inserted = 0;
    for (const uid of ids) {
      const list = ideas.length ? ideas : [...MOCK].sort(() => Math.random() - 0.5);
      const rows = list.slice(0, count).map((i) => ({ user_id: uid, theme: String(i.theme ?? "").slice(0, 200), angle: String(i.angle ?? "").slice(0, 300), source: "auto", status: "suggested" }));
      const { data } = await admin.from("content_ideas").insert(rows).select();
      inserted += data?.length ?? 0;
    }
    return json({ ok: true, inserted, users: ids.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
