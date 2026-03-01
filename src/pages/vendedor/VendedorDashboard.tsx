import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/StatCard";
import { FileText, CheckCircle, XCircle, DollarSign, Copy, Link } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function VendedorDashboard() {
  const { user } = useAuth();
  const [vendedor, setVendedor] = useState<any>(null);
  const [matriculas, setMatriculas] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [filtroCurso, setFiltroCurso] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [linkCurso, setLinkCurso] = useState("all");
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: vData } = await supabase
        .from("vendedores")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setVendedor(vData);

      if (vData) {
        const { data: mData } = await supabase
          .from("matriculas")
          .select("*, cursos(nome, comissao_primeira_parcela)")
          .eq("vendedor_id", vData.id)
          .order("criado_em", { ascending: false });
        setMatriculas(mData ?? []);
      }

      const { data: cData } = await supabase.from("cursos").select("*").eq("ativo", true);
      setCursos(cData ?? []);
    };
    fetch();
  }, [user]);

  const filtered = matriculas.filter((m) => {
    if (filtroCurso !== "all" && m.curso_id !== filtroCurso) return false;
    if (filtroStatus !== "all" && m.status !== filtroStatus) return false;
    if (dataInicio && m.criado_em < dataInicio) return false;
    if (dataFim && m.criado_em > dataFim + "T23:59:59") return false;
    return true;
  });

  const totalPago = filtered.filter((m) => m.status === "pago").length;
  const totalNaoPago = filtered.filter((m) => m.status === "nao_pago").length;
  const comissao = filtered
    .reduce((sum, m) => sum + (m.cursos?.comissao_primeira_parcela ?? 0), 0);

  const link = vendedor ? `${window.location.origin}/r/${vendedor.codigo_ref}` : "";

  const exportCSV = () => {
    const headers = ["Nome", "CPF", "Email", "WhatsApp", "Curso", "Tipo Pgto", "Parcelas", "Vencimento", "Status", "Valor", "Data"];
    const rows = filtered.map((m) => [
      m.nome_completo, m.cpf, m.email, m.whatsapp,
      m.cursos?.nome ?? "", m.tipo_pagamento, m.quantidade_parcelas ?? "",
      m.data_vencimento, m.status, m.valor_total,
      new Date(m.criado_em).toLocaleDateString("pt-BR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "minhas-matriculas.csv";
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Meu Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Matrículas" value={filtered.length} icon={FileText} />
        <StatCard title="Pagas" value={totalPago} icon={CheckCircle} variant="success" />
        <StatCard title="Não Pagas" value={totalNaoPago} icon={XCircle} variant="destructive" />
        <StatCard title="Comissão a Receber" value={`R$ ${comissao.toFixed(2)}`} icon={DollarSign} variant="warning" />
      </div>

      {/* Gerar Link */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Link className="h-5 w-5" /> Gerar Link de Matrícula
        </h2>
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Curso (opcional)</label>
            <Select value={linkCurso} onValueChange={setLinkCurso}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Geral</SelectItem>
                {cursos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Input
              readOnly
              value={linkCurso !== "all" ? `${link}?curso_id=${linkCurso}` : link}
              className="bg-muted"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const url = linkCurso !== "all" ? `${link}?curso_id=${linkCurso}` : link;
              navigator.clipboard.writeText(url);
              toast.success("Link copiado!");
            }}
          >
            <Copy className="h-4 w-4 mr-2" /> Copiar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Curso</label>
            <Select value={filtroCurso} onValueChange={setFiltroCurso}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {cursos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="nao_pago">Não pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Data início</label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Data fim</label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={() => setShowResults(true)}>Filtrar</Button>
        <Button variant="outline" onClick={exportCSV} disabled={!showResults}>Exportar CSV</Button>
      </div>

      {showResults && (
      <>
      {/* Matriculas Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 text-muted-foreground font-medium">Nome</th>
                <th className="text-left p-3 text-muted-foreground font-medium">CPF</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Curso</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Tipo Pgto</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Parcelas</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Vencimento</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-foreground">{m.nome_completo}</td>
                  <td className="p-3 text-foreground">{m.cpf}</td>
                  <td className="p-3 text-foreground">{m.cursos?.nome}</td>
                  <td className="p-3 text-foreground">{m.tipo_pagamento === "a_vista" ? "À vista" : "Parcelado"}</td>
                  <td className="p-3 text-foreground">{m.quantidade_parcelas ?? "-"}</td>
                  <td className="p-3 text-foreground">{m.data_vencimento}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.status === "pago" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      {m.status === "pago" ? "Pago" : "Não pago"}
                    </span>
                  </td>
                  <td className="p-3 text-foreground">{new Date(m.criado_em).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhuma matrícula encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
