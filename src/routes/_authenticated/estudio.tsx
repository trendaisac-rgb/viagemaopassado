import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, ChevronRight, Wand2, FileText, Hash, Mic, Cpu, Play, Send, CalendarClock } from "lucide-react";
import { NETWORKS, networkLabel, NetworkBadge } from "@/components/NetworkBadge";

export const Route = createFileRoute("/_authenticated/estudio")({
  head: () => ({ meta: [{ title: "Estúdio · Viagem ao Passado" }] }),
  component: EstudioPage,
});

type Step = 0|1|2|3|4|5;
const steps = [
  { key: 0, label: "Tema",      icon: Wand2 },
  { key: 1, label: "Roteiro",   icon: FileText },
  { key: 2, label: "Legenda",   icon: Hash },
  { key: 3, label: "Voz",       icon: Mic },
  { key: 4, label: "Geração",   icon: Cpu },
  { key: 5, label: "Publicar",  icon: Send },
] as const;

function EstudioPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [busy, setBusy] = useState(false);

  // state
  const [topic, setTopic] = useState("");
  const [angles, setAngles] = useState<string[]>([]);
  const [angle, setAngle] = useState("");
  const [script, setScript] = useState("");
  const [factChecks, setFactChecks] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [voice, setVoice] = useState("Victor Power PT-BR");
  const [pace, setPace] = useState("Médio");
  const [duration, setDuration] = useState(45);
  const [progressStep, setProgressStep] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [episodeId, setEpisodeId] = useState<string | null>(null);
  const [selectedNets, setSelectedNets] = useState<string[]>(["youtube","instagram","tiktok"]);

  async function callAi(kind: "angles"|"script"|"caption", input: any) {
    const { data, error } = await supabase.functions.invoke("ai-generate", { body: { kind, input } });
    if (error) throw new Error(error.message);
    return data;
  }

  async function suggestAngles() {
    if (!topic.trim()) { toast.error("Digite um tema primeiro."); return; }
    setBusy(true);
    try {
      const r = await callAi("angles", { topic });
      setAngles(r.angles ?? []);
      toast.success("Ângulos gerados!");
    } catch (e: any) { toast.error(e.message ?? "Falha na IA"); }
    finally { setBusy(false); }
  }

  async function generateScript() {
    if (!angle) { toast.error("Escolha um ângulo."); return; }
    setBusy(true);
    try {
      const r = await callAi("script", { topic, angle, duration_s: duration });
      setScript(r.script ?? "");
      setFactChecks(r.fact_checks ?? []);
      setStep(1);
    } catch (e: any) { toast.error(e.message ?? "Falha na IA"); }
    finally { setBusy(false); }
  }

  async function generateCaption() {
    setBusy(true);
    try {
      const r = await callAi("caption", { topic, angle, script });
      setCaption(r.caption ?? "");
      setHashtags(r.hashtags ?? []);
      setStep(2);
    } catch (e: any) { toast.error(e.message ?? "Falha na IA"); }
    finally { setBusy(false); }
  }

  async function startRender() {
    setBusy(true);
    setStep(4);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase.from("episodes").insert({
        user_id: user.id,
        title: angle || topic,
        topic, angle, script, caption, hashtags, voice, duration_s: duration,
        status: "generating", progress_step: "roteiro", progress_pct: 10,
      }).select().single();
      if (error) throw error;
      setEpisodeId(data.id);

      // Simulated progressive render
      const stages = [
        { step: "roteiro",   pct: 20 },
        { step: "narração",  pct: 40 },
        { step: "cenas",     pct: 65 },
        { step: "render",    pct: 85 },
        { step: "legendas",  pct: 100 },
      ];
      for (const s of stages) {
        setProgressStep(s.step); setProgressPct(s.pct);
        await supabase.from("episodes").update({ progress_step: s.step, progress_pct: s.pct }).eq("id", data.id);
        await new Promise(r => setTimeout(r, 900));
      }
      await supabase.from("episodes").update({ status: "ready", progress_step: "pronto", progress_pct: 100 }).eq("id", data.id);
      setStep(5);
      toast.success("Vídeo pronto!");
    } catch (e: any) { toast.error(e.message ?? "Falha na geração"); setStep(3); }
    finally { setBusy(false); }
  }

  async function publishNow() {
    if (!episodeId || selectedNets.length === 0) return;
    setBusy(true);
    const publishers: Record<string, string> = { youtube: "youtube-publish", x: "x-publish" };
    let ok = 0;
    try {
      for (const n of selectedNets) {
        const fn = publishers[n];
        if (!fn) { toast.message(`${networkLabel(n as any)}: publicação direta em breve.`); continue; }
        const { data, error } = await supabase.functions.invoke(fn, { body: { episode_id: episodeId } });
        if (error) {
          let msg = error.message;
          try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* ignore */ }
          toast.error(`${networkLabel(n as any)}: ${msg}`);
          continue;
        }
        ok++;
        toast.success(`${networkLabel(n as any)}: publicado${(data as any)?.url ? " — " + (data as any).url : ""}.`);
      }
      if (ok > 0) nav({ to: "/painel" });
    } catch (e: any) { toast.error(e.message ?? "Falha"); }
    finally { setBusy(false); }
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1200px] mx-auto">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Estúdio</div>
        <h1 className="font-display text-4xl mt-1">Novo episódio</h1>
      </header>

      {/* Stepper */}
      <ol className="flex items-center gap-2 mb-7 overflow-x-auto scrollbar-thin pb-2">
        {steps.map((s, idx) => {
          const active = s.key === step;
          const done = s.key < step;
          const Icon = s.icon;
          return (
            <li key={s.key} className="flex items-center gap-2 shrink-0">
              <button onClick={()=> (done || active) && setStep(s.key as Step)}
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-heading uppercase tracking-wider transition-colors"
                style={{
                  background: active ? "var(--primary)" : done ? "rgba(57,192,122,0.12)" : "var(--panel-2)",
                  color: active ? "var(--primary-foreground)" : done ? "var(--success)" : "var(--muted-foreground)",
                  border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                }}>
                {done ? <Check size={12}/> : <Icon size={12}/>} {s.label}
              </button>
              {idx < steps.length - 1 && <ChevronRight size={14} className="text-border"/>}
            </li>
          );
        })}
      </ol>

      <div className="panel p-7">
        {step === 0 && (
          <div className="space-y-5">
            <Field label="Tema do episódio">
              <textarea className="ipt min-h-[90px]" value={topic} onChange={e=>setTopic(e.target.value)}
                placeholder="Ex: A última carta de Napoleão antes do exílio em Santa Helena"/>
            </Field>
            <button onClick={suggestAngles} disabled={busy} className="gold-btn px-5 py-2.5 text-sm inline-flex items-center gap-2">
              {busy ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
              Sugerir ângulos virais
            </button>

            {angles.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-heading mb-2">Escolha um ângulo</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {angles.map((a, i) => (
                    <button key={i} onClick={()=>setAngle(a)} className="text-left panel-inset hover-lift p-4"
                      style={{ borderColor: angle===a ? "var(--primary)" : undefined }}>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--primary)] font-heading">Ângulo {i+1}</div>
                      <div className="text-sm mt-1 leading-snug">{a}</div>
                    </button>
                  ))}
                </div>
                <button onClick={generateScript} disabled={!angle || busy}
                  className="gold-btn mt-5 px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50">
                  {busy ? <Loader2 size={14} className="animate-spin"/> : <FileText size={14}/>}
                  Gerar roteiro
                </button>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Field label="Roteiro (editável)">
                <textarea className="ipt min-h-[420px] font-mono text-sm leading-relaxed"
                  value={script} onChange={e=>setScript(e.target.value)}/>
              </Field>
              <button onClick={generateCaption} disabled={busy}
                className="gold-btn mt-4 px-5 py-2.5 text-sm inline-flex items-center gap-2">
                {busy ? <Loader2 size={14} className="animate-spin"/> : <Hash size={14}/>}
                Gerar legenda & hashtags
              </button>
            </div>
            <aside className="panel-inset p-4 h-fit">
              <div className="font-heading text-sm flex items-center gap-2 mb-3">
                <Check size={14} className="text-[var(--success)]"/> Fact-check
              </div>
              <ul className="space-y-2">
                {factChecks.length === 0 && <li className="text-xs text-muted-foreground">Nenhuma verificação.</li>}
                {factChecks.map((f, i) => (
                  <li key={i} className="text-xs flex gap-2">
                    <Check size={14} className="text-[var(--success)] shrink-0 mt-0.5"/>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <Field label="Legenda final">
              <textarea className="ipt min-h-[140px]" value={caption} onChange={e=>setCaption(e.target.value)}/>
            </Field>
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-heading mb-2">Hashtags</div>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((h, i) => (
                  <span key={i} className="pill" style={{ background: "rgba(127,178,255,0.12)", color: "var(--ice)" }}>
                    {h.startsWith("#") ? h : `#${h}`}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={()=>setStep(3)} className="gold-btn px-5 py-2.5 text-sm inline-flex items-center gap-2">
              <Mic size={14}/> Configurar voz
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Field label="Voz">
                <select className="ipt" value={voice} onChange={e=>setVoice(e.target.value)}>
                  <option>Victor Power PT-BR</option>
                  <option>Narrador Cinematográfico PT-BR</option>
                  <option>Documental Feminino PT-BR</option>
                </select>
              </Field>
              <Field label="Ritmo">
                <select className="ipt" value={pace} onChange={e=>setPace(e.target.value)}>
                  <option>Lento</option><option>Médio</option><option>Acelerado</option>
                </select>
              </Field>
              <Field label="Duração alvo (segundos)">
                <input className="ipt" type="number" min={20} max={90} value={duration} onChange={e=>setDuration(+e.target.value)}/>
              </Field>
            </div>
            <div className="panel-inset p-5">
              <div className="font-heading text-sm mb-2">Identidade da marca</div>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• Formato 9:16, qualidade cinemática</li>
                <li>• Corte a cada 3–5s · cada corte único</li>
                <li>• Hook nos primeiros 3 segundos</li>
                <li>• Legendas grandes, paleta dourada</li>
                <li>• Final com gancho para próximo episódio</li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <button onClick={startRender} disabled={busy} className="gold-btn px-5 py-2.5 text-sm inline-flex items-center gap-2">
                <Cpu size={14}/> Iniciar geração
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="font-heading text-lg">Gerando episódio…</div>
            <div className="panel-inset p-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span className="uppercase tracking-wider font-heading">Etapa: {progressStep || "preparando"}</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--input)] overflow-hidden">
                <div className="h-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, var(--primary), var(--primary-hover))" }}/>
              </div>
              <ul className="mt-5 grid grid-cols-5 gap-2 text-[10px] uppercase tracking-wider font-heading">
                {["roteiro","narração","cenas","render","legendas"].map((s, i) => {
                  const done = progressPct >= (i+1)*20;
                  return (
                    <li key={s} className="flex flex-col items-center gap-1"
                      style={{ color: done ? "var(--primary)" : "var(--muted-foreground)" }}>
                      <div className="h-6 w-6 rounded-full flex items-center justify-center border"
                        style={{ borderColor: done ? "var(--primary)" : "var(--border)" }}>
                        {done ? <Check size={12}/> : i+1}
                      </div>
                      {s}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="aspect-[9/16] rounded-xl overflow-hidden border border-border bg-black flex items-center justify-center relative">
                <div className="absolute inset-0 opacity-60"
                  style={{ background: "radial-gradient(circle at 30% 30%, rgba(233,184,74,0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(127,178,255,0.2), transparent 55%)" }}/>
                <div className="relative h-14 w-14 rounded-full bg-black/40 backdrop-blur border border-white/20 flex items-center justify-center">
                  <Play size={24} className="text-[var(--primary)]" fill="currentColor"/>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <Field label="Legenda final"><textarea className="ipt min-h-[100px]" value={caption} readOnly/></Field>
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-heading mb-2">Publicar em</div>
                <div className="flex flex-wrap gap-2">
                  {NETWORKS.map(n => {
                    const sel = selectedNets.includes(n);
                    return (
                      <button key={n} onClick={()=>setSelectedNets(p => sel ? p.filter(x=>x!==n) : [...p, n])}
                        className="rounded-md px-3 py-2 text-xs font-heading uppercase tracking-wider"
                        style={{
                          background: sel ? "var(--primary)" : "var(--panel-2)",
                          color: sel ? "var(--primary-foreground)" : "var(--muted-foreground)",
                          border: `1px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                        }}>
                        <span className="inline-flex items-center gap-2">
                          <NetworkBadge network={n}/> {networkLabel(n)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={publishNow} disabled={busy} className="gold-btn px-5 py-2.5 text-sm inline-flex items-center gap-2">
                  {busy && <Loader2 size={14} className="animate-spin"/>}<Send size={14}/> Publicar agora
                </button>
                <button onClick={()=>{ toast.success("Episódio salvo. Agende em Agenda."); nav({to:"/agenda"}); }}
                  className="ghost-btn px-5 py-2.5 text-sm inline-flex items-center gap-2">
                  <CalendarClock size={14}/> Agendar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        .ipt { background: var(--input); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 14px; color: var(--foreground); width: 100%; transition: border-color .15s ease, box-shadow .15s ease; }
        .ipt:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(233,184,74,0.15); }
        select.ipt { appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--muted-foreground) 50%), linear-gradient(135deg, var(--muted-foreground) 50%, transparent 50%); background-position: calc(100% - 18px) 16px, calc(100% - 13px) 16px; background-size: 5px 5px; background-repeat: no-repeat; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-heading">{label}</span>
      {children}
    </label>
  );
}
