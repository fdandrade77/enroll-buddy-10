import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { FileText, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [matriculas, setMatriculas] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState("all");
  const [filtroCurso, setFiltroCurso] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [showResults, setShowResults] = useState(false);

  const fetchData = async () => {
    const [mRes, vRes, cRes] = await Promise.all([
      supabase.from("matriculas").select("*, cursos(nome, comissao_primeira_parcela), vendedores(codigo_ref, user_id, profiles:user_id(nome))"),
      supabase.from("vendedores").select("*, profiles:user_id(nome)"),
      supabase.from("cursos").select("*"),
    ]);
    setMatriculas(mRes.data ?? []);
    setVendedores(vRes.data ?? []);
    setCursos(cRes.data ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = matriculas.filter((m) => {
    if (filtroVendedor !== "all" && m.vendedor_id !== filtroVendedor) return false;
    if (filtroCurso !== "all" && m.curso_id !== filtroCurso) return false;
    if (filtroStatus !== "all" && m.status !== filtroStatus) return false;
    if (dataInicio && m.criado_em < dataInicio) return false;
    if (dataFim && m.criado_em > dataFim + "T23:59:59") return false;
    return true;
  });

  const totalPago = filtered.filter((m) => m.status === "pago").length;
  const totalNaoPago = filtered.filter((m) => m.status === "nao_pago").length;
  const comissaoTotal = filtered
    .reduce((sum, m) => sum + (m.cursos?.comissao_primeira_parcela ?? 0), 0);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "pago" ? "nao_pago" : "pago";
    const { error } = await supabase.from("matriculas").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success(`Status alterado para ${newStatus === "pago" ? "Pago" : "Não pago"}`);
    fetchData();
  };

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
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "matriculas.csv";
    link.click();
  };

  // Comissão por vendedor
  const comissaoPorVendedor = vendedores.map((v) => {
    const ms = filtered.filter((m) => m.vendedor_id === v.id);
    const total = ms.reduce((s, m) => s + m.valor_total, 0);
    const comissao = ms.reduce((s, m) => s + (m.cursos?.comissao_primeira_parcela ?? 0), 0);
    return { nome: v.profiles?.nome ?? v.codigo_ref, total, comissao, count: ms.length };
  }).filter((v) => v.count > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Matrículas" value={filtered.length} icon={FileText} />
        <StatCard title="Pagas" value={totalPago} icon={CheckCircle} variant="success" />
        <StatCard title="Não Pagas" value={totalNaoPago} icon={XCircle} variant="destructive" />
        <StatCard title="Comissão a Pagar" value={`R$ ${comissaoTotal.toFixed(2)}`} icon={DollarSign} variant="warning" />
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Vendedor</label>
            <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {vendedores.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.profiles?.nome ?? v.codigo_ref}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                <th className="text-left p-3 text-muted-foreground font-medium">Curso</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Vendedor</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Tipo Pgto</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Parcelas</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Vencimento</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Valor</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-foreground">{m.nome_completo}</td>
                  <td className="p-3 text-foreground">{m.cursos?.nome}</td>
                  <td className="p-3 text-foreground">{m.vendedores?.profiles?.nome ?? m.vendedores?.codigo_ref}</td>
                  <td className="p-3 text-foreground">{m.tipo_pagamento === "a_vista" ? "À vista" : "Parcelado"}</td>
                  <td className="p-3 text-foreground">{m.quantidade_parcelas ?? "-"}</td>
                  <td className="p-3 text-foreground">{m.data_vencimento}</td>
                  <td className="p-3 text-foreground">R$ {Number(m.valor_total).toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.status === "pago"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {m.status === "pago" ? "Pago" : "Não pago"}
                    </span>
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(m.id, m.status)}>
                      {m.status === "pago" ? "Marcar não pago" : "Marcar pago"}
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhuma matrícula encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comissão por Vendedor */}
      {comissaoPorVendedor.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Comissão por Vendedor</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-muted-foreground font-medium">Vendedor</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Matrículas</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Total</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {comissaoPorVendedor.map((v, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="p-3 text-foreground">{v.nome}</td>
                  <td className="p-3 text-foreground">{v.count}</td>
                  <td className="p-3 text-foreground">R$ {v.total.toFixed(2)}</td>
                  <td className="p-3 text-foreground font-medium">R$ {v.comissao.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}
    </div>
  );
}
