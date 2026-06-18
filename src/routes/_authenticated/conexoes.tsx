import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NETWORKS, NetworkBadge, networkLabel } from "@/components/NetworkBadge";
import { toast } from "sonner";
import { Plug, Check, Loader2, KeyRound, Copy, ExternalLink } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Net = Database["public"]["Enums"]["network_kind"];

export const Route = createFileRoute("/_authenticated/conexoes")({
  head: () => ({ meta: [{ title: "Conexões · Viagem ao Passado" }] }),
  component: Page,
});

const CALLBACK = "https://nkxfoibhbfxyfgdnlycb.supabase.co/functions/v1/social-oauth-callback";

const notes: Record<Net, string> = {
  youtube: "Grátis. Comece por aqui. App não verificado sobe vídeo como privado até a revisão do Google.",
  x: "API paga (~US$0,015/post). Texto e vídeo nativo prontos.",
  instagram: "Conta Business + revisão da Meta para publicar (semanas).",
  tiktok: "Auditoria do app (semanas). Antes disso, posts ficam privados.",
};

const appHelp: Record<Net, { secretLabel: string; where: string; link: string }> = {
  youtube: { secretLabel: "Client Secret", where: "Google Cloud → Credenciais → OAuth client (Web)", link: "https://console.cloud.google.com/apis/credentials" },
  x: { secretLabel: "Client Secret", where: "developer.x.com → seu App → Keys and tokens (OAuth 2.0)", link: "https://developer.x.com/en/portal/dashboard" },
  instagram: { secretLabel: "App Secret", where: "Meta for Developers → seu app → Instagram", link: "https://developers.facebook.com/apps/" },
  tiktok: { secretLabel: "Client Secret", where: "TikTok for Developers → seu app → Content Posting API", link: "https://developers.tiktok.com/" },
};

