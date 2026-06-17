import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NetworkBadge } from "@/components/NetworkBadge";
import { compactNumber, percent } from "@/lib/format";
import { Trophy, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/analises")({
  head: () => ({ meta: [{ title: "Análises · Viagem ao Passado" }] }),
  component: Page,
});

type SortKey = "views"|"likes"|"comments"|"shares"|"retention_pct";

function Page() {
  const [sort, setSort] = useState<SortKey>("views");
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [met, eps] = await Promise.all([
        supabase.from("metrics").select("*"),
        supabase.from("episodes").select("id, title, thumb_url"),
      ]);
      return { metrics: met.data ?? [], episodes: eps.data ?? [] };
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const epMap = new Map(data.episodes.map(e => [e.id, e]));
    const agg = new Map<string, { ep_id: string; title: string; views: number; likes: number; comments: number; shares: number; retention_pct: number; n: number }>();
    for (const m of data.metrics) {
      if (!m.episode_id) continue;
      const ep = epMap.get(m.episode_id); if (!ep) continue;
      const cur = agg.get(m.episode_id) ?? { ep_id: m.episode_id, title: ep.title, views: 0, likes: 0, comments: 0, shares: 0, retention_pct: 0, n: 0 };
      cur.views += m.views ?? 0; cur.likes += m.likes ?? 0; cur.comments += m.comments ?? 0; cur.shares += m.shares ?? 0;
      cur.retention_pct += Number(m.retention_pct ?? 0); cur.n += 1;
      agg.set(m.episode_id, cur);
    }
    return Array.from(agg.values()).map(r => ({ ...r, retention_pct: r.n ? r.retention_pct/r.n : 0 }))
      .sort((a,b)=> (b as any)[sort] - (a as any)[sort]);
  }, [data, sort]);

  const best = rows[0];

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1300px] mx-auto">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Análises</div>
        <h1 className="font-display text-4xl mt-1">Desempenho</h1>
      </header>

      {best && (
        <div className="panel p-5 mb-5 flex items-center gap-4" style={{ background: "linear-gradient(135deg, rgba(233,184,74,0.10), transparent 60%)" }}>
          <div className="h-12 w-12 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center">
            <Trophy size={22}/>
          </div>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--primary)] font-heading">Melhor do mês</div>
            <div className="font-heading text-lg">{best.title}</div>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl">{compactNumber(best.views)}</div>
            <div className="text-xs text-muted-foreground">views totais</div>
          </div>
        </div>
      )}

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground font-heading bg-[var(--panel-2)]">
            <tr>
              <th className="text-left px-4 py-3">Episódio</th>
              {(["views","likes","comments","shares","retention_pct"] as const).map(k => (
                <th key={k} className="text-right px-4 py-3">
                  <button onClick={()=>setSort(k)} className="inline-flex items-center gap-1 hover:text-[var(--primary)]"
                    style={{ color: sort===k ? "var(--primary)" : undefined }}>
                    {k === "retention_pct" ? "Retenção" : k} <ArrowUpDown size={12}/>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-6"><div className="h-24 skeleton"/></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center p-10 text-muted-foreground">Sem métricas ainda.</td></tr>
            ) : rows.map(r => (
              <tr key={r.ep_id} className="border-t border-border hover:bg-[var(--panel-2)]/50">
                <td className="px-4 py-3 max-w-[420px] truncate">{r.title}</td>
                <td className="px-4 py-3 text-right font-mono">{compactNumber(r.views)}</td>
                <td className="px-4 py-3 text-right font-mono">{compactNumber(r.likes)}</td>
                <td className="px-4 py-3 text-right font-mono">{compactNumber(r.comments)}</td>
                <td className="px-4 py-3 text-right font-mono">{compactNumber(r.shares)}</td>
                <td className="px-4 py-3 text-right font-mono">{percent(r.retention_pct, 1).replace("+","")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
