import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { compactNumber } from "@/lib/format";

export type TrendPoint = { date: string; views: number; followers: number };

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E9B84A" stopOpacity={0.5}/>
              <stop offset="100%" stopColor="#E9B84A" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7FB2FF" stopOpacity={0.35}/>
              <stop offset="100%" stopColor="#7FB2FF" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#22304A" strokeDasharray="3 3" vertical={false}/>
          <XAxis dataKey="date" stroke="#8090A8" fontSize={11} tickLine={false} axisLine={false}
            tickFormatter={(v)=> new Date(v).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}/>
          <YAxis stroke="#8090A8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={compactNumber}/>
          <Tooltip
            contentStyle={{ background: "#111A2B", border: "1px solid #22304A", borderRadius: 12, color: "#F3F1EC" }}
            labelFormatter={(v)=> new Date(v).toLocaleDateString("pt-BR",{day:"2-digit",month:"long"})}
            formatter={(v: number, name)=> [compactNumber(v), name === "views" ? "Views" : "Inscritos"]}
          />
          <Area type="monotone" dataKey="views" stroke="#E9B84A" strokeWidth={2} fill="url(#gV)"/>
          <Area type="monotone" dataKey="followers" stroke="#7FB2FF" strokeWidth={2} fill="url(#gF)"/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
