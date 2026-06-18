import type { Database } from "@/integrations/supabase/types";

type EpStatus = Database["public"]["Enums"]["episode_status"];
type PostStatus = Database["public"]["Enums"]["post_status"];

const map: Record<string, { label: string; bg: string; fg: string }> = {
  draft:      { label: "Rascunho",   bg: "#FFF1D9", fg: "#6A6258" },
  generating: { label: "Gerando",    bg: "#3B6BFF", fg: "#FFFFFF" },
  ready:      { label: "Pronto",     bg: "#FFD23F", fg: "#181410" },
  published:  { label: "Publicado",  bg: "#22C58B", fg: "#FFFFFF" },
  failed:     { label: "Falhou",     bg: "#FF5A4D", fg: "#FFFFFF" },
  scheduled:  { label: "Agendado",   bg: "#9B5CFF", fg: "#FFFFFF" },
  publishing: { label: "Publicando", bg: "#FFD23F", fg: "#181410" },
};

export function StatusPill({ status }: { status: EpStatus | PostStatus | string }) {
  const c = map[status] ?? map.draft;
  return <span className="pill" style={{ background: c.bg, color: c.fg }}>{c.label}</span>;
}
