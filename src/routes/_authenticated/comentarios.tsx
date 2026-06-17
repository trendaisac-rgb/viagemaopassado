import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NetworkBadge, NETWORKS, networkLabel } from "@/components/NetworkBadge";
import { EmptyState } from "@/components/EmptyState";
import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatDateTimeBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/comentarios")({
  head: () => ({ meta: [{ title: "Comentários · Viagem ao Passado" }] }),
  component: Page,
});

const sentMap: Record<string,{ label: string; color: string; bg: string }> = {
  pos: { label: "Positivo", color: "#39C07A", bg: "rgba(57,192,122,0.12)" },
  neu: { label: "Neutro",   color: "#8090A8", bg: "rgba(128,144,168,0.12)" },
  neg: { label: "Negativo", color: "#FF6B6B", bg: "rgba(177,29,36,0.16)" },
};

function Page() {
  const qc = useQueryClient();
  const [net, setNet] = useState<string>("all");
  const [sent, setSent] = useState<string>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["comments"],
    queryFn: async () => (await supabase.from("comments").select("*, episodes(title)").order("created_at", { ascending: false })).data ?? [],
  });
  const filtered = (data ?? []).filter(c =>
    (net === "all" || c.network === net) && (sent === "all" || c.sentiment === sent)
  );
  const counts = NETWORKS.map(n => ({ n, c: (data ?? []).filter(x => x.network === n).length }));

  async function reply(id: string) {
    await supabase.from("comments").update({ replied: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["comments"] });
    toast.success("Marcado como respondido.");
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1200px] mx-auto">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Comentários</div>
        <h1 className="font-display text-4xl mt-1">Caixa unificada</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {counts.map(({ n, c }) => (
          <button key={n} onClick={()=>setNet(net===n?"all":n)} className="panel hover-lift p-4 text-left">
            <div className="flex items-center justify-between">
              <NetworkBadge network={n} withLabel/>
              <span className="font-display text-2xl">{c}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="panel p-3 mb-4 flex flex-wrap gap-2">
        {["all","pos","neu","neg"].map(s => (
          <button key={s} onClick={()=>setSent(s)}
            className="px-3 py-1.5 rounded-md text-xs font-heading uppercase tracking-wider"
            style={{ background: sent===s ? "var(--primary)" : "var(--panel-2)", color: sent===s?"var(--primary-foreground)":"var(--muted-foreground)" }}>
            {s === "all" ? "Todos sentimentos" : sentMap[s].label}
          </button>
        ))}
      </div>

      {isLoading ? <div className="h-40 skeleton"/> :
        filtered.length === 0 ? <EmptyState title="Sem comentários" description="Tudo limpo por aqui."/> : (
        <ul className="space-y-3">
          {filtered.map(c => {
            const s = sentMap[c.sentiment ?? "neu"];
            return (
              <li key={c.id} className="panel p-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-[var(--panel-2)] flex items-center justify-center text-xs font-heading">
                    {c.author[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-sm">{c.author}</span>
                      <NetworkBadge network={c.network}/>
                      <span className="pill" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                      <span className="text-muted-foreground ml-auto">{formatDateTimeBR(c.created_at)}</span>
                    </div>
                    <div className="mt-1.5 text-sm">{c.body}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">em <em>{(c as any).episodes?.title ?? "—"}</em></div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {c.post_url && <a href={c.post_url} target="_blank" rel="noreferrer" className="ghost-btn px-3 py-1.5 text-xs inline-flex items-center gap-1"><ExternalLink size={12}/> Post</a>}
                    {!c.replied ? (
                      <button onClick={()=>reply(c.id)} className="gold-btn px-3 py-1.5 text-xs inline-flex items-center gap-1"><Check size={12}/> Responder</button>
                    ) : (
                      <span className="pill" style={{ background: "rgba(57,192,122,0.14)", color: "var(--success)" }}>Respondido</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
