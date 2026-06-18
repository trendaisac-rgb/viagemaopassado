import { StatusPill } from "./StatusPill";
import { NetworkBadge } from "./NetworkBadge";
import type { Database } from "@/integrations/supabase/types";
import { Play, Clock } from "lucide-react";
import { formatDateBR } from "@/lib/format";

type Ep = Database["public"]["Tables"]["episodes"]["Row"];
type Net = Database["public"]["Enums"]["network_kind"];

export function EpisodeCard({ ep, networks }: { ep: Ep; networks?: Net[] }) {
  return (
    <div className="panel hover-lift overflow-hidden flex flex-col">
      <div className="relative aspect-[9/16] bg-[#05060A] flex items-center justify-center overflow-hidden">
        {ep.thumb_url ? (
          <img src={ep.thumb_url} alt={ep.title} className="h-full w-full object-cover" loading="lazy"/>
        ) : (
          <div className="absolute inset-0 opacity-60"
            style={{ background: "radial-gradient(circle at 30% 30%, rgba(233,184,74,0.25), transparent 60%), radial-gradient(circle at 70% 70%, rgba(127,178,255,0.18), transparent 55%)" }}/>
        )}
        <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur border border-white/10">
          <Play size={20} className="text-[var(--primary)]" fill="currentColor"/>
        </div>
        <div className="absolute top-2 left-2"><StatusPill status={ep.status}/></div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[10px] text-white/80 backdrop-blur">
          <Clock size={10}/>{ep.duration_s}s
        </div>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div className="font-heading text-sm leading-tight line-clamp-2">{ep.title}</div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">{networks?.map(n=> <NetworkBadge key={n} network={n}/>)}</div>
          <div className="text-[10px] text-muted-foreground">{formatDateBR(ep.created_at)}</div>
        </div>
      </div>
    </div>
  );
}
