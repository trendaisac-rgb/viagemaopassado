import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Lightbulb, Sparkles, Plus, Check, X, Loader2, Film } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ideias")({
  head: () => ({ meta: [{ title: "Ideias · Viagem ao Passado" }] }),
  component: Page,
});

const FILTERS: [string, string][] = [["suggested","Sugeridas"],["used","Usadas"],["rejected","Descartadas"],["all","Todas"]];

function Page() {
  const qc = useQueryClient();
  const [theme, setTheme] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("suggested");

  const { data, isLoading } = useQuery({
    queryKey: ["ideas"],
    queryFn: async () => (await supabase.from("content_ideas").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function generate() {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("generate-ideas", { body: { count: 3 } });
      if (error) throw error;
      toast.success("Ideias geradas pela IA.");
      qc.invalidateQueries({ queryKey: ["ideas"] });
    } catch (e: any) { toast.error(e.message ?? "Falha ao gerar"); }
    finally { setBusy(false); }
  }

  async function addManual() {
    if (!theme.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("content_ideas").insert({ user_id: user.id, theme: theme.trim(), source: "manual", status: "suggested" });
    setTheme("");
    toast.success("Tema adicionado à fila.");
    qc.invalidateQueries({ queryKey: ["ideas"] });
  }

  async function approve(idea: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("episodes").insert({ user_id: user.id, title: idea.theme, topic: idea.theme, angle: idea.angle ?? null, status: "draft" });
    if (error) { toast.error(error.message); return; }
    await supabase.from("content_ideas").update({ status: "used" }).eq("id", idea.id);
    toast.success("Episódio criado na Biblioteca. Abra o Estúdio para gerar o roteiro/vídeo.");
    qc.invalidateQueries({ queryKey: ["ideas"] });
  }

  async function reject(id: string) {
    await supabase.from("content_ideas").update({ status: "rejected" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["ideas"] });
  }

  const filtered = (data ?? []).filter((i: any) => filter === "all" || i.status === filter);

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Ideias</div>
          <h1 className="font-display text-4xl mt-1">Fila de temas</h1>
          <p className="text-sm text-muted-foreground mt-1">Sugestões automáticas de história + os seus temas. Aprove para virar episódio.</p>
        </div>
        <button onClick={generate} disabled={busy} className="gold-btn px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>} Gerar ideias (IA)
        </button>
      </header>

      <div className="panel p-4 flex flex-wrap gap-3 items-center mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Lightbulb size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={theme} onChange={e=>setTheme(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addManual()}
            placeholder="Sugira um tema (ex: A queda de Constantinopla)…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--input)] border border-border text-sm focus:outline-none focus:border-[var(--primary)]"/>
        </div>
        <button onClick={addManual} className="ghost-btn px-4 py-2 text-sm inline-flex items-center gap-2"><Plus size={14}/> Adicionar</button>
        <div className="flex gap-1 panel-inset p-1">
          {FILTERS.map(([k,l]) => (
            <button key={k} onClick={()=>setFilter(k)} className="px-3 py-1.5 rounded-md text-xs font-heading uppercase tracking-wider"
              style={{ background: filter===k ? "var(--primary)" : "transparent", color: filter===k ? "var(--primary-foreground)" : "var(--muted-foreground)" }}>{l}</button>
          ))}
        </div>
      </div>

      {isLoading ? <div className="space-y-2"><div className="h-16 skeleton"/><div className="h-16 skeleton"/></div>
        : filtered.length === 0 ? (
          <div className="panel p-10 text-center text-muted-foreground">
            <Lightbulb size={28} className="mx-auto mb-2 text-[var(--primary)]"/>
            Nenhuma ideia aqui. Clique em <b>Gerar ideias (IA)</b> ou adicione um tema.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((i: any) => (
              <li key={i.id} className="panel p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-base">{i.theme}</span>
                    <span className="pill" style={{ background: "var(--panel-2)", color: i.source==="auto" ? "var(--ice)" : "var(--muted-foreground)" }}>{i.source === "auto" ? "IA" : "Você"}</span>
                  </div>
                  {i.angle && <div className="text-sm text-muted-foreground mt-1">{i.angle}</div>}
                </div>
                {i.status === "suggested" ? (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={()=>approve(i)} className="gold-btn px-3 py-1.5 text-xs inline-flex items-center gap-1.5"><Check size={12}/> Aprovar</button>
                    <button onClick={()=>reject(i.id)} className="ghost-btn px-2.5 py-1.5 text-xs"><X size={12}/></button>
                  </div>
                ) : i.status === "used" ? (
                  <Link to="/episodios" className="ghost-btn px-3 py-1.5 text-xs inline-flex items-center gap-1.5 shrink-0"><Film size={12}/> Ver</Link>
                ) : (
                  <span className="pill shrink-0" style={{ background: "var(--panel-2)", color: "var(--muted-foreground)" }}>Descartada</span>
                )}
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
