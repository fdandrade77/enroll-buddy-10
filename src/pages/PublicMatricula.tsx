import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraduationCap, CheckCircle } from "lucide-react";

export default function PublicMatricula() {
  const { codigo } = useParams<{ codigo: string }>();
  const [searchParams] = useSearchParams();
  const preselectedCurso = searchParams.get("curso_id");

  const [vendedor, setVendedor] = useState<any>(null);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    nome_completo: "",
    cpf: "",
    email: "",
    whatsapp: "",
    curso_id: preselectedCurso ?? "",
    tipo_pagamento: "" as "" | "a_vista" | "parcelado",
    quantidade_parcelas: "",
    data_vencimento: "",
  });

  useEffect(() => {
    const fetch = async () => {
      const { data: vData } = await supabase
        .from("vendedores")
        .select("*")
        .eq("codigo_ref", codigo)
        .single();

      if (!vData) { setLoading(false); return; }
      setVendedor(vData);

      const { data: cData } = await supabase.from("cursos").select("*").eq("ativo", true);
      setCursos(cData ?? []);
      setLoading(false);
    };
    fetch();
  }, [codigo]);

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
      vendedor_id: vendedor.id,
      curso_id: form.curso_id,
      nome_completo: form.nome_completo.trim(),
      cpf: form.cpf.trim(),
      email: form.email.trim(),
      whatsapp: form.whatsapp.trim(),
      tipo_pagamento: form.tipo_pagamento,
      quantidade_parcelas: form.tipo_pagamento === "parcelado" ? parseInt(form.quantidade_parcelas) : null,
      data_vencimento: form.data_vencimento,
      valor_total: selectedCurso?.valor_total ?? 0,
    });

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

  if (!vendedor) {
    return (
      <div className="min-h-screen bg-public-bg flex items-center justify-center">
        <p className="text-public-foreground text-lg">Link inválido ou vendedor não encontrado.</p>
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

  return (
    <div className="min-h-screen bg-public-bg flex items-center justify-center px-4 py-10">
      <div className="bg-public-card border border-public-border rounded-2xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gold/10 mb-4">
            <GraduationCap className="h-7 w-7 text-gold" />
          </div>
          <h1 className="text-2xl font-bold text-public-foreground">Formulário de Matrícula</h1>
          <p className="text-sm text-public-foreground/50 mt-1">Preencha seus dados para se inscrever</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-public-foreground mb-1.5">Nome completo *</label>
            <input
              className="w-full rounded-xl border border-public-border bg-public-bg px-4 py-3 text-public-foreground placeholder:text-public-foreground/30 focus:outline-none focus:ring-2 focus:ring-gold/50 transition"
              value={form.nome_completo}
              onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-public-foreground mb-1.5">CPF *</label>
            <input
              className="w-full rounded-xl border border-public-border bg-public-bg px-4 py-3 text-public-foreground placeholder:text-public-foreground/30 focus:outline-none focus:ring-2 focus:ring-gold/50 transition"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              placeholder="000.000.000-00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-public-foreground mb-1.5">E-mail *</label>
            <input
              type="email"
              className="w-full rounded-xl border border-public-border bg-public-bg px-4 py-3 text-public-foreground placeholder:text-public-foreground/30 focus:outline-none focus:ring-2 focus:ring-gold/50 transition"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-public-foreground mb-1.5">WhatsApp *</label>
            <input
              className="w-full rounded-xl border border-public-border bg-public-bg px-4 py-3 text-public-foreground placeholder:text-public-foreground/30 focus:outline-none focus:ring-2 focus:ring-gold/50 transition"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="(11) 99999-9999"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-public-foreground mb-1.5">Curso *</label>
            <select
              className="w-full rounded-xl border border-public-border bg-public-bg px-4 py-3 text-public-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 transition"
              value={form.curso_id}
              onChange={(e) => setForm({ ...form, curso_id: e.target.value })}
              required
            >
              <option value="">Selecione um curso</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} — R$ {Number(c.valor_total).toFixed(2)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-public-foreground mb-1.5">Tipo de pagamento *</label>
            <select
              className="w-full rounded-xl border border-public-border bg-public-bg px-4 py-3 text-public-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 transition"
              value={form.tipo_pagamento}
              onChange={(e) => setForm({ ...form, tipo_pagamento: e.target.value as any, quantidade_parcelas: "" })}
              required
            >
              <option value="">Selecione</option>
              <option value="a_vista">À vista</option>
              <option value="parcelado">Parcelado</option>
            </select>
          </div>

          {form.tipo_pagamento === "parcelado" && selectedCurso && (
            <div>
              <label className="block text-sm font-medium text-public-foreground mb-1.5">De quantas vezes? *</label>
              <select
                className="w-full rounded-xl border border-public-border bg-public-bg px-4 py-3 text-public-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 transition"
                value={form.quantidade_parcelas}
                onChange={(e) => setForm({ ...form, quantidade_parcelas: e.target.value })}
                required
              >
                <option value="">Selecione</option>
                {Array.from({ length: selectedCurso.max_parcelas }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}x de R$ {(selectedCurso.valor_total / n).toFixed(2)}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-public-foreground mb-1.5">Data de vencimento *</label>
            <input
              type="date"
              className="w-full rounded-xl border border-public-border bg-public-bg px-4 py-3 text-public-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 transition"
              value={form.data_vencimento}
              onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gold text-gold-foreground font-bold py-3.5 mt-2 hover:brightness-110 transition disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Inscrever agora"}
          </button>
        </form>
      </div>
    </div>
  );
}
