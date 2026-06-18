import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Wand2, Film, CalendarDays, MessageSquare,
  BarChart3, Plug, Settings, LogOut, Lightbulb,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const items = [
  { to: "/painel",       label: "Painel",      icon: LayoutDashboard },
  { to: "/estudio",      label: "Estúdio",     icon: Wand2 },
  { to: "/ideias",       label: "Ideias",      icon: Lightbulb },
  { to: "/episodios",    label: "Episódios",   icon: Film },
  { to: "/agenda",       label: "Agenda",      icon: CalendarDays },
  { to: "/comentarios",  label: "Comentários", icon: MessageSquare },
  { to: "/analises",     label: "Análises",    icon: BarChart3 },
  { to: "/conexoes",     label: "Conexões",    icon: Plug },
  { to: "/ajustes",      label: "Ajustes",     icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState<{ email?: string; name?: string; avatar?: string }>({});

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data.user) return;
      const meta = data.user.user_metadata ?? {};
      setUser({
        email: data.user.email ?? undefined,
        name: meta.full_name ?? meta.name ?? data.user.email?.split("@")[0],
        avatar: meta.avatar_url,
      });
    });
    return () => { alive = false; };
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r-[3px] border-border bg-[var(--panel)]">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <Logo size={36} />
        <div className="leading-tight">
          <div className="font-display text-[15px] tracking-wide">VIAGEM AO PASSADO</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--primary)] font-heading">Studio</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Operação</div>
        <ul className="flex flex-col gap-0.5">
          {items.map((it) => {
            const active = pathname === it.to || (it.to !== "/painel" && pathname.startsWith(it.to));
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <Link
                  to={it.to}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    background: active ? "var(--primary)" : "transparent",
                    color: active ? "var(--foreground)" : "var(--muted-foreground)",
                    border: active ? "2px solid var(--border)" : "2px solid transparent",
                    boxShadow: active ? "3px 3px 0 0 var(--border)" : "none",
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  <Icon size={16} style={{ color: "currentColor" }}/>
                  <span className="font-heading tracking-wide">{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="h-9 w-9 rounded-full overflow-hidden bg-[var(--panel-2)] border border-border flex items-center justify-center text-xs font-heading">
            {user.avatar
              ? <img src={user.avatar} alt="" className="h-full w-full object-cover"/>
              : (user.name?.[0]?.toUpperCase() ?? "?")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user.name ?? "Operador"}</div>
            <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
          </div>
          <button onClick={signOut} className="rounded-md p-2 text-muted-foreground hover:bg-[var(--panel-2)] hover:text-[var(--blood)] transition-colors" aria-label="Sair">
            <LogOut size={16}/>
          </button>
        </div>
      </div>
    </aside>
  );
}
