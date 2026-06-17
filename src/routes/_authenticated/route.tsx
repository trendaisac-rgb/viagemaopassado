import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";

// Acesso direto, sem tela de login: conta de portal compartilhada com login automático.
const PORTAL_EMAIL = "portal@viagemaopassado.app";
const PORTAL_PASSWORD = "VaPortal-acesso-direto-7c3f9a21";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data: cur } = await supabase.auth.getUser();
    if (cur.user) return { user: cur.user };

    // Garante que a conta do portal existe (idempotente) e entra direto.
    try { await supabase.functions.invoke("bootstrap-portal"); } catch { /* ignore */ }
    const { error } = await supabase.auth.signInWithPassword({ email: PORTAL_EMAIL, password: PORTAL_PASSWORD });
    if (error) throw redirect({ to: "/auth" });

    const { data: after } = await supabase.auth.getUser();
    if (!after.user) throw redirect({ to: "/auth" });
    return { user: after.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <div className="min-h-screen w-full flex">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
