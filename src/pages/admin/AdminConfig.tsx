import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2 } from "lucide-react";

interface AdminRow {
  user_id: string;
  nome: string;
  email: string;
}

export default function AdminConfig() {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ nome: "", email: "", password: "" });
  const [adminLoading, setAdminLoading] = useState(false);

  // Cashback config
  const [valorCashback, setValorCashback] = useState("50.00");

  const fetchAdmins = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id, profiles:user_id(nome, email)")
      .eq("role", "admin");

    if (data) {
      const mapped: AdminRow[] = data.map((r: any) => ({
        user_id: r.user_id,
        nome: r.profiles?.nome ?? "",
        email: r.profiles?.email ?? "",
      }));
      setAdmins(mapped);
    }
  };

  const fetchCashbackConfig = async () => {
    const { data } = await supabase.from("configuracoes").select("valor").eq("chave", "valor_cashback").single();
    if (data) setValorCashback(data.valor);
  };

  useEffect(() => { fetchAdmins(); fetchCashbackConfig(); }, []);

  const handleUpdateEmail = async () => {
    if (!newEmail) { toast.error("Informe o novo e-mail"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("E-mail de confirmação enviado para o novo endereço");
    setNewEmail("");
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) { toast.error("Informe a nova senha"); return; }
    if (newPassword.length < 6) { toast.error("A senha deve ter no mínimo 6 caracteres"); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha atualizada com sucesso!");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleCreateAdmin = async () => {
    if (!adminForm.nome || !adminForm.email || !adminForm.password) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (adminForm.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    setAdminLoading(true);
    const { data, error } = await supabase.functions.invoke("create-admin", {
      body: { nome: adminForm.nome, email: adminForm.email, password: adminForm.password },
    });
    setAdminLoading(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao criar admin");
      return;
    }
    toast.success("Administrador criado com sucesso!");
    setAdminDialogOpen(false);
    setAdminForm({ nome: "", email: "", password: "" });
    fetchAdmins();
  };

  const handleDeleteAdmin = async (admin: AdminRow) => {
    if (admin.user_id === user?.id) {
      toast.error("Você não pode excluir a si mesmo");
      return;
    }
    setAdminLoading(true);
    const { data, error } = await supabase.functions.invoke("delete-vendedor", {
      body: { user_id: admin.user_id },
    });
    setAdminLoading(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao excluir admin");
      return;
    }
    toast.success("Administrador excluído");
    fetchAdmins();
  };

  const salvarCashback = async () => {
    await supabase.from("configuracoes").upsert({ chave: "valor_cashback", valor: valorCashback } as any);
    toast.success("Valor de cashback atualizado!");
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Alterar E-mail</h2>
        <p className="text-sm text-muted-foreground">E-mail atual: {user?.email}</p>
        <div className="space-y-2">
          <Label>Novo e-mail</Label>
          <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="novo@email.com" />
        </div>
        <Button onClick={handleUpdateEmail} disabled={loading}>Atualizar E-mail</Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Alterar Senha</h2>
        <div className="space-y-2">
          <Label>Nova senha</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <div className="space-y-2">
          <Label>Confirmar nova senha</Label>
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <Button onClick={handleUpdatePassword} disabled={loading}>Atualizar Senha</Button>
      </div>

      {/* Admin Management */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Gerenciar Administradores</h2>
          <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Administrador</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={adminForm.nome} onChange={(e) => setAdminForm({ ...adminForm, nome: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} />
                </div>
                <Button className="w-full" onClick={handleCreateAdmin} disabled={adminLoading}>
                  {adminLoading ? "Criando..." : "Criar Administrador"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {admins.map((admin) => (
            <div key={admin.user_id} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{admin.nome}</p>
                <p className="text-xs text-muted-foreground">{admin.email}</p>
              </div>
              {admin.user_id !== user?.id && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir administrador?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Essa ação não pode ser desfeita. O administrador <strong>{admin.nome}</strong> será removido permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteAdmin(admin)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
          {admins.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum administrador encontrado</p>
          )}
        </div>
      </div>

      {/* Cashback config */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Cashback de Indicações</h2>
        <p className="text-sm text-muted-foreground">
          Valor pago ao aluno indicador quando o indicado efetua pagamento.
        </p>
        <div className="flex items-end gap-3">
          <div className="space-y-2 flex-1">
            <Label>Valor do Cashback (R$)</Label>
            <Input type="number" step="0.01" min="0"
              value={valorCashback}
              onChange={(e) => setValorCashback(e.target.value)} />
          </div>
          <Button onClick={salvarCashback}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}
