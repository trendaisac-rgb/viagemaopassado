import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, FileText, Mic, Clapperboard, Send, ArrowRight, Lock, RotateCcw, Play } from "lucide-react";
import { NETWORKS, networkLabel, NetworkBadge } from "@/components/NetworkBadge";

export const Route = createFileRoute("/_authenticated/estudio")({
  head: () => ({ meta: [{ title: "Estúdio · Viagem ao Passado" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ tema: typeof s.tema === "string" ? s.tema : "", angulo: typeof s.angulo === "string" ? s.angulo : "" }),
  component: EstudioPage,
});

const PUB: Record<string, string> = { youtube: "youtube-publish", x: "x-publish", instagram: "instagram-publish", tiktok: "tiktok-publish" };

function EstudioPage() {
  const sp = Route.useSearch();
  const qc = useQueryClient();
  const [topic, setTopic] = useState(sp.tema || "");
  const [angles, setAngles] = useState<string[]>([]);
  const [angle, setAngle] = useState(sp.angulo || "");
  const [episodeId, setEpisodeId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [scriptDraft, setScriptDraft] = useState("");
  const [selectedNets, setSelectedNets] = useState<string[]>(["youtube"]);

  const epq = useQuery({
    queryKey: ["studio-ep", episodeId],
    enabled: !!episodeId,
    refetchInterval: (q) => { const e: any = q.state.data; return e && e.status === "generating" ? 3500 : false; },
    queryFn: async () => (await supabase.from("episodes").select("*").eq("id", episodeId).single()).data as any,
  });
  const e = epq.data;
  useEffect(() => { if (e && typeof e.script === "string") setScriptDraft(e.script); }, [e?.script]);

  async function ai(kind: string, input: any) {
    const { data, error } = await supabase.functions.invoke("ai-generate", { body: { kind, input } });
    if (error) throw new Error(error.message);
    return data as any;
  }

  async function suggestAngles() {
    if (!topic.trim()) { toast.error("Escreva um tema primeiro."); return; }
    setBusy("angles");
    try { const r = await ai("angles", { topic }); setAngles(r?.angles ?? []); }
    catch { toast.error("A IA não respondeu agora."); } finally { setBusy(""); }
  }

  async function startEpisode() {
    if (!topic.trim()) { toast.error("Escreva um tema primeiro."); return; }
    setBusy("start");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase.from("episodes").insert({ user_id: user.id, title: angle || topic, topic, angle: angle || null, status: "draft" }).select().single();
      if (error) throw error;
      setEpisodeId(data.id);
      await genScript(data.id);
    } catch (err: any) { toast.error(err.message); } finally { setBusy(""); }
  }

  async function genScript(id?: string) {
    const eid = id || episodeId; if (!eid) return;
    setBusy("script");
    try {
      const s = await ai("script", { topic, angle, duration_s: 45 });
      const c = await ai("caption", { topic, angle, script: s?.script });
      await supabase.from("episodes").update({ script: s?.script ?? "", caption: c?.caption ?? "", hashtags: c?.hashtags ?? [], storyboard: s?.storyboard ?? null, hook: s?.hook ?? null, fact_checks: s?.fact_checks ?? null }).eq("id", eid);
      qc.invalidateQueries({ queryKey: ["studio-ep", eid] });
      toast.success("Roteiro pronto!");
    } catch { toast.error("Falha ao gerar o roteiro."); } finally { setBusy(""); }
  }

  async function saveScript() {
    if (!episodeId) return;
    await supabase.from("episodes").update({ script: scriptDraft }).eq("id", episodeId);
    qc.invalidateQueries({ queryKey: ["studio-ep", episodeId] });
  }

  async function genNarration() {
    if (!episodeId) return;
    setBusy("narration");
    try {
      const { error } = await supabase.functions.invoke("generate-narration", { body: { episode_id: episodeId } });
      if (error) { let m = error.message; try { const j = await (error as any).context?.json?.(); if (j?.error) m = j.error; } catch { /* */ } toast.error(m); return; }
      qc.invalidateQueries({ queryKey: ["studio-ep", episodeId] });
      toast.success("Narração gerada (Victor Power)!");
    } finally { setBusy(""); }
  }

  async function render() {
    if (!episodeId) return;
    setBusy("render");
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
      await supabase.from("render_jobs").insert({ user_id: user.id, episode_id: episodeId, status: "queued" });
      await supabase.from("episodes").update({ status: "generating", progress_step: "render", progress_pct: 10 }).eq("id", episodeId);
      qc.invalidateQueries({ queryKey: ["studio-ep", episodeId] });
      toast.success("Na fila de render — deixe o worker rodando.");
    } finally { setBusy(""); }
  }

  async function publish() {
    if (!episodeId || selectedNets.length === 0) return;
    setBusy("publish");
    let ok = 0;
    try {
      for (const n of selectedNets) {
        const { data, error } = await supabase.functions.invoke(PUB[n], { body: { episode_id: episodeId } });
        if (error) { let m = error.message; try { const j = await (error as any).context?.json?.(); if (j?.error) m = j.error; } catch { /* */ } toast.error(`${networkLabel(n as any)}: ${m}`); }
        else { ok++; toast.success(`${networkLabel(n as any)}: publicado${(data as any)?.url ? " — " + (data as any).url : ""}`); }
      }
      if (ok > 0) qc.invalidateQueries({ queryKey: ["studio-ep", episodeId] });
    } finally { setBusy(""); }
  }

  async function genAssets() {
    if (!episodeId) return;
    setBusy("assets");
    try {
      const { data, error } = await supabase.functions.invoke("generate-assets", { body: { episode_id: episodeId } });
      if (error) { let m = error.message; try { const j = await (error as any).context?.json?.(); if (j?.error) m = j.error; } catch { /* */ } toast.error(m); return; }
      toast.success("Imagens geradas: " + ((data as any)?.made ?? 0));
    } finally { setBusy(""); }
  }

  function reset() { setEpisodeId(null); setAngles([]); setAngle(""); setTopic(""); setScriptDraft(""); }

  if (!episodeId) {
    return (
      <div className="px-6 md:px-10 py-8 max-w-[820px] mx-auto">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Estúdio</div>
        <h1 className="font-display text-4xl mt-1 mb-1">Criar episódio</h1>
        <p className="text-sm text-muted-foreground mb-6">Comece pelo tema. A IA sugere ângulos, escreve o roteiro e te guia no passo a passo.</p>
        <div className="panel p-6">
          <label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-heading">Tema do episódio</label>
          <textarea value={topic} onChange={(ev) => setTopic(ev.target.value)} placeholder="Ex.: A última carta de Napoleão antes de Santa Helena"
            className="w-full mt-2 min-h-[90px] rounded-xl border-2 border-border bg-input p-3 text-[15px] focus:outline-none" />
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={suggestAngles} disabled={!!busy} className="ghost-btn px-5 py-3 text-sm inline-flex items-center gap-2">
              {busy === "angles" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Sugerir ângulos
            </button>
            <button onClick={startEpisode} disabled={!!busy} className="gold-btn px-6 py-3 text-sm inline-flex items-center gap-2">
              {(busy === "start" || busy === "script") ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Começar episódio
            </button>
          </div>
          {angles.length > 0 && (
            <div className="mt-6">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-heading mb-2">Escolha um ângulo (opcional)</div>
              <div className="grid sm:grid-cols-2 gap-3">
                {angles.map((a, i) => (
                  <button key={i} onClick={() => setAngle(a)} className="text-left panel-inset hover-lift p-4" style={{ borderColor: "var(--border)", borderWidth: angle === a ? 3 : 2, background: angle === a ? "var(--panel-2)" : undefined }}>
                    <div className="text-[10px] uppercase tracking-wider font-heading" style={{ color: "var(--ice)" }}>Ângulo {i + 1}</div>
                    <div className="text-sm mt-1 leading-snug font-medium">{a}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const hasScript = !!e?.script;
  const hasNarr = !!e?.narration_url;
  const hasVideo = !!e?.video_url;
  const rendering = e?.status === "generating";
  const isPub = e?.status === "published";
  const done = (b: boolean) => b
    ? <span className="pill" style={{ background: "var(--success)", color: "#fff" }}><Check size={11} /> Pronto</span>
    : <span className="pill" style={{ background: "var(--panel-2)" }}>Pendente</span>;

  return (
    <div className="px-6 md:px-10 py-8 max-w-[900px] mx-auto">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Episódio</div>
          <h1 className="font-display text-3xl mt-1 leading-tight">{e?.title ?? topic}</h1>
        </div>
        <button onClick={reset} className="ghost-btn px-4 py-2 text-sm inline-flex items-center gap-2"><RotateCcw size={14} /> Novo</button>
      </div>

      <Stage n={1} icon={<FileText size={18} />} title="Roteiro" status={done(hasScript)}>
        {!hasScript ? (
          <button onClick={() => genScript()} disabled={!!busy} className="gold-btn px-5 py-3 text-sm inline-flex items-center gap-2">
            {busy === "script" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Gerar roteiro (IA)
          </button>
        ) : (
          <>
            <textarea value={scriptDraft} onChange={(ev) => setScriptDraft(ev.target.value)} onBlur={saveScript}
              className="w-full min-h-[160px] rounded-xl border-2 border-border bg-input p-3 text-sm font-mono leading-relaxed" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => genScript()} disabled={!!busy} className="ghost-btn px-4 py-2 text-xs inline-flex items-center gap-2">{busy === "script" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Regerar</button>
            </div>
          </>
        )}
      </Stage>

      <Stage n={2} icon={<Mic size={18} />} title="Narração" status={done(hasNarr)} locked={!hasScript}>
        {!hasScript ? <Hint>Gere o roteiro primeiro.</Hint> :
          <button onClick={genNarration} disabled={!!busy} className="gold-btn px-5 py-3 text-sm inline-flex items-center gap-2">
            {busy === "narration" ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />} {hasNarr ? "Regerar narração" : "Gerar narração (ElevenLabs)"}
          </button>}
      </Stage>

      <Stage n={3} icon={<Clapperboard size={18} />} title="Vídeo" locked={!hasNarr}
        status={hasVideo ? done(true) : rendering ? <span className="pill" style={{ background: "var(--ice)", color: "#fff" }}><Loader2 size={11} className="animate-spin" /> Renderizando</span> : done(false)}>
        {!hasNarr ? <Hint>Gere a narração primeiro.</Hint> :
          hasVideo ? (
            <div className="flex items-center gap-3">
              <div className="h-16 w-12 rounded-lg border-2 border-border bg-black grid place-items-center"><Play size={18} className="text-[var(--primary)]" fill="currentColor" /></div>
              <div className="text-sm">Vídeo pronto. <button onClick={render} className="underline font-semibold">renderizar de novo</button></div>
            </div>
          ) : rendering ? (
            <Hint>Renderizando… deixe o <b>worker</b> rodando na sua máquina. Esta tela atualiza sozinha.</Hint>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={genAssets} disabled={!!busy} className="ghost-btn px-5 py-3 text-sm inline-flex items-center gap-2">
                {busy === "assets" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Gerar imagens (IA)
              </button>
              <button onClick={render} disabled={!!busy} className="gold-btn px-5 py-3 text-sm inline-flex items-center gap-2">
                {busy === "render" ? <Loader2 size={16} className="animate-spin" /> : <Clapperboard size={16} />} Renderizar vídeo
              </button>
            </div>
          )}
      </Stage>

      <Stage n={4} icon={<Send size={18} />} title="Publicar" status={done(isPub)} locked={!hasVideo}>
        {!hasVideo ? <Hint>Renderize o vídeo primeiro. (No X dá pra postar texto antes, mas o ideal é com vídeo.)</Hint> :
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {NETWORKS.map((n) => {
                const sel = selectedNets.includes(n);
                return (
                  <button key={n} onClick={() => setSelectedNets((p) => sel ? p.filter((x) => x !== n) : [...p, n])}
                    className="rounded-lg px-3 py-2 text-xs font-heading uppercase tracking-wider inline-flex items-center gap-2 border-2"
                    style={{ background: sel ? "var(--primary)" : "var(--panel)", borderColor: "var(--border)", color: "var(--foreground)", boxShadow: sel ? "3px 3px 0 0 var(--border)" : "none" }}>
                    <NetworkBadge network={n} /> {networkLabel(n)}
                  </button>
                );
              })}
            </div>
            <button onClick={publish} disabled={!!busy || selectedNets.length === 0} className="gold-btn px-6 py-3 text-sm inline-flex items-center gap-2">
              {busy === "publish" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Publicar agora
            </button>
          </>}
      </Stage>
    </div>
  );
}

function Stage({ n, icon, title, status, locked, children }: { n: number; icon: any; title: string; status: any; locked?: boolean; children: any }) {
  return (
    <div className="panel p-5 mb-4" style={{ opacity: locked ? 0.6 : 1 }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl border-2 border-border grid place-items-center font-display text-lg" style={{ background: "var(--primary)" }}>{locked ? <Lock size={16} /> : n}</div>
        <div className="flex items-center gap-2 flex-1"><span>{icon}</span><h2 className="font-display text-xl">{title}</h2></div>
        {status}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Hint({ children }: { children: any }) {
  return <div className="text-sm text-muted-foreground">{children}</div>;
}
