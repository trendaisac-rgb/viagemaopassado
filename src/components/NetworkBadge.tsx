import type { Database } from "@/integrations/supabase/types";

type Net = Database["public"]["Enums"]["network_kind"];

const meta: Record<Net, { label: string; color: string; bg: string; letter: string }> = {
  x:         { label: "X",         color: "#FFFFFF", bg: "#181410", letter: "𝕏" },
  youtube:   { label: "YouTube",   color: "#FFFFFF", bg: "#FF0033", letter: "▶" },
  instagram: { label: "Instagram", color: "#FFFFFF", bg: "#9B5CFF", letter: "◉" },
  tiktok:    { label: "TikTok",    color: "#181410", bg: "#22D3EE", letter: "♪" },
};

export function NetworkBadge({ network, withLabel = false }: { network: Net; withLabel?: boolean }) {
  const m = meta[network];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold border-2 border-border"
      style={{ background: m.bg, color: m.color }}>
      <span style={{ fontSize: 12, lineHeight: 1 }}>{m.letter}</span>
      {withLabel && m.label}
    </span>
  );
}

export const NETWORKS: Net[] = ["x", "youtube", "instagram", "tiktok"];
export const networkLabel = (n: Net) => meta[n].label;
