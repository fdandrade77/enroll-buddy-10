import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Copy, Pencil, Trash2, ToggleLeft, ToggleRight, Eye, EyeOff } from "lucide-react";

interface VendedorRow {
  id: string;
  user_id: string;
  codigo_ref: string;
  whatsapp: string;
  cpf: string;
  chave_pix: string;
  cnpj: string | null;
  senha_gerada: string | null;
  criado_em: string;
  profiles: { nome: string; email: string; ativo: boolean } | null;
}

export default function AdminVendedores() {
  const [vendedores, setVendedores] = useState<VendedorRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", email: "", whatsapp: "", cpf: "", chave_pix: "", cnpj: "" });
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VendedorRow | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const fetchVendedores = async () => {
    const { data } = await supabase
      .from("vendedores")
      .select("*, profiles:user_id(nome, email, ativo)")
      .order("criado_em", { ascending: false });
    setVendedores((data as any) ?? []);
  };

  useEffect(() => { fetchVendedores(); }, []);

  const generateCodigoRef = async (nome: string): Promise<string> => {
    const base = nome.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    const { data: existing } = await supabase
      .from("vendedores")
      .select("codigo_ref")
      .ilike("codigo_ref", `${base}%`);

    const codes = (existing ?? []).map((v: any) => v.codigo_ref);
    if (!codes.includes(base)) return base;

    let i = 1;
    while (codes.includes(`${base}${i}`)) i++;
    return `${base}${i}`;
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const handleCreate = async () => {
    if (!form.nome || !form.email || !form.whatsapp || !form.cpf || !form.chave_pix) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const password = generatePassword();
    const codigoRef = await generateCodigoRef(form.nome);

    const response = await supabase.functions.invoke("create-vendedor", {
      body: {
        nome: form.nome,
        email: form.email,
        password,
        whatsapp: form.whatsapp,
        cpf: form.cpf,
        chave_pix: form.chave_pix,
        cnpj: form.cnpj,
        codigo_ref: codigoRef,
      },
    });

    if (response.error || response.data?.error) {
      const msg = response.data?.error ?? response.error?.message ?? "Erro ao criar vendedor";
      const friendly = msg.toLowerCase().includes("already") || msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("exists")
        ? "Este email já está cadastrado"
        : msg;
      toast.error(friendly);
      return;
    }

    setCreatedPassword(password);
    setCreatedLink(`${window.location.origin}/r/${codigoRef}`);
    toast.success("Vendedor criado com sucesso!");
    setTimeout(() => fetchVendedores(), 1500);
  };

  const handleEdit = async () => {
    if (!editingId) return;
    const v = vendedores.find((v) => v.id === editingId);
    if (!v) return;

    await supabase.from("profiles").update({ nome: form.nome }).eq("user_id", v.user_id);
    await supabase.from("vendedores").update({
      whatsapp: form.whatsapp,
      cpf: form.cpf,
      chave_pix: form.chave_pix,
      cnpj: form.cnpj || null,
    }).eq("id", editingId);

    toast.success("Vendedor atualizado!");
    setOpen(false);
    setEditingId(null);
    fetchVendedores();
  };

  const toggleAtivo = async (v: VendedorRow) => {
    const newAtivo = !v.profiles?.ativo;
    await supabase.from("profiles").update({ ativo: newAtivo }).eq("user_id", v.user_id);
    toast.success(newAtivo ? "Vendedor ativado" : "Vendedor desativado");
    fetchVendedores();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    // Delete from auth first via edge function
    const { error: authDeleteError } = await supabase.functions.invoke("delete-vendedor", {
      body: { user_id: deleteTarget.user_id },
    });
    if (authDeleteError) {
      toast.error("Erro ao excluir vendedor do sistema de autenticação");
      return;
    }
    // Then clean up database tables
    await supabase.from("vendedores").delete().eq("id", deleteTarget.id);
    await supabase.from("profiles").delete().eq("user_id", deleteTarget.user_id);
    await supabase.from("user_roles").delete().eq("user_id", deleteTarget.user_id);
    toast.success("Vendedor excluído");
    setDeleteTarget(null);
    fetchVendedores();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ nome: "", email: "", whatsapp: "", cpf: "", chave_pix: "", cnpj: "" });
    setCreatedPassword(null);
    setCreatedLink(null);
    setOpen(true);
  };

  const openEdit = (v: VendedorRow) => {
    setEditingId(v.id);
    setForm({
      nome: v.profiles?.nome ?? "",
      email: v.profiles?.email ?? "",
      whatsapp: v.whatsapp,
      cpf: v.cpf,
      chave_pix: v.chave_pix,
      cnpj: v.cnpj ?? "",
    });
    setCreatedPassword(null);
    setCreatedLink(null);
    setOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Vendedores</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Vendedor" : "Novo Vendedor"}</DialogTitle>
            </DialogHeader>

            {createdPassword ? (
              <div className="space-y-4">
                <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                  <p className="text-sm font-medium text-success mb-2">Vendedor criado com sucesso!</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{form.email}</code>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(form.email)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Senha gerada:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{createdPassword}</code>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(createdPassword)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Link de acesso à plataforma:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded break-all">{`${window.location.origin}/login`}</code>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`${window.location.origin}/login`)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
                <Button className="w-full" onClick={() => setOpen(false)}>Fechar</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                {!editingId && (
                  <div className="space-y-2">
                    <Label>E-mail *</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>WhatsApp *</Label>
                  <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <Label>CPF *</Label>
                  <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-2">
                  <Label>Chave PIX *</Label>
                  <Input value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ (opcional)</Label>
                  <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
                </div>
                <Button className="w-full" onClick={editingId ? handleEdit : handleCreate}>
                  {editingId ? "Salvar" : "Criar Vendedor"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 text-muted-foreground font-medium">Nome</th>
                <th className="text-left p-3 text-muted-foreground font-medium">E-mail</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Senha</th>
                <th className="text-left p-3 text-muted-foreground font-medium">WhatsApp</th>
                <th className="text-left p-3 text-muted-foreground font-medium">CPF</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Código</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Ativo</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map((v) => (
                <tr key={v.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-foreground">{v.profiles?.nome}</td>
                  <td className="p-3 text-foreground">{v.profiles?.email}</td>
                  <td className="p-3 text-foreground">
                    {v.senha_gerada ? (
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {visiblePasswords.has(v.id) ? v.senha_gerada : "••••••••"}
                        </code>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => togglePasswordVisibility(v.id)}>
                          {visiblePasswords.has(v.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(v.senha_gerada!)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3 text-foreground">{v.whatsapp}</td>
                  <td className="p-3 text-foreground">{v.cpf}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{v.codigo_ref}</code>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(`${window.location.origin}/r/${v.codigo_ref}`)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.profiles?.ativo ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      {v.profiles?.ativo ? "Sim" : "Não"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(v)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleAtivo(v)}>
                        {v.profiles?.ativo ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteTarget(v)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {vendedores.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum vendedor cadastrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vendedor?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.profiles?.nome ? `Deseja realmente excluir o vendedor "${deleteTarget.profiles.nome}"?` : "Deseja realmente excluir este vendedor?"} 
              {" "}Os alunos cadastrados por este vendedor serão mantidos, mas ficarão sem vendedor associado.
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
