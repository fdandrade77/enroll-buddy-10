# Transferir o domínio para o Lovable

## Objetivo
Transferir o gerenciamento de `matriculafatebead.com.br` para o Lovable, permitindo configurar automaticamente o subdomínio de e-mail `notify.matriculafatebead.com.br`.

## Plano
1. Iniciar a transferência em **Configurações do Workspace → Domínios**, seguindo a opção de transferir um domínio existente.
2. Obter no Registro.br o código de autorização solicitado durante a transferência e informá-lo somente no formulário seguro do Lovable.
3. Antes da confirmação, conferir se os registros atuais do site serão preservados:
   - domínio principal apontando para `185.158.133.1`;
   - `www` apontando para `185.158.133.1`;
   - registros de verificação já existentes.
4. Concluir a transferência e aguardar a atualização do gerenciamento do domínio.
5. Voltar a **Configurações do Projeto → Email** e retomar a configuração de `notify.matriculafatebead.com.br`; com o domínio gerenciado pelo Lovable, a delegação necessária será criada automaticamente.
6. Conferir o status até aparecer como **Ativo** e, em seguida, validar o envio da notificação de nova matrícula para o destinatário cadastrado.

## Cuidados
- A transferência precisa ser iniciada e autorizada pelo titular da conta; não tenho acesso direto à conta do Registro.br.
- Não apagar os registros atuais antes da transferência, para evitar indisponibilidade do site.
- O processo de transferência e a propagação podem levar algum tempo.
