import { compactNumber, percent } from "@/lib/format";
import { TrendingUp, TrendingDown } from "lucide-react";

export function KpiCard({
  label, value, delta, hint,
}: { label: string; value: number; delta?: number; hint?: string }) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="panel hover-lift p-5">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-heading">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="font-display text-5xl leading-none">{compactNumber(value)}</div>
        {delta != null && (
          <div className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: positive ? "var(--success)" : "var(--blood)" }}>
            {positive ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
            {percent(delta)}
          </div>
        )}
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
