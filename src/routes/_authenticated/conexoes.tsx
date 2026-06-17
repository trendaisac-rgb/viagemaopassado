import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NETWORKS, NetworkBadge, networkLabel } from "@/components/NetworkBadge";
import { toast } from "sonner";
import { Plug, Check, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Net = Database["public"]["Enums"]["network_kind"];

export const Route = createFileRoute("/_authenticated/conexoes")({
  head: () => ({ meta: [{ title: "Conexões · Viagem ao Passado" }] }),
  component: Page,
});

const notes: Record<Net, string> = {
  youtube: "OAuth direto (grátis). Shorts até 60s. App não verificado sobe vídeo como privado até a revisão do Google.",
  x: "OAuth pronto, mas a API da X é paga (pay-per-use ~US$0,015/post). Texto OK; vídeo exige fluxo extra.",
  instagram: "Requer conta Business + Página do Facebook + revisão da Meta (semanas).",
  tiktok: "Requer auditoria do app (semanas). Antes disso, posts ficam privados (SELF_ONLY).",
};

function Page() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["networks"],
    queryFn: async () => (await supabase.from("networks").select("*")).data ?? [],
  });

  // Trata o retorno do callback OAuth (?connected=... / ?error=...)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const connected = sp.get("connected");
    const err = sp.get("error");
    if (connected) {
      toast.success(`${networkLabel(connected as Net)} conectado.`);
      qc.invalidateQueries({ queryKey: ["networks"] });
    } else if (err) {
      toast.error(`Falha ao conectar: ${err}`);
    }
    if (connected || err) {
      window.history.replaceState({}, "", "/conexoes");
    }
  }, [qc]);

  async function connect(n: Net) {
    // Inicia o fluxo OAuth real via edge function; redireciona o navegador pro provedor.
    const { data: res, error } = await supabase.functions.invoke("social-oauth-start", { body: { platform: n } });
    if (error) {
      let msg = error.message;
      try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* ignore */ }
      toast.error(msg ?? "Falha ao iniciar conexão.");
      return;
    }
    if (res?.url) { window.location.href = res.url as string; return; }
    toast.error(res?.error ?? "Falha ao iniciar conexão.");
  }

  async function disconnect(current: any) {
    // Marca como desconectado no app. (A revogação do token no provedor fica para uma função dedicada.)
    await supabase.from("networks").update({ status: "disconnected", connected_at: null }).eq("id", current.id);
    toast.success("Rede desconectada.");
    qc.invalidateQueries({ queryKey: ["networks"] });
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Conexões</div>
        <h1 className="font-display text-4xl mt-1">Redes sociais</h1>
        <p className="text-sm text-muted-foreground mt-1">Conecte suas contas para publicar direto. Comece pelo YouTube (grátis).</p>
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
              <button onClick={() => (connected && cur ? disconnect(cur) : connect(n))} disabled={isLoading}
                className={`${connected ? "ghost-btn" : "gold-btn"} mt-4 w-full px-4 py-2 text-sm inline-flex items-center justify-center gap-2`}>
                {isLoading ? <Loader2 size={14} className="animate-spin"/> : <Plug size={14}/>}
                {connected ? "Desconectar" : "Conectar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
