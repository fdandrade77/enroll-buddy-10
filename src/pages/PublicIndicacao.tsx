import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import logo from "@/assets/logo.webp";

export default function PublicIndicacao() {
  const { slug } = useParams<{ slug: string }>();

  const [indicador, setIndicador] = useState<any>(null);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    nome_completo: "",
    cpf: "",
    email: "",
    whatsapp: "",
    curso_id: "",
    tipo_pagamento: "" as "" | "a_vista" | "parcelado",
    quantidade_parcelas: "",
    data_vencimento: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: iData } = await supabase
        .from("indicadores")
        .select("*")
        .eq("slug", slug)
        .eq("ativo", true)
        .single();

      if (!iData) { setLoading(false); return; }
      setIndicador(iData);

      const { data: cData } = await supabase.from("cursos").select("*").eq("ativo", true);
      setCursos(cData ?? []);
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  const selectedCurso = cursos.find((c) => c.id === form.curso_id);

  const validateCPF = (cpf: string) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) || /^\d{11}$/.test(cpf);
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome_completo || !form.cpf || !form.email || !form.whatsapp || !form.curso_id || !form.tipo_pagamento || !form.data_vencimento) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!validateCPF(form.cpf)) { toast.error("CPF inválido"); return; }
    if (!validateEmail(form.email)) { toast.error("E-mail inválido"); return; }

    if (form.tipo_pagamento === "parcelado" && !form.quantidade_parcelas) {
      toast.error("Informe a quantidade de parcelas");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("matriculas").insert({
      indicador_id: indicador.id,
      curso_id: form.curso_id,
      nome_completo: form.nome_completo.trim(),
      cpf: form.cpf.trim(),
      email: form.email.trim(),
      whatsapp: form.whatsapp.trim(),
      tipo_pagamento: form.tipo_pagamento,
      quantidade_parcelas: form.tipo_pagamento === "parcelado" ? parseInt(form.quantidade_parcelas) : null,
      data_vencimento: form.data_vencimento,
      valor_total: selectedCurso?.valor_total ?? 0,
    } as any);

    setSubmitting(false);

    if (error) {
      toast.error("Erro ao enviar matrícula: " + error.message);
      return;
    }

    setSuccess(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-public-bg flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!indicador) {
    return (
      <div className="min-h-screen bg-public-bg flex items-center justify-center">
        <p className="text-public-foreground text-lg">Link de indicação inválido ou inativo.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-public-bg flex items-center justify-center px-4">
        <div className="bg-public-card border border-public-border rounded-2xl p-10 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-gold mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-public-foreground mb-2">Matrícula enviada com sucesso!</h2>
          <p className="text-public-foreground/60">Entraremos em contato em breve.</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const inputClass = "w-full rounded-xl border-0 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/50 transition text-sm";
  const selectClass = "w-full rounded-xl border-0 bg-white px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold/50 transition text-sm";
  const labelClass = "block text-sm font-medium text-public-foreground mb-1.5";

  return (
    <div className="min-h-screen bg-public-bg flex items-center justify-center px-4 py-10">
      <div className="bg-public-card border border-public-border rounded-2xl p-8 max-w-2xl w-full">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="FATEB Logo" className="h-24 object-contain" />
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-public-foreground text-center mb-2 tracking-wide">
          FICHA MATRÍCULA FATEB / SOBRAPPSI
        </h1>

        <p className="text-center text-sm mb-2">
          <span className="text-gold font-semibold">Você foi indicado por {indicador.nome}</span>
        </p>

        <p className="text-center text-xs text-public-foreground/50 mb-8">
          É um prazer te receber no Grupo FATEB, para dar início a essa jornada, preencha os dados abaixo
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nome completo:</label>
              <input className={inputClass} value={form.nome_completo} onChange={(e) => setForm({ ...form, nome_completo: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>CPF:</label>
              <input className={inputClass} value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>E-mail:</label>
              <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>Whatsapp:</label>
              <input className={inputClass} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(11) 99999-9999" required />
            </div>
          </div>

          <div>
            <label className={labelClass}>Curso:</label>
            <select className={selectClass} value={form.curso_id} onChange={(e) => setForm({ ...form, curso_id: e.target.value })} required>
              <option value="">Selecione um curso</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} — R$ {Number(c.valor_total).toFixed(2)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tipo de pagamento:</label>
              <select className={selectClass} value={form.tipo_pagamento} onChange={(e) => setForm({ ...form, tipo_pagamento: e.target.value as any, quantidade_parcelas: "" })} required>
                <option value="">Selecione</option>
                <option value="a_vista">À vista</option>
                <option value="parcelado">Parcelado</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Data de vencimento:</label>
              <input type="date" className={inputClass} value={form.data_vencimento} min={todayStr} max={maxDate} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} required />
            </div>
          </div>

          {form.tipo_pagamento === "parcelado" && selectedCurso && (
            <div className="md:w-1/2">
              <label className={labelClass}>De quantas vezes:</label>
              <select className={selectClass} value={form.quantidade_parcelas} onChange={(e) => setForm({ ...form, quantidade_parcelas: e.target.value })} required>
                <option value="">Selecione</option>
                {Array.from({ length: selectedCurso.max_parcelas }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}x de R$ {(selectedCurso.valor_total / n).toFixed(2)}</option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-4 flex justify-center">
            <button
              type="submit"
              disabled={submitting}
              className="w-full max-w-sm rounded-xl bg-gold text-gold-foreground font-bold py-3.5 hover:brightness-110 transition disabled:opacity-50 text-lg"
            >
              {submitting ? "Enviando..." : "Inscrever agora"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
