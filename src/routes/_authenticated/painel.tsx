import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/KpiCard";
import { EpisodeCard } from "@/components/EpisodeCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { NetworkBadge } from "@/components/NetworkBadge";
import { Sparkles, Film, CalendarClock, Clapperboard, Lightbulb } from "lucide-react";
import { formatDateTimeBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel · Viagem ao Passado" }] }),
  component: PainelPage,
});

function PainelPage() {
  const dash = useQuery({
    queryKey: ["painel"],
    queryFn: async () => {
      const [eps, ideas, rjobs, sched] = await Promise.all([
        supabase.from("episodes").select("*").order("created_at", { ascending: false }),
        supabase.from("content_ideas").select("id").eq("status", "suggested"),
        supabase.from("render_jobs").select("id").in("status", ["queued", "rendering"]),
        supabase.from("scheduled_posts").select("*, episodes(title)").gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(5),
      ]);
      const episodes = eps.data ?? [];
      return {
        episodes,
        ideasCount: ideas.data?.length ?? 0,
        renderCount: rjobs.data?.length ?? 0,
        scheduled: sched.data ?? [],
        prontos: episodes.filter((e) => e.status === "ready").length,
        publicados: episodes.filter((e) => e.status === "published").length,
        producao: episodes.filter((e) => e.status === "draft" || e.status === "generating").length,
      };
    },
  });
  const d = dash.data;

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Painel</div>
          <h1 className="font-display text-4xl mt-1">Bom dia, operador.</h1>
          <p className="text-sm text-muted-foreground mt-1">Seu estúdio de história em vídeo, num lugar só.</p>
        </div>
        <Link to="/estudio" className="gold-btn px-5 py-2.5 text-sm inline-flex items-center gap-2"><Sparkles size={16} /> Novo episódio</Link>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Ideias na fila" value={d?.ideasCount ?? 0} hint="sugestões pra aprovar" />
        <KpiCard label="Em produção" value={d?.producao ?? 0} hint="rascunho + gerando" />
        <KpiCard label="Prontos" value={d?.prontos ?? 0} hint="pra publicar" />
        <KpiCard label="Publicados" value={d?.publicados ?? 0} />
      </div>

      {(d?.renderCount ?? 0) > 0 && (
        <div className="panel-inset mt-4 p-4 flex items-center gap-3 text-sm">
          <Clapperboard size={18} className="text-[var(--primary)]" />
          <b>{d?.renderCount}</b> {d?.renderCount === 1 ? "vídeo" : "vídeos"} na fila de render — deixe o worker rodando.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <section className="panel p-5 lg:col-span-2">
          <h2 className="font-display text-xl mb-3 flex items-center gap-2"><Film size={18} className="text-[var(--primary)]" /> Últimos episódios</h2>
          {dash.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[9/16] skeleton" />)}</div>
          ) : (d?.episodes.length ?? 0) === 0 ? (
            <EmptyState title="Sem episódios ainda" description="Crie o primeiro no Estúdio." action={<Link to="/estudio" className="gold-btn px-4 py-2 text-sm">Criar episódio</Link>} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {d!.episodes.slice(0, 8).map((ep) => <EpisodeCard key={ep.id} ep={ep} />)}
            </div>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="font-display text-xl mb-3 flex items-center gap-2"><CalendarClock size={18} className="text-[var(--primary)]" /> Próximas publicações</h2>
          {(d?.scheduled.length ?? 0) === 0 ? (
            <EmptyState icon={<Lightbulb size={24} />} title="Nada agendado" description="Publique ou agende um episódio pronto." />
          ) : (
            <ul className="flex flex-col divide-y-2 divide-border">
              {d!.scheduled.map((s: any) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <div className="h-12 w-9 rounded-md bg-[#05060A] border-2 border-border flex items-center justify-center text-[var(--primary)] text-[9px] font-bold">9:16</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{s.episodes?.title ?? "Episódio"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{formatDateTimeBR(s.scheduled_at)}</div>
                  </div>
                  <NetworkBadge network={s.network} />
                  <StatusPill status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