function Page() {
  const qc = useQueryClient();
  const [forms, setForms] = useState<Record<string, { id: string; secret: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data: networks, isLoading } = useQuery({
    queryKey: ["networks"],
    queryFn: async () => (await supabase.from("networks").select("*")).data ?? [],
  });

  const { data: configured } = useQuery({
    queryKey: ["int-status"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("integrations", { body: { action: "status" } });
      return ((data as any)?.configured ?? {}) as Record<string, boolean>;
    },
  });

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const connected = sp.get("connected");
    const err = sp.get("error");
    if (connected) { toast.success(`${networkLabel(connected as Net)} conectado.`); qc.invalidateQueries({ queryKey: ["networks"] }); }
    else if (err) { toast.error(`Falha ao conectar: ${err}`); }
    if (connected || err) window.history.replaceState({}, "", "/conexoes");
  }, [qc]);

  async function saveKeys(n: Net) {
    const f = forms[n];
    if (!f?.id || !f?.secret) { toast.error("Preencha Client ID e Secret."); return; }
    setSaving(n);
    try {
      const { error } = await supabase.functions.invoke("integrations", { body: { action: "save", platform: n, client_id: f.id.trim(), client_secret: f.secret.trim() } });
      if (error) throw error;
      toast.success(`${networkLabel(n)}: chaves salvas. Agora clique em Conectar.`);
      setForms(p => ({ ...p, [n]: { id: "", secret: "" } }));
      qc.invalidateQueries({ queryKey: ["int-status"] });
    } catch (e: any) { toast.error(e.message ?? "Falha ao salvar"); }
    finally { setSaving(null); }
  }

  async function connect(n: Net) {
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
    await supabase.from("networks").update({ status: "disconnected", connected_at: null }).eq("id", current.id);
    toast.success("Rede desconectada.");
    qc.invalidateQueries({ queryKey: ["networks"] });
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Conexões</div>
        <h1 className="font-display text-4xl mt-1">Redes sociais</h1>
        <p className="text-sm text-muted-foreground mt-1">1) Cole as chaves do seu app. 2) Clique em Conectar e autorize. Tudo aqui no portal.</p>
      </header>

      <div className="panel p-5 mb-6">
        <div className="flex items-center gap-2 mb-1"><KeyRound size={16} className="text-[var(--primary)]"/><span className="font-heading text-lg">Configurar apps</span></div>
        <p className="text-xs text-muted-foreground mb-3">Cole no callback (redirect URI) de cada app, exatamente:</p>
        <button onClick={() => { navigator.clipboard?.writeText(CALLBACK); toast.success("Callback copiado."); }}
          className="panel-inset px-3 py-2 text-xs font-mono inline-flex items-center gap-2 hover-lift max-w-full overflow-x-auto">
          <Copy size={12}/> {CALLBACK}
        </button>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          {NETWORKS.map(n => {
            const ok = configured?.[n];
            const h = appHelp[n];
            return (
              <div key={n} className="panel-inset p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2"><NetworkBadge network={n}/><span className="font-heading">{networkLabel(n)}</span></div>
                  {ok ? <span className="pill" style={{ background: "rgba(57,192,122,0.14)", color: "var(--success)" }}><Check size={10}/> Configurado</span>
                      : <span className="pill" style={{ background: "var(--panel-2)", color: "var(--muted-foreground)" }}>Faltam chaves</span>}
                </div>
                <input className="ipt mb-2" placeholder={n === "tiktok" ? "Client Key" : "Client ID"}
                  value={forms[n]?.id ?? ""} onChange={e => setForms(p => ({ ...p, [n]: { ...(p[n] ?? { id: "", secret: "" }), id: e.target.value } }))}/>
                <input className="ipt mb-2" type="password" placeholder={h.secretLabel}
                  value={forms[n]?.secret ?? ""} onChange={e => setForms(p => ({ ...p, [n]: { ...(p[n] ?? { id: "", secret: "" }), secret: e.target.value } }))}/>
                <div className="flex items-center justify-between gap-2">
                  <a href={h.link} target="_blank" rel="noreferrer" className="text-[11px] text-[var(--ice)] inline-flex items-center gap-1 hover:underline"><ExternalLink size={11}/> onde pegar</a>
                  <button onClick={() => saveKeys(n)} disabled={saving===n} className="gold-btn px-3 py-1.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-50">
                    {saving===n ? <Loader2 size={12} className="animate-spin"/> : <KeyRound size={12}/>} Salvar chaves
                  </button>
                </div>
                <div className="text-[11px] text-muted-foreground mt-2">{h.where}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {NETWORKS.map(n => {
          const cur = networks?.find(x => x.network === n);
          const connected = cur?.status === "connected";
          const ready = configured?.[n];
          return (
            <div key={n} className="panel p-5 hover-lift">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1"><NetworkBadge network={n}/><span className="font-heading text-lg">{networkLabel(n)}</span></div>
                  <div className="text-xs text-muted-foreground max-w-xs">{notes[n]}</div>
                </div>
                {connected ? <span className="pill" style={{ background: "rgba(57,192,122,0.14)", color: "var(--success)" }}><Check size={10}/> Conectado</span>
                           : <span className="pill" style={{ background: "var(--panel-2)", color: "var(--muted-foreground)" }}>Desconectado</span>}
              </div>
              {connected && cur?.handle && <div className="mt-3 text-sm text-[var(--primary)] font-medium">{cur.handle}</div>}
              {!connected && !ready && <div className="mt-3 text-[11px] text-[var(--primary)]">Cole as chaves acima primeiro ↑</div>}
              <button onClick={() => (connected && cur ? disconnect(cur) : connect(n))} disabled={isLoading || (!connected && !ready)}
                className={`${connected ? "ghost-btn" : "gold-btn"} mt-4 w-full px-4 py-2 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50`}>
                {isLoading ? <Loader2 size={14} className="animate-spin"/> : <Plug size={14}/>}
                {connected ? "Desconectar" : "Conectar"}
              </button>
            </div>
          );
        })}
      </div>
      <style>{`.ipt{background:var(--input);border:1px solid var(--border);border-radius:10px;padding:9px 11px;font-size:13px;color:var(--foreground);width:100%}.ipt:focus{outline:none;border-color:var(--primary)}`}</style>
    </div>
  );
}
