import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext, useRouter,
  HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel max-w-md text-center p-10">
        <div className="font-display text-7xl text-[var(--primary)]">404</div>
        <h2 className="mt-3 font-heading text-xl">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">A rota que você buscou não existe no cockpit.</p>
        <a href="/" className="gold-btn inline-block mt-6 px-5 py-2 text-sm">Ir para o início</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel max-w-md text-center p-10">
        <h1 className="font-heading text-xl">Esta página não carregou</h1>
        <p className="mt-2 text-sm text-muted-foreground">Algo deu errado. Tente novamente em instantes.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button className="gold-btn px-4 py-2 text-sm" onClick={() => { router.invalidate(); reset(); }}>Tentar de novo</button>
          <a className="ghost-btn px-4 py-2 text-sm" href="/">Início</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "Viagem Studio is a professional content operations command center for creating and publishing short-form videos across multiple social networks." },
      { name: "author", content: "Viagem ao Passado" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Viagem Studio is a professional content operations command center for creating and publishing short-form videos across multiple social networks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Lovable App" },
      { name: "twitter:description", content: "Viagem Studio is a professional content operations command center for creating and publishing short-form videos across multiple social networks." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e05da6e9-f3d7-48a9-8905-90f57ae5331d/id-preview-a7e8ccf0--2ff25df4-a662-4d45-920b-adcdcb383760.lovable.app-1781724746753.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e05da6e9-f3d7-48a9-8905-90f57ae5331d/id-preview-a7e8ccf0--2ff25df4-a662-4d45-920b-adcdcb383760.lovable.app-1781724746753.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthListener() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") qc.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, qc]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener />
      <Outlet />
      <Toaster theme="dark" position="bottom-right" toastOptions={{
        style: { background: "#111A2B", border: "1px solid #22304A", color: "#F3F1EC", borderRadius: 12 }
      }}/>
    </QueryClientProvider>
  );
}
