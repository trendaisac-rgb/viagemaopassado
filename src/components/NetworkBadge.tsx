import type { Database } from "@/integrations/supabase/types";

type Net = Database["public"]["Enums"]["network_kind"];

const meta: Record<Net, { label: string; color: string; bg: string; letter: string }> = {
  x:         { label: "X",         color: "#F3F1EC", bg: "rgba(243,241,236,0.08)", letter: "𝕏" },
  youtube:   { label: "YouTube",   color: "#FF6B6B", bg: "rgba(177,29,36,0.16)",   letter: "▶" },
  instagram: { label: "Instagram", color: "#E9B84A", bg: "rgba(233,184,74,0.14)",  letter: "◉" },
  tiktok:    { label: "TikTok",    color: "#7FB2FF", bg: "rgba(127,178,255,0.14)", letter: "♪" },
};

export function NetworkBadge({ network, withLabel = false }: { network: Net; withLabel?: boolean }) {
  const m = meta[network];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold"
      style={{ background: m.bg, color: m.color }}>
      <span style={{ fontSize: 12, lineHeight: 1 }}>{m.letter}</span>
      {withLabel && m.label}
    </span>
  );
}

export const NETWORKS: Net[] = ["x", "youtube", "instagram", "tiktok"];
export const networkLabel = (n: Net) => meta[n].label;
