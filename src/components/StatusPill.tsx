import type { Database } from "@/integrations/supabase/types";

type EpStatus = Database["public"]["Enums"]["episode_status"];
type PostStatus = Database["public"]["Enums"]["post_status"];

const map: Record<string, { label: string; bg: string; fg: string; dot: string }> = {
  draft:      { label: "Rascunho",   bg: "rgba(128,144,168,0.12)", fg: "#8090A8", dot: "#8090A8" },
  generating: { label: "Gerando",    bg: "rgba(127,178,255,0.14)", fg: "#7FB2FF", dot: "#7FB2FF" },
  ready:      { label: "Pronto",     bg: "rgba(233,184,74,0.14)",  fg: "#E9B84A", dot: "#E9B84A" },
  published:  { label: "Publicado",  bg: "rgba(57,192,122,0.14)",  fg: "#39C07A", dot: "#39C07A" },
  failed:     { label: "Falhou",     bg: "rgba(177,29,36,0.18)",   fg: "#FF6B6B", dot: "#B11D24" },
  scheduled:  { label: "Agendado",   bg: "rgba(127,178,255,0.14)", fg: "#7FB2FF", dot: "#7FB2FF" },
  publishing: { label: "Publicando", bg: "rgba(233,184,74,0.14)",  fg: "#E9B84A", dot: "#E9B84A" },
};

export function StatusPill({ status }: { status: EpStatus | PostStatus | string }) {
  const c = map[status] ?? map.draft;
  return (
    <span className="pill" style={{ background: c.bg, color: c.fg }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: c.dot, boxShadow: `0 0 8px ${c.dot}` }} />
      {c.label}
    </span>
  );
}
