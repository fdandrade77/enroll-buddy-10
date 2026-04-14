import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Copy, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface Indicador {
  id: string;
  nome: string;
  chave_pix: string;
  slug: string;
  ativo: boolean;
  criado_em: string;
}

interface Cashback {
  id: string;
  indicador_id: string;
  matricula_id: string;
  valor: number;
  status: string;
  data_pagamento: string | null;
  criado_em: string;
  matriculas?: any;
  indicadores?: any;
}

export default function AdminIndicacoes() {
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [cashbacks, setCashbacks] = useState<Cashback[]>([]);
  const [matriculasIndicadas, setMatriculasIndicadas] = useState<any[]>([]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", chave_pix: "", slug: "" });
  const [deleteTarget, setDeleteTarget] = useState<Indicador | null>(null);

  // Filters
  const [filtroIndicador, setFiltroIndicador] = useState("all");
  const [filtroStatusCashback, setFiltroStatusCashback] = useState("all");
  const [showResults, setShowResults] = useState(false);

  const fetchData = async () => {
    const [iRes, cRes, mRes] = await Promise.all([
      supabase.from("indicadores").select("*").order("criado_em", { ascending: false }),
      supabase.from("cashbacks").select("*, matriculas(nome_completo, curso_id, status, valor_total, quantidade_parcelas, criado_em, cursos(nome, valor_total, max_parcelas)), indicadores(nome)"),
      supabase.from("matriculas").select("*, cursos(nome, valor_total, max_parcelas), indicadores(nome)").not("indicador_id", "is", null),
    ]);
    setIndicadores((iRes.data as any) ?? []);
    setCashbacks((cRes.data as any) ?? []);
    setMatriculasIndicadas((mRes.data as any) ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const generateSlug = (nome: string) => {
    return nome.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleCreate = async () => {
    if (!form.nome || !form.chave_pix || !form.slug) {
      toast.error("Preencha todos os campos");
      return;
    }
    const { error } = await supabase.from("indicadores").insert({
      nome: form.nome,
      chave_pix: form.chave_pix,
      slug: form.slug,
    } as any);
    if (error) {
      toast.error(error.message.includes("unique") ? "Slug já existe" : error.message);
      return;
    }
    toast.success("Indicador criado!");
    setOpen(false);
    setForm({ nome: "", chave_pix: "", slug: "" });
    fetchData();
  };

  const handleEdit = async () => {
    if (!editingId || !form.nome || !form.chave_pix || !form.slug) return;
    const { error } = await supabase.from("indicadores").update({
      nome: form.nome,
      chave_pix: form.chave_pix,
      slug: form.slug,
    } as any).eq("id", editingId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Indicador atualizado!");
    setOpen(false);
    setEditingId(null);
    fetchData();
  };

  const toggleAtivo = async (ind: Indicador) => {
    await supabase.from("indicadores").update({ ativo: !ind.ativo } as any).eq("id", ind.id);
    toast.success(ind.ativo ? "Indicador desativado" : "Indicador ativado");
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("indicadores").delete().eq("id", deleteTarget.id);
    toast.success("Indicador excluído");
    setDeleteTarget(null);
    fetchData();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ nome: "", chave_pix: "", slug: "" });
    setOpen(true);
  };

  const openEdit = (ind: Indicador) => {
    setEditingId(ind.id);
    setForm({ nome: ind.nome, chave_pix: ind.chave_pix, slug: ind.slug });
    setOpen(true);
  };

  const toggleCashbackStatus = async (cb: Cashback) => {
    const newStatus = cb.status === 'pago' ? 'pendente' : 'pago';
    const update: any = { status: newStatus };
    if (newStatus === 'pago') update.data_pagamento = new Date().toISOString().split('T')[0];
    else update.data_pagamento = null;

    await supabase.from("cashbacks").update(update).eq("id", cb.id);
    toast.success(newStatus === 'pago' ? 'Cashback marcado como pago' : 'Cashback revertido para pendente');
    fetchData();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  // Calc comissão per matricula indicada: 20% of course installment value
  const calcIndicacaoComissao = (m: any) => {
    const qtd = m.quantidade_parcelas ?? 1;
    const valorTotal = Number(m.valor_total ?? 0);
    const valorParcela = valorTotal / qtd;
    return valorParcela * 0.20;
  };

  const exportCSV = () => {
    const headers = ["Aluno", "Curso", "Indicador", "Data", "Status Matrícula", "Valor Parcela", "Comissão 20% (R$)", "Status Cashback"];
    const rows = filteredMatriculas.map((m) => {
      const cb = cashbacks.find(c => c.matricula_id === m.id);
      return [
        m.nome_completo ?? "",
        m.cursos?.nome ?? "",
        m.indicadores?.nome ?? "",
        new Date(m.criado_em).toLocaleDateString("pt-BR"),
        m.status ?? "",
        (Number(m.valor_total) / (m.quantidade_parcelas ?? 1)).toFixed(2),
        calcIndicacaoComissao(m).toFixed(2),
        cb?.status ?? "sem cashback",
      ];
    });
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "indicacoes.csv";
    link.click();
  };

  // Stats per indicador
  const getIndicadorStats = (id: string) => {
    const mats = matriculasIndicadas.filter(m => m.indicador_id === id);
    const totalComissao = mats.reduce((s, m) => s + calcIndicacaoComissao(m), 0);
    const cbs = cashbacks.filter(cb => cb.indicador_id === id);
    const pago = cbs.filter(cb => cb.status === 'pago').reduce((s, cb) => s + Number(cb.valor), 0);
    const pendente = totalComissao - pago;
    return { pendente: Math.max(0, pendente), pago, total: mats.length };
  };

  const filteredMatriculas = matriculasIndicadas.filter(m => {
    if (filtroIndicador !== "all" && m.indicador_id !== filtroIndicador) return false;
    if (filtroStatusCashback !== "all") {
      const cb = cashbacks.find(c => c.matricula_id === m.id);
      if (filtroStatusCashback === "sem_cashback" && cb) return false;
      if (filtroStatusCashback === "pendente" && cb?.status !== "pendente") return false;
      if (filtroStatusCashback === "pago" && cb?.status !== "pago") return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Indicações</h1>
        <div className="flex items-center gap-3">
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-xs text-muted-foreground">Comissão: </span>
            <span className="text-sm font-semibold">20% da parcela</span>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Adicionar Indicador</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Indicador" : "Novo Indicador"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => {
                    const nome = e.target.value;
                    setForm({ ...form, nome, slug: editingId ? form.slug : generateSlug(nome) });
                  }} />
                </div>
                <div className="space-y-2">
                  <Label>Chave PIX *</Label>
                  <Input value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Link: {window.location.origin}/i/{form.slug || "..."}</p>
                </div>
                <Button className="w-full" onClick={editingId ? handleEdit : handleCreate}>
                  {editingId ? "Salvar" : "Criar Indicador"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabela de Indicadores */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 text-muted-foreground font-medium">Nome</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Chave PIX</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Link</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Indicações</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Pendente</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Total Pago</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {indicadores.map((ind) => {
                const stats = getIndicadorStats(ind.id);
                return (
                  <tr key={ind.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-foreground font-medium">{ind.nome}</td>
                    <td className="p-3 text-foreground text-xs">{ind.chave_pix}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[200px]">{window.location.origin}/i/{ind.slug}</code>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(`${window.location.origin}/i/${ind.slug}`)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-3 text-foreground">{stats.total}</td>
                    <td className="p-3 text-amber-600 font-medium">R$ {stats.pendente.toFixed(2)}</td>
                    <td className="p-3 text-success font-medium">R$ {stats.pago.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        ind.ativo ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}>
                        {ind.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(ind)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleAtivo(ind)}>
                          {ind.ativo ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteTarget(ind)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {indicadores.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum indicador cadastrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Indicações Realizadas */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Indicações Realizadas</h2>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!showResults}>Exportar CSV</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Indicador</label>
            <Select value={filtroIndicador} onValueChange={setFiltroIndicador}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {indicadores.map((ind) => (
                  <SelectItem key={ind.id} value={ind.id}>{ind.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status Cashback</label>
            <Select value={filtroStatusCashback} onValueChange={setFiltroStatusCashback}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="sem_cashback">Sem cashback</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => setShowResults(true)}>Filtrar</Button>
          </div>
        </div>

        {showResults && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-muted-foreground font-medium">Aluno Indicado</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Curso</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Indicador</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Data</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Valor Parcela</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Comissão (20%)</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status Matrícula</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status Cashback</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatriculas.map((m) => {
                const qtd = m.quantidade_parcelas ?? 1;
                const valorTotal = Number(m.valor_total ?? 0);
                const valorParcela = valorTotal / qtd;
                const comissao = valorParcela * 0.20;
                const cb = cashbacks.find(c => c.matricula_id === m.id);
                return (
                  <tr key={m.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-foreground">{m.nome_completo ?? "—"}</td>
                    <td className="p-3 text-foreground">{m.cursos?.nome ?? "—"}</td>
                    <td className="p-3 text-foreground">{m.indicadores?.nome ?? "—"}</td>
                    <td className="p-3 text-foreground">{new Date(m.criado_em).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3 text-foreground">R$ {valorParcela.toFixed(2)}</td>
                    <td className="p-3 text-foreground font-medium">R$ {comissao.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.status === "pago" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}>
                        {m.status === "pago" ? "Pago" : "Não pago"}
                      </span>
                    </td>
                    <td className="p-3">
                      {cb ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          cb.status === "pago" ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {cb.status === "pago" ? "Pago" : "Pendente"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {cb && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleCashbackStatus(cb)}>
                          {cb.status === "pago" ? "Reverter" : "Pago"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredMatriculas.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhuma indicação encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir indicador?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir "{deleteTarget?.nome}"? Isso também removerá os registros de cashback vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
