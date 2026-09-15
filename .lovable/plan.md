# Concluir o domínio de e-mail sem alterar o site

## Situação confirmada
- `matriculafatebead.com.br` já está ativo e conectado ao site no Lovable.
- O domínio é primário e o site está publicado normalmente.
- O DNS ainda é administrado externamente pelo Registro.br.
- O registro de verificação do e-mail já está correto.
- Faltam somente os dois registros NS de `notify.matriculafatebead.com.br`, que essa tela do Registro.br não oferece.

## Plano
1. Manter o site e os registros atuais sem alterações.
2. Transferir apenas o gerenciamento do domínio para o Lovable em **Configurações do Workspace → Domínios → Transferir para cá**.
3. Autorizar a transferência no Registro.br usando o código solicitado pelo formulário seguro.
4. Conferir que os registros atuais foram preservados após a transferência.
5. Retomar a configuração de e-mail; o Lovable criará automaticamente a delegação de `notify.matriculafatebead.com.br`.
6. Confirmar que o domínio de e-mail aparece como **Ativo** e testar uma nova matrícula.

## Resultado esperado
O endereço do site continuará o mesmo. A transferência muda quem administra o domínio e o DNS, permitindo concluir o envio das notificações por e-mail.
