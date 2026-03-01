import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminAlunos() {
  const [matriculas, setMatriculas] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("all");
  const [filtroCurso, setFiltroCurso] = useState("all");
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [showResults, setShowResults] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchData = async () => {
    const [mRes, vRes, cRes] = await Promise.all([
      supabase.from("matriculas").select("*, cursos(nome), vendedores(codigo_ref, user_id, profiles:user_id(nome))").order("criado_em", { ascending: false }),
      supabase.from("vendedores").select("*, profiles:user_id(nome)"),
      supabase.from("cursos").select("*"),
    ]);
    setMatriculas(mRes.data ?? []);
    setVendedores(vRes.data ?? []);
    setCursos(cRes.data ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("matriculas").delete().eq("id", deleteTarget.id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Matrícula excluída");
    setDeleteTarget(null);
    fetchData();
  };

  const filtered = matriculas.filter((m) => {
    if (filtroVendedor !== "all" && m.vendedor_id !== filtroVendedor) return false;
    if (filtroCurso !== "all" && m.curso_id !== filtroCurso) return false;
    if (filtroStatus !== "all" && m.status !== filtroStatus) return false;
    if (busca) {
      const term = busca.toLowerCase();
      if (!m.nome_completo?.toLowerCase().includes(term) && !m.cpf?.includes(term) && !m.email?.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Alunos / Matrículas</h1>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Buscar (Nome, CPF, E-mail)</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Pesquisar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          </div>
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
          <div className="flex items-end">
            <Button className="w-full" onClick={() => setShowResults(true)}>Filtrar</Button>
          </div>
        </div>
      </div>

      {showResults && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/30">
            <span className="text-sm text-muted-foreground">{filtered.length} resultado(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 text-muted-foreground font-medium">Nome Completo</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">CPF</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">E-mail</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">WhatsApp</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Curso</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Vendedor</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Tipo Pgto</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Parcelas</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Vencimento</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Valor</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Data</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-foreground font-medium">{m.nome_completo}</td>
                    <td className="p-3 text-foreground">{m.cpf}</td>
                    <td className="p-3 text-foreground">{m.email}</td>
                    <td className="p-3 text-foreground">{m.whatsapp}</td>
                    <td className="p-3 text-foreground">{m.cursos?.nome}</td>
                    <td className="p-3 text-foreground">{m.vendedores?.profiles?.nome ?? m.vendedores?.codigo_ref ?? "—"}</td>
                    <td className="p-3 text-foreground">{m.tipo_pagamento === "a_vista" ? "À vista" : "Parcelado"}</td>
                    <td className="p-3 text-foreground">{m.quantidade_parcelas ?? "-"}</td>
                    <td className="p-3 text-foreground">{m.data_vencimento}</td>
                    <td className="p-3 text-foreground">R$ {Number(m.valor_total).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.status === "pago" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}>
                        {m.status === "pago" ? "Pago" : "Não pago"}
                      </span>
                    </td>
                    <td className="p-3 text-foreground">{new Date(m.criado_em).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteTarget(m)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={13} className="p-8 text-center text-muted-foreground">Nenhuma matrícula encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir matrícula?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir a matrícula de "{deleteTarget?.nome_completo}"? Esta ação não pode ser desfeita.
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
