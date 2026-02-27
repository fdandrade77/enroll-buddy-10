import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface CursoRow {
  id: string;
  nome: string;
  valor_total: number;
  max_parcelas: number;
  comissao_primeira_parcela: number;
  ativo: boolean;
  criado_em: string;
}

export default function AdminCursos() {
  const [cursos, setCursos] = useState<CursoRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", valor_total: "", max_parcelas: "", comissao_primeira_parcela: "" });

  const fetchCursos = async () => {
    const { data } = await supabase.from("cursos").select("*").order("criado_em", { ascending: false });
    setCursos(data ?? []);
  };

  useEffect(() => { fetchCursos(); }, []);

  const handleSave = async () => {
    if (!form.nome || !form.valor_total || !form.max_parcelas || !form.comissao_primeira_parcela) {
      toast.error("Preencha todos os campos");
      return;
    }

    const payload = {
      nome: form.nome,
      valor_total: parseFloat(form.valor_total),
      max_parcelas: parseInt(form.max_parcelas),
      comissao_primeira_parcela: parseFloat(form.comissao_primeira_parcela),
    };

    if (editingId) {
      const { error } = await supabase.from("cursos").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Curso atualizado!");
    } else {
      const { error } = await supabase.from("cursos").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Curso criado!");
    }

    setOpen(false);
    setEditingId(null);
    fetchCursos();
  };

  const toggleAtivo = async (c: CursoRow) => {
    await supabase.from("cursos").update({ ativo: !c.ativo }).eq("id", c.id);
    toast.success(c.ativo ? "Curso desativado" : "Curso ativado");
    fetchCursos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir curso?")) return;
    await supabase.from("cursos").delete().eq("id", id);
    toast.success("Curso excluído");
    fetchCursos();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ nome: "", valor_total: "", max_parcelas: "", comissao_primeira_parcela: "" });
    setOpen(true);
  };

  const openEdit = (c: CursoRow) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome,
      valor_total: c.valor_total.toString(),
      max_parcelas: c.max_parcelas.toString(),
      comissao_primeira_parcela: c.comissao_primeira_parcela.toString(),
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Cursos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Curso" : "Novo Curso"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input type="number" step="0.01" min="0.01" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Máx. Parcelas (1-12)</Label>
                <Input type="number" min="1" max="12" value={form.max_parcelas} onChange={(e) => setForm({ ...form, max_parcelas: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Comissão 1ª Parcela (R$)</Label>
                <Input type="number" step="0.01" min="0" value={form.comissao_primeira_parcela} onChange={(e) => setForm({ ...form, comissao_primeira_parcela: e.target.value })} />
              </div>
              <Button className="w-full" onClick={handleSave}>{editingId ? "Salvar" : "Criar Curso"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 text-muted-foreground font-medium">Nome</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Valor Total</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Máx. Parcelas</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Comissão 1ª Parcela</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Ativo</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cursos.map((c) => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-foreground">{c.nome}</td>
                  <td className="p-3 text-foreground">R$ {Number(c.valor_total).toFixed(2)}</td>
                  <td className="p-3 text-foreground">{c.max_parcelas}x</td>
                  <td className="p-3 text-foreground">R$ {Number(c.comissao_primeira_parcela).toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.ativo ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      {c.ativo ? "Sim" : "Não"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleAtivo(c)}>
                        {c.ativo ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {cursos.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum curso cadastrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
