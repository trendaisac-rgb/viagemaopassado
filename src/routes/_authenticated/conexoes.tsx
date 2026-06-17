import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NETWORKS, NetworkBadge, networkLabel } from "@/components/NetworkBadge";
import { toast } from "sonner";
import { Plug, Check } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Net = Database["public"]["Enums"]["network_kind"];

export const Route = createFileRoute("/_authenticated/conexoes")({
  head: () => ({ meta: [{ title: "Conexões · Viagem ao Passado" }] }),
  component: Page,
});

const notes: Record<Net, string> = {
  x: "OAuth direto. Posts em texto e vídeo até 2:20.",
  youtube: "OAuth direto. Shorts até 60s.",
  instagram: "Requer conta Business + revisão da Meta.",
  tiktok: "Requer auditoria para postar diretamente.",
};

function Page() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["networks"],
    queryFn: async () => (await supabase.from("networks").select("*")).data ?? [],
  });

  async function toggle(n: Net, current?: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (current?.status === "connected") {
      await supabase.from("networks").update({ status: "disconnected", connected_at: null }).eq("id", current.id);
      toast.success(`${networkLabel(n)} desconectado.`);
    } else {
      const payload = { user_id: user.id, network: n, status: "connected" as const, handle: `@viagemaopassado`, connected_at: new Date().toISOString() };
      if (current?.id) await supabase.from("networks").update(payload).eq("id", current.id);
      else await supabase.from("networks").insert(payload);
      toast.success(`${networkLabel(n)} conectado.`);
    }
    qc.invalidateQueries({ queryKey: ["networks"] });
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Conexões</div>
        <h1 className="font-display text-4xl mt-1">Redes sociais</h1>
        <p className="text-sm text-muted-foreground mt-1">Conecte suas contas para publicar direto.</p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {NETWORKS.map(n => {
          const cur = data?.find(x => x.network === n);
          const connected = cur?.status === "connected";
          return (
            <div key={n} className="panel p-5 hover-lift">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <NetworkBadge network={n}/>
                    <span className="font-heading text-lg">{networkLabel(n)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground max-w-xs">{notes[n]}</div>
                </div>
                {connected ? (
                  <span className="pill" style={{ background: "rgba(57,192,122,0.14)", color: "var(--success)" }}>
                    <Check size={10}/> Conectado
                  </span>
                ) : (
                  <span className="pill" style={{ background: "var(--panel-2)", color: "var(--muted-foreground)" }}>Desconectado</span>
                )}
              </div>
              {connected && cur?.handle && (
                <div className="mt-3 text-sm text-[var(--primary)] font-medium">{cur.handle}</div>
              )}
              <button onClick={()=>toggle(n, cur)} disabled={isLoading}
                className={`${connected ? "ghost-btn" : "gold-btn"} mt-4 w-full px-4 py-2 text-sm inline-flex items-center justify-center gap-2`}>
                <Plug size={14}/> {connected ? "Desconectar" : "Conectar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
