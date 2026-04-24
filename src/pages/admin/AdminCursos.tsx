import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Upload, FileText, Image, X } from "lucide-react";

interface CursoRow {
  id: string;
  nome: string;
  slug: string;
  valor_total: number;
  max_parcelas: number;
  comissao_primeira_parcela: number;
  ativo: boolean;
  criado_em: string;
}

interface MaterialRow {
  id: string;
  curso_id: string;
  nome_arquivo: string;
  url: string;
  tipo: string;
  criado_em: string;
}

function sanitizeFileName(name: string): string {
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot > 0 ? name.slice(lastDot + 1).toLowerCase() : "";
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;

  let sanitized = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^\x20-\x7E]/g, "")   // remove non-ASCII (emojis, etc.)
    .replace(/\s+/g, "-")           // spaces to hyphens
    .replace(/[^a-zA-Z0-9._-]/g, "") // keep only safe chars
    .replace(/-{2,}/g, "-")         // collapse multiple hyphens
    .replace(/^-+|-+$/g, "");       // trim hyphens

  if (!sanitized) sanitized = "arquivo";
  return ext ? `${sanitized}.${ext}` : sanitized;
}

const ALLOWED_EXTENSIONS = ["txt", "pdf", "docx", "doc", "png", "jpg", "jpeg", "webp"];

export default function AdminCursos() {
  const [cursos, setCursos] = useState<CursoRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", slug: "", valor_total: "", max_parcelas: "", comissao_primeira_parcela: "" });
  const [materiaisOpen, setMateriaisOpen] = useState<string | null>(null);
  const [materiais, setMateriais] = useState<MaterialRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const fetchCursos = async () => {
    const { data } = await supabase.from("cursos").select("*").order("criado_em", { ascending: false });
    setCursos(data ?? []);
  };

  useEffect(() => { fetchCursos(); }, []);

  const fetchMateriais = async (cursoId: string) => {
    const { data } = await supabase.from("curso_materiais").select("*").eq("curso_id", cursoId).order("criado_em", { ascending: false });
    setMateriais(data as MaterialRow[] ?? []);
  };

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleSave = async () => {
    if (!form.nome || !form.valor_total || !form.max_parcelas || !form.comissao_primeira_parcela) {
      toast.error("Preencha todos os campos");
      return;
    }

    const finalSlug = slugify(form.slug || form.nome);
    if (!finalSlug) {
      toast.error("Apelido do curso inválido");
      return;
    }

    const payload = {
      nome: form.nome,
      slug: finalSlug,
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
    setForm({ nome: "", slug: "", valor_total: "", max_parcelas: "", comissao_primeira_parcela: "" });
    setOpen(true);
  };

  const openEdit = (c: CursoRow) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome,
      slug: c.slug ?? "",
      valor_total: c.valor_total.toString(),
      max_parcelas: c.max_parcelas.toString(),
      comissao_primeira_parcela: c.comissao_primeira_parcela.toString(),
    });
    setOpen(true);
  };

  const openMateriais = (cursoId: string) => {
    setMateriaisOpen(cursoId);
    fetchMateriais(cursoId);
  };

  const processFiles = async (files: FileList | File[]) => {
    if (!materiaisOpen) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext ?? "")) {
        toast.error(`Tipo não permitido: ${ext}`);
        continue;
      }

      const safeName = sanitizeFileName(file.name);
      const filePath = `${materiaisOpen}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage.from("curso-materiais").upload(filePath, file);
      if (uploadError) { toast.error(`Erro ao enviar ${file.name}: ${uploadError.message}`); continue; }

      const { data: urlData } = supabase.storage.from("curso-materiais").getPublicUrl(filePath);

      const tipo = ["png", "jpg", "jpeg", "webp"].includes(ext ?? "") ? "image" : ["pdf", "docx", "doc"].includes(ext ?? "") ? "pdf" : "text";

      await supabase.from("curso_materiais").insert({
        curso_id: materiaisOpen,
        nome_arquivo: file.name,
        url: urlData.publicUrl,
        tipo,
      });
    }

    setUploading(false);
    toast.success("Arquivo(s) enviado(s)!");
    fetchMateriais(materiaisOpen);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    await processFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const deleteMaterial = async (mat: MaterialRow) => {
    const urlParts = mat.url.split("/curso-materiais/");
    if (urlParts[1]) {
      await supabase.storage.from("curso-materiais").remove([decodeURIComponent(urlParts[1])]);
    }
    await supabase.from("curso_materiais").delete().eq("id", mat.id);
    toast.success("Material excluído");
    if (materiaisOpen) fetchMateriais(materiaisOpen);
  };

  const materiaisCursoNome = cursos.find((c) => c.id === materiaisOpen)?.nome ?? "";

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
                <Label>Comissão (R$)</Label>
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
                <th className="text-left p-3 text-muted-foreground font-medium">Comissão</th>
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
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openMateriais(c.id)} title="Materiais">
                        <Upload className="h-3.5 w-3.5" />
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

      {/* Materiais Dialog */}
      <Dialog open={!!materiaisOpen} onOpenChange={(open) => !open && setMateriaisOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Materiais — {materiaisCursoNome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Drag-and-drop area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              }`}
              onClick={() => document.getElementById("file-input-materiais")?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Arraste arquivos aqui ou <span className="text-primary font-medium">clique para selecionar</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, PNG, JPG, WEBP</p>
              <input
                id="file-input-materiais"
                type="file"
                multiple
                accept=".txt,.pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
            {uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}

            {materiais.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {materiais.map((mat) => (
                  <div key={mat.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {mat.tipo === "image" ? <Image className="h-4 w-4 text-muted-foreground shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <a href={mat.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                        {mat.nome_arquivo}
                      </a>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive shrink-0" onClick={() => deleteMaterial(mat)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {materiais.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum material cadastrado</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
