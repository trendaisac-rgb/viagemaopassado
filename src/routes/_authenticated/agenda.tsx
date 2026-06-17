import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusPill } from "@/components/StatusPill";
import { NetworkBadge } from "@/components/NetworkBadge";
import { formatDateTimeBR } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda · Viagem ao Passado" }] }),
  component: AgendaPage,
});

function AgendaPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["agenda"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_posts")
        .select("*, episodes(title)")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // group by day
  const groups = new Map<string, any[]>();
  for (const p of data ?? []) {
    const key = new Date(p.scheduled_at).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <header className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Agenda</div>
        <h1 className="font-display text-4xl mt-1">Fila de publicação</h1>
      </header>

      {isLoading ? <div className="h-40 skeleton"/> :
        groups.size === 0 ? <EmptyState title="Nada agendado" description="Os próximos posts aparecerão aqui."/> : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([day, items]) => (
            <section key={day} className="panel p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--primary)] font-heading mb-3">{day}</div>
              <ul className="divide-y divide-border">
                {items.map((p: any) => (
                  <li key={p.id} className="flex items-center gap-4 py-3">
                    <div className="text-xs text-muted-foreground w-20 font-mono">{new Date(p.scheduled_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.episodes?.title ?? "Episódio"}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{formatDateTimeBR(p.scheduled_at)}</div>
                    </div>
                    <NetworkBadge network={p.network} withLabel/>
                    <StatusPill status={p.status}/>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
