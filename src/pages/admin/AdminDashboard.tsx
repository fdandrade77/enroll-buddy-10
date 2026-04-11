import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { FileText, CheckCircle, XCircle, DollarSign, ClipboardList, Receipt, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addMonths, format } from "date-fns";

function calcComissao(m: any): number {
  const modelo = m.vendedores?.modelo_comissao ?? 'fixo';
  if (modelo === 'fixo') {
    return m.cursos?.comissao_primeira_parcela ?? 0;
  }
  return m._comissaoParcelada ?? 0;
}

export default function AdminDashboard() {
  const [matriculas, setMatriculas] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [comissoesParcelas, setComissoesParcelas] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [filtroVendedor, setFiltroVendedor] = useState("all");
  const [filtroCurso, setFiltroCurso] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Modals
  const [parcelasModal, setParcelasModal] = useState<any>(null);
  const [despesasModal, setDespesasModal] = useState<any>(null);
  const [novaDespesa, setNovaDespesa] = useState({ tipo: 'trafego', descricao: '', valor: '' });

  const fetchData = async () => {
    const [mRes, vRes, cRes, cpRes, dRes] = await Promise.all([
      supabase.from("matriculas").select("*, cursos(nome, comissao_primeira_parcela, valor_total, max_parcelas), vendedores(codigo_ref, user_id, modelo_comissao, comissao_percentual, profiles:user_id(nome))"),
      supabase.from("vendedores").select("*, profiles:user_id(nome)"),
      supabase.from("cursos").select("*"),
      supabase.from("comissoes_parcelas").select("*"),
      supabase.from("despesas_matricula").select("*"),
    ]);

    const parcelas = cpRes.data ?? [];
    setComissoesParcelas(parcelas);
    setDespesas(dRes.data ?? []);

    // Enrich matriculas with comissao parcelada sum
    const enriched = (mRes.data ?? []).map((m: any) => {
      const mParcelas = parcelas.filter((p: any) => p.matricula_id === m.id);
      return {
        ...m,
        _comissaoParcelada: mParcelas.reduce((s: number, p: any) => s + Number(p.valor_comissao), 0),
        _parcelasCount: mParcelas.length,
        _parcelasPagas: mParcelas.filter((p: any) => p.status === 'pago').length,
      };
    });

    setMatriculas(enriched);
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
  const comissaoTotal = filtered.reduce((sum, m) => sum + calcComissao(m), 0);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "pago" ? "nao_pago" : "pago";
    const { error } = await supabase.from("matriculas").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success(`Status alterado para ${newStatus === "pago" ? "Pago" : "Não pago"}`);
    fetchData();
  };

  const exportCSV = () => {
    const headers = ["Nome", "CPF", "Email", "WhatsApp", "Curso", "Tipo Pgto", "Parcelas", "Vencimento", "Status", "Valor", "Comissão", "Data"];
    const rows = filtered.map((m) => [
      m.nome_completo, m.cpf, m.email, m.whatsapp,
      m.cursos?.nome ?? "", m.tipo_pagamento, m.quantidade_parcelas ?? "",
      m.data_vencimento, m.status, m.valor_total, calcComissao(m).toFixed(2),
      new Date(m.criado_em).toLocaleDateString("pt-BR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "matriculas.csv";
    link.click();
  };

  // Generate commission installments on demand
  const generateParcelas = async (m: any) => {
    const qtd = m.quantidade_parcelas ?? m.cursos?.max_parcelas ?? 1;
    const valorParcela = Number(m.valor_total) / qtd;
    const percentual = m.vendedores?.comissao_percentual ?? 15;
    const valorComissao = (valorParcela * percentual) / 100;

    const rows = Array.from({ length: qtd }, (_, i) => ({
      matricula_id: m.id,
      vendedor_id: m.vendedor_id,
      numero_parcela: i + 1,
      valor_parcela_curso: Number(valorParcela.toFixed(2)),
      percentual,
      valor_comissao: Number(valorComissao.toFixed(2)),
      status: 'pendente',
      data_prevista: format(addMonths(new Date(m.data_vencimento), i), 'yyyy-MM-dd'),
    }));

    const { error } = await supabase.from("comissoes_parcelas").insert(rows as any);
    if (error) {
      toast.error("Erro ao gerar parcelas: " + error.message);
      return;
    }
    toast.success(`${qtd} parcelas de comissão geradas`);
    await fetchData();
  };

  const openParcelasModal = async (m: any) => {
    const existing = comissoesParcelas.filter((p) => p.matricula_id === m.id);
    if (existing.length === 0) {
      await generateParcelas(m);
    }
    setParcelasModal(m);
  };

  const toggleParcelaStatus = async (parcelaId: string, current: string) => {
    const newStatus = current === 'pago' ? 'pendente' : 'pago';
    const update: any = { status: newStatus };
    if (newStatus === 'pago') update.data_pagamento = format(new Date(), 'yyyy-MM-dd');
    else update.data_pagamento = null;

    await supabase.from("comissoes_parcelas").update(update).eq("id", parcelaId);
    await fetchData();
  };

  // Despesas
  const openDespesasModal = (m: any) => {
    setDespesasModal(m);
    setNovaDespesa({ tipo: 'trafego', descricao: '', valor: '' });
  };

  const addDespesa = async () => {
    if (!despesasModal || !novaDespesa.valor) return;
    const { error } = await supabase.from("despesas_matricula").insert({
      matricula_id: despesasModal.id,
      tipo: novaDespesa.tipo,
      descricao: novaDespesa.descricao || null,
      valor: parseFloat(novaDespesa.valor),
    } as any);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Despesa adicionada");
    setNovaDespesa({ tipo: 'trafego', descricao: '', valor: '' });
    await fetchData();
  };

  const removeDespesa = async (id: string) => {
    await supabase.from("despesas_matricula").delete().eq("id", id);
    toast.success("Despesa removida");
    await fetchData();
  };

  // Comissão por vendedor
  const comissaoPorVendedor = vendedores.map((v) => {
    const ms = filtered.filter((m) => m.vendedor_id === v.id);
    const total = ms.reduce((s, m) => s + Number(m.valor_total), 0);
    const comissao = ms.reduce((s, m) => s + calcComissao(m), 0);
    return {
      nome: v.profiles?.nome ?? v.codigo_ref,
      total,
      comissao,
      count: ms.length,
      modelo: (v as any).modelo_comissao ?? 'fixo',
      percentual: (v as any).comissao_percentual ?? 15,
    };
  }).filter((v) => v.count > 0);

  const modalParcelas = parcelasModal
    ? comissoesParcelas.filter((p) => p.matricula_id === parcelasModal.id).sort((a, b) => a.numero_parcela - b.numero_parcela)
    : [];

  const modalDespesas = despesasModal
    ? despesas.filter((d) => d.matricula_id === despesasModal.id)
    : [];

  const despesasTotal = modalDespesas.reduce((s, d) => s + Number(d.valor), 0);
  const comissaoBrutaModal = despesasModal ? calcComissao(despesasModal) : 0;
  const comissaoLiquidaModal = comissaoBrutaModal - despesasTotal;

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
                <th className="text-left p-3 text-muted-foreground font-medium">Comissão</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const modelo = m.vendedores?.modelo_comissao ?? 'fixo';
                const mDespesas = despesas.filter((d) => d.matricula_id === m.id);
                const totalDesp = mDespesas.reduce((s: number, d: any) => s + Number(d.valor), 0);
                return (
                  <tr key={m.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-foreground">{m.nome_completo}</td>
                    <td className="p-3 text-foreground">{m.cursos?.nome}</td>
                    <td className="p-3 text-foreground">{m.vendedores?.profiles?.nome ?? m.vendedores?.codigo_ref}</td>
                    <td className="p-3 text-foreground">{m.tipo_pagamento === "a_vista" ? "À vista" : "Parcelado"}</td>
                    <td className="p-3 text-foreground">{m.quantidade_parcelas ?? "-"}</td>
                    <td className="p-3 text-foreground">{m.data_vencimento}</td>
                    <td className="p-3 text-foreground">R$ {Number(m.valor_total).toFixed(2)}</td>
                    <td className="p-3 text-foreground">
                      <div className="flex flex-col">
                        <span className="font-medium">R$ {calcComissao(m).toFixed(2)}</span>
                        {modelo === 'parcelado' && m._parcelasCount > 0 && (
                          <span className="text-xs text-muted-foreground">{m._parcelasPagas}/{m._parcelasCount} pagas</span>
                        )}
                        {totalDesp > 0 && (
                          <span className="text-xs text-destructive">-R$ {totalDesp.toFixed(2)} desp.</span>
                        )}
                      </div>
                    </td>
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
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleStatus(m.id, m.status)}>
                          {m.status === "pago" ? "Não pago" : "Pago"}
                        </Button>
                        {modelo === 'parcelado' && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Parcelas de comissão" onClick={() => openParcelasModal(m)}>
                            <ClipboardList className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Despesas" onClick={() => openDespesasModal(m)}>
                          <Receipt className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Nenhuma matrícula encontrada</td></tr>
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
                <th className="text-left p-3 text-muted-foreground font-medium">Modelo</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Matrículas</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Total</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {comissaoPorVendedor.map((v, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="p-3 text-foreground">{v.nome}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.modelo === 'parcelado' ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"
                    }`}>
                      {v.modelo === 'parcelado' ? `${v.percentual}% parcelado` : 'Fixo'}
                    </span>
                  </td>
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

      {/* Modal: Parcelas de Comissão */}
      <Dialog open={!!parcelasModal} onOpenChange={(o) => !o && setParcelasModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Parcelas de Comissão</DialogTitle>
          </DialogHeader>
          {parcelasModal && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><strong>Aluno:</strong> {parcelasModal.nome_completo}</p>
                <p><strong>Vendedor:</strong> {parcelasModal.vendedores?.profiles?.nome}</p>
                <p><strong>Curso:</strong> {parcelasModal.cursos?.nome}</p>
                <p><strong>Percentual:</strong> {parcelasModal.vendedores?.comissao_percentual ?? 15}%</p>
              </div>
              <div className="text-sm font-medium">
                {modalParcelas.filter(p => p.status === 'pago').length}/{modalParcelas.length} pagas —
                R$ {modalParcelas.filter(p => p.status === 'pago').reduce((s: number, p: any) => s + Number(p.valor_comissao), 0).toFixed(2)} pago
              </div>
              <div className="space-y-2">
                {modalParcelas.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <span className="text-sm font-medium">Parcela {p.numero_parcela}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {p.data_prevista ? format(new Date(p.data_prevista + 'T12:00:00'), 'dd/MM/yyyy') : '—'}
                      </span>
                    </div>
                    <span className="text-sm font-medium mx-3">R$ {Number(p.valor_comissao).toFixed(2)}</span>
                    <Button
                      size="sm"
                      variant={p.status === 'pago' ? 'default' : 'outline'}
                      className="text-xs h-7"
                      onClick={() => toggleParcelaStatus(p.id, p.status)}
                    >
                      {p.status === 'pago' ? '✅ Pago' : 'Pendente'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Despesas */}
      <Dialog open={!!despesasModal} onOpenChange={(o) => !o && setDespesasModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Despesas da Matrícula</DialogTitle>
          </DialogHeader>
          {despesasModal && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Comissão Bruta</p>
                  <p className="text-lg font-bold text-foreground">R$ {comissaoBrutaModal.toFixed(2)}</p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Despesas</p>
                  <p className="text-lg font-bold text-destructive">R$ {despesasTotal.toFixed(2)}</p>
                </div>
                <div className="bg-success/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Comissão Líquida</p>
                  <p className={`text-lg font-bold ${comissaoLiquidaModal >= 0 ? 'text-success' : 'text-destructive'}`}>
                    R$ {comissaoLiquidaModal.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Add expense */}
              <div className="border border-border rounded-lg p-3 space-y-3">
                <p className="text-sm font-medium">Adicionar despesa</p>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={novaDespesa.tipo} onValueChange={(v) => setNovaDespesa({ ...novaDespesa, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trafego">Tráfego Pago</SelectItem>
                      <SelectItem value="taxa_fateb">Taxa FATEB</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Descrição" value={novaDespesa.descricao} onChange={(e) => setNovaDespesa({ ...novaDespesa, descricao: e.target.value })} />
                  <div className="flex gap-1">
                    <Input type="number" placeholder="R$" step="0.01" min="0" value={novaDespesa.valor} onChange={(e) => setNovaDespesa({ ...novaDespesa, valor: e.target.value })} />
                    <Button size="sm" onClick={addDespesa}>+</Button>
                  </div>
                </div>
              </div>

              {/* Expense list */}
              {modalDespesas.length > 0 && (
                <div className="space-y-2">
                  {modalDespesas.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div>
                        <span className="text-xs font-medium">
                          {d.tipo === 'trafego' ? 'Tráfego' : d.tipo === 'taxa_fateb' ? 'Taxa FATEB' : 'Outro'}
                        </span>
                        {d.descricao && <span className="text-xs text-muted-foreground ml-2">{d.descricao}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">R$ {Number(d.valor).toFixed(2)}</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeDespesa(d.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
