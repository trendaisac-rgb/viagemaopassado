import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar · Viagem ao Passado" }] }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/painel", replace: true });
    });
  }, [nav]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta.");
        nav({ to: "/painel", replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Conta criada. Você já pode entrar.");
        setMode("in");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.redirected) return;
    if (r.error) {
      toast.error((r.error as Error).message ?? "Falha no login com Google");
      setLoading(false);
      return;
    }
    nav({ to: "/painel", replace: true });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Logo size={48}/>
          <div className="leading-tight">
            <div className="font-display text-xl tracking-wider">VIAGEM AO PASSADO</div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--primary)] font-heading">Studio</div>
          </div>
        </div>

        <div className="panel p-7">
          <h1 className="font-heading text-2xl">{mode === "in" ? "Entrar no cockpit" : "Criar conta"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "in" ? "Acesse para gerenciar seus episódios." : "Comece a publicar Shorts históricos em minutos."}
          </p>

          <button onClick={handleGoogle} disabled={loading}
            className="ghost-btn mt-6 w-full px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2">
            <GoogleIcon/> Continuar com Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <div className="h-px flex-1 bg-border"/> ou <div className="h-px flex-1 bg-border"/>
          </div>

          <form onSubmit={handleEmail} className="flex flex-col gap-3">
            {mode === "up" && (
              <Field label="Nome">
                <input className="ipt" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Como te chamamos?" />
              </Field>
            )}
            <Field label="E-mail">
              <input className="ipt" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/>
            </Field>
            <Field label="Senha">
              <input className="ipt" type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••"/>
            </Field>
            <button type="submit" disabled={loading} className="gold-btn mt-2 px-4 py-2.5 text-sm flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin"/>}
              {mode === "in" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            {mode === "in" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button onClick={()=>setMode(mode === "in" ? "up" : "in")} className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-semibold">
              {mode === "in" ? "Criar agora" : "Entrar"}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Pressione <kbd className="rounded bg-[var(--panel-2)] px-1.5 py-0.5 border border-border">Enter</kbd> para confirmar.
        </p>
      </div>

      <style>{`
        .ipt {
          background: var(--input);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          color: var(--foreground);
          width: 100%;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .ipt:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(233,184,74,0.15); }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-heading">{label}</span>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 11v3.2h7.3c-.3 1.7-2 5-7.3 5-4.4 0-8-3.7-8-8.2s3.6-8.2 8-8.2c2.5 0 4.2 1.1 5.2 2l3.5-3.4C18.4 1.6 15.5 0 12 0 5.4 0 0 5.4 0 12s5.4 12 12 12c6.9 0 11.5-4.8 11.5-11.6 0-.8-.1-1.4-.2-2H12z"/></svg>
  );
}
