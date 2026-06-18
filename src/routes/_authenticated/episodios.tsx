import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EpisodeCard } from "@/components/EpisodeCard";
import { EmptyState } from "@/components/EmptyState";
import { Search, Sparkles, Send, Loader2, Mic } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/episodios")({
  head: () => ({ meta: [{ title: "Episódios · Viagem ao Passado" }] }),
  component: EpisodiosPage,
});

const PUBLISHERS: Record<string, string> = {
  youtube: "youtube-publish",
  x: "x-publish",
  instagram: "instagram-publish",
  tiktok: "tiktok-publish",
};

function EpisodiosPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [publishing, setPublishing] = useState<string | null>(null);
  const [narrating, setNarrating] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["episodes-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("episodes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function publishEpisode(episodeId: string) {
    setPublishing(episodeId);
    try {
      const { data: nets } = await supabase.from("networks").select("network,status").eq("status", "connected");
      const connected = (nets ?? []).map((n: any) => n.network);
      if (connected.length === 0) { toast.error("Nenhuma rede conectada. Vá em Conexões."); return; }
      toast.message("Publicando em: " + connected.join(", "));
      for (const net of connected) {
        const fn = PUBLISHERS[net];
        if (!fn) continue;
        const { data: res, error } = await supabase.functions.invoke(fn, { body: { episode_id: episodeId } });
        if (error) {
          let msg = error.message;
          try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* ignore */ }
          toast.error(net + ": " + msg);
        } else {
          toast.success(net + ": publicado" + ((res as any)?.url ? " — " + (res as any).url : ""));
        }
      }
    } finally {
      setPublishing(null);
    }
  }

  async function narrate(episodeId: string) {
    setNarrating(episodeId);
    try {
      const { data: res, error } = await supabase.functions.invoke("generate-narration", { body: { episode_id: episodeId } });
      if (error) {
        let msg = error.message;
        try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* ignore */ }
        toast.error(msg);
      } else { toast.success("Narração gerada (Victor Power)."); }
    } finally { setNarrating(null); }
  }

  const filtered = (data ?? []).filter(e =>
    (status === "all" || e.status === status) &&
    (q === "" || e.title.toLowerCase().includes(q.toLowerCase()))
  );
  const statuses = ["all","draft","generating","ready","published","failed"] as const;

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Episódios</div>
          <h1 className="font-display text-4xl mt-1">Biblioteca</h1>
        </div>
        <Link to="/estudio" className="gold-btn px-5 py-2.5 text-sm inline-flex items-center gap-2"><Sparkles size={16}/> Novo episódio</Link>
      </header>

      <div className="panel p-4 flex flex-wrap gap-3 items-center mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por título…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--input)] border border-border text-sm focus:outline-none focus:border-[var(--primary)]"/>
        </div>
        <div className="flex gap-1 panel-inset p-1">
          {statuses.map(s => (
            <button key={s} onClick={()=>setStatus(s)}
              className="px-3 py-1.5 rounded-md text-xs font-heading uppercase tracking-wider"
              style={{ background: status===s ? "var(--primary)" : "transparent", color: status===s ? "var(--primary-foreground)" : "var(--muted-foreground)" }}>
              {s === "all" ? "Todos" : s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[0,1,2,3,4].map(i => <div key={i} className="aspect-[9/16] skeleton"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Nenhum episódio encontrado" description="Ajuste o filtro ou crie um novo."
          action={<Link to="/estudio" className="gold-btn px-4 py-2 text-sm">Criar episódio</Link>}/>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {filtered.map(ep => (
            <div key={ep.id} className="flex flex-col gap-2">
              <EpisodeCard ep={ep}/>
              <div className="flex gap-1.5">
                <button onClick={()=>narrate(ep.id)} disabled={narrating===ep.id}
                  className="ghost-btn flex-1 px-2 py-1.5 text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {narrating===ep.id ? <Loader2 size={12} className="animate-spin"/> : <Mic size={12}/>} Narração
                </button>
                <button onClick={()=>publishEpisode(ep.id)} disabled={publishing===ep.id}
                  className="gold-btn flex-1 px-2 py-1.5 text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {publishing===ep.id ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} Publicar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
