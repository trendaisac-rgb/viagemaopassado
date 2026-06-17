import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes · Viagem ao Passado" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return p;
    },
  });

  const [brand, setBrand] = useState("");
  const [voice, setVoice] = useState("");
  const [aspect, setAspect] = useState("9:16");
  const [cuts, setCuts] = useState(4);
  const [duration, setDuration] = useState(45);

  useEffect(() => {
    if (!data) return;
    setBrand(data.brand_name ?? "Viagem ao Passado");
    setVoice(data.brand_voice ?? "Victor Power PT-BR");
    const d = (data.defaults as any) ?? {};
    setAspect(d.aspect ?? "9:16");
    setCuts(d.cuts_s ?? 4);
    setDuration(d.duration_s ?? 45);
  }, [data]);

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { id: user.id, brand_name: brand, brand_voice: voice, defaults: { aspect, cuts_s: cuts, duration_s: duration } };
    const { error } = await supabase.from("profiles").upsert(payload);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Ajustes salvos.");
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[900px] mx-auto">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-heading">Ajustes</div>
        <h1 className="font-display text-4xl mt-1">Preferências</h1>
      </header>

      <div className="space-y-5">
        <Section title="Marca">
          <Field label="Nome da marca"><input className="ipt" value={brand} onChange={e=>setBrand(e.target.value)}/></Field>
        </Section>
        <Section title="Voz padrão">
          <Field label="Voz">
            <select className="ipt" value={voice} onChange={e=>setVoice(e.target.value)}>
              <option>Victor Power PT-BR</option>
              <option>Narrador Cinematográfico PT-BR</option>
              <option>Documental Feminino PT-BR</option>
            </select>
          </Field>
        </Section>
        <Section title="Padrões de geração">
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Aspect"><input className="ipt" value={aspect} onChange={e=>setAspect(e.target.value)}/></Field>
            <Field label="Corte a cada (s)"><input className="ipt" type="number" min={2} max={10} value={cuts} onChange={e=>setCuts(+e.target.value)}/></Field>
            <Field label="Duração padrão (s)"><input className="ipt" type="number" min={20} max={90} value={duration} onChange={e=>setDuration(+e.target.value)}/></Field>
          </div>
        </Section>
        <Section title="Conta / Billing">
          <div className="text-sm text-muted-foreground">Plano e cobrança — em breve.</div>
        </Section>
        <button onClick={save} className="gold-btn px-5 py-2.5 text-sm inline-flex items-center gap-2"><Save size={14}/> Salvar ajustes</button>
      </div>

      <style>{`
        .ipt { background: var(--input); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 14px; color: var(--foreground); width: 100%; transition: border-color .15s ease; }
        .ipt:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(233,184,74,0.15); }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <div className="font-heading text-sm uppercase tracking-wider text-[var(--primary)] mb-4">{title}</div>
      {children}
    </section>
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
