import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminConfig() {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-8 animate-fade-in max-w-lg">
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
    </div>
  );
}
