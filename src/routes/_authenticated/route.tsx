import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Sem tela de login por enquanto: garante uma sessão (anônima) automaticamente.
    const { data } = await supabase.auth.getUser();
    if (data.user) return { user: data.user };
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error || !anon.user) throw redirect({ to: "/auth" }); // fallback se anon estiver desabilitado no Supabase
    return { user: anon.user };
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
