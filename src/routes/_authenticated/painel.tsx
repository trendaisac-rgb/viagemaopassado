import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/KpiCard";
import { TrendChart, type TrendPoint } from "@/components/TrendChart";
import { EpisodeCard } from "@/components/EpisodeCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { NetworkBadge, NETWORKS, networkLabel } from "@/components/NetworkBadge";
import { Sparkles, Film, CalendarClock } from "lucide-react";
import { formatDateTimeBR } from "@/lib/format";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel · Viagem ao Passado" }] }),
  component: PainelPage,
});

function PainelPage() {
  const [netFilter, setNetFilter] = useState<string>("all");

  const dash = useQuery({
    queryKey: ["dashboard", netFilter],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const sinceISO = since.toISOString().slice(0, 10);

      const [epRes, metRes, schedRes] = await Promise.all([
        supabase.from("episodes").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.from("metrics").select("*").gte("date", sinceISO),
        supabase.from("scheduled_posts").select("*, episodes(title, thumb_url)").gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(5),
      ]);

      const episodes = epRes.data ?? [];
      const metrics = (metRes.data ?? []).filter(m => netFilter === "all" || m.network === netFilter);
      const scheduled = schedRes.data ?? [];

      // KPIs
      const views30 = metrics.reduce((a, m) => a + (m.views ?? 0), 0);
      const followers = metrics.length
        ? Math.max(...metrics.map(m => m.followers ?? 0))
        : 0;
      const published = episodes.filter(e => e.status === "published").length;
      const scheduledCount = scheduled.length;

      // Build per-day series
      const byDay = new Map<string, { date: string; views: number; followers: number }>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        byDay.set(key, { date: key, views: 0, followers: 0 });
      }
      for (const m of metrics) {
        const k = m.date;
        const entry = byDay.get(k);
        if (entry) {
          entry.views += m.views ?? 0;
          entry.followers = Math.max(entry.followers, m.followers ?? 0);
        }
      }
      const series: TrendPoint[] = Array.from(byDay.values());

      // Trend % vs prior 30d (placeholder using last 15 vs first 15)
      const half = Math.floor(series.length / 2);
      const sumA = series.slice(0, half).reduce((a, p) => a + p.views, 0);
      const sumB = series.slice(half).reduce((a, p) => a + p.views, 0);
      const trend = sumA === 0 ? (sumB > 0 ? 100 : 0) : ((sumB - sumA) / sumA) * 100;

      return { episodes, scheduled, views30, followers, published, scheduledCount, series, trend };
    },
  });

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Painel</div>
          <h1 className="font-display text-4xl mt-1">Bom dia, operador.</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral dos últimos 30 dias.</p>
        </div>
        <Link to="/estudio" className="gold-btn px-5 py-2.5 text-sm inline-flex items-center gap-2">
          <Sparkles size={16}/> Novo episódio
        </Link>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Inscritos" value={dash.data?.followers ?? 0} delta={8.4} hint="máximo no período"/>
        <KpiCard label="Views 30d" value={dash.data?.views30 ?? 0} delta={dash.data?.trend} hint="soma das redes"/>
        <KpiCard label="Publicados" value={dash.data?.published ?? 0} delta={12.5}/>
        <KpiCard label="Agendados" value={dash.data?.scheduledCount ?? 0} hint="próximas semanas"/>
      </div>

      <section className="panel mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-heading text-lg">Performance</h2>
            <p className="text-xs text-muted-foreground">Views e inscritos por dia · últimos 30 dias</p>
          </div>
          <div className="flex gap-1.5 panel-inset p-1">
            <FilterBtn active={netFilter === "all"} onClick={()=>setNetFilter("all")}>Todas</FilterBtn>
            {NETWORKS.map(n => (
              <FilterBtn key={n} active={netFilter===n} onClick={()=>setNetFilter(n)}>{networkLabel(n)}</FilterBtn>
            ))}
          </div>
        </div>
        {dash.isLoading ? <div className="h-[260px] skeleton"/> : <TrendChart data={dash.data?.series ?? []}/>}
      </section>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <section className="panel p-5">
          <h2 className="font-heading text-lg mb-3 flex items-center gap-2"><CalendarClock size={16} className="text-[var(--primary)]"/> Próximas publicações</h2>
          {dash.isLoading ? <div className="space-y-2"><div className="h-14 skeleton"/><div className="h-14 skeleton"/></div>
            : (dash.data?.scheduled.length ?? 0) === 0 ? (
              <EmptyState title="Nada agendado" description="Crie um episódio no Estúdio para começar."
                action={<Link to="/estudio" className="gold-btn px-4 py-2 text-sm">Abrir Estúdio</Link>}/>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {dash.data!.scheduled.map((s: any) => (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <div className="h-14 w-10 rounded-md bg-[var(--panel-2)] border border-border flex items-center justify-center text-muted-foreground text-xs">9:16</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.episodes?.title ?? "Episódio"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{formatDateTimeBR(s.scheduled_at)}</div>
                    </div>
                    <NetworkBadge network={s.network} withLabel/>
                    <StatusPill status={s.status}/>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <section className="panel p-5">
          <h2 className="font-heading text-lg mb-3 flex items-center gap-2"><Film size={16} className="text-[var(--primary)]"/> Últimos episódios</h2>
          {dash.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[0,1,2,3].map(i => <div key={i} className="aspect-[9/16] skeleton"/>)}
            </div>
          ) : (dash.data?.episodes.length ?? 0) === 0 ? (
            <EmptyState title="Sem episódios" description="Seu primeiro episódio aparecerá aqui."
              action={<Link to="/estudio" className="gold-btn px-4 py-2 text-sm">Criar episódio</Link>}/>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {dash.data!.episodes.slice(0,6).map(ep => <EpisodeCard key={ep.id} ep={ep}/>)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterBtn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-md text-xs font-heading uppercase tracking-wider transition-colors"
      style={{
        background: active ? "var(--primary)" : "transparent",
        color: active ? "var(--primary-foreground)" : "var(--muted-foreground)",
      }}>{children}</button>
  );
}
