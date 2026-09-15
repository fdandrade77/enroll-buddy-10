# Corrigir o Resend e restaurar a notificação de matrícula

## Objetivo
Enviar pelo Resend somente o aviso de nova matrícula ao endereço salvo em **Admin → Configurações**, sem transferir o domínio e sem alterar o site.

## Diagnóstico confirmado
A tela do Resend mostra que o domínio ainda não foi validado porque estes registros estão com status **Failed**:
- DKIM: registro TXT `resend._domainkey`;
- SPF: registro MX `send`, prioridade 10;
- SPF: registro TXT `send`;
- DMARC aparece como opcional e não impede o envio.

O Resend ainda identifica a configuração antiga da Hostinger. Como o DNS atual é administrado pelo Registro.br, os registros de autenticação do Resend precisam ser recriados na zona DNS do Registro.br; nenhuma alteração será feita na Hostinger.

Os valores aparecem abreviados na imagem. Durante a configuração, serão copiados integralmente da tela do Resend, sem tentar reconstruí-los.

## Execução
1. Manter todos os registros atuais do site no Registro.br, incluindo os apontamentos do domínio principal e do `www` para o Lovable.
2. Ignorar a indicação antiga de provedor Hostinger mostrada pelo Resend e adicionar no Registro.br os três registros exatos exibidos pelo Resend:
   - TXT `resend._domainkey`, com o conteúdo DKIM completo;
   - MX `send`, com o servidor completo e prioridade 10;
   - TXT `send`, com o conteúdo SPF completo.
3. Evitar registros duplicados ou conflitantes nesses mesmos nomes.
4. Solicitar uma nova verificação no Resend e aguardar os três status mudarem para **Verified**.
5. Alterar somente a notificação de nova matrícula para usar novamente o Resend.
6. Reutilizar a credencial já armazenada; se o Resend informar que ela expirou ou foi revogada, solicitar a substituição pelo formulário seguro, sem expor a chave no chat.
7. Preservar o destinatário configurável no painel administrativo e todos os dados do aluno no aviso: nome, curso, CPF, e-mail, WhatsApp, vencimento, pagamento, valor total e vendedor.
8. Atualizar o envio e realizar um teste controlado, conferindo o resultado no histórico do Resend.

## Resultado esperado
Cada nova matrícula gerará um único e-mail pelo Resend para o destinatário cadastrado no painel administrativo. O domínio e o site continuarão hospedados e funcionando como estão hoje.

## Participação necessária
Na etapa dos registros DNS, será necessário copiar os valores completos da sua tela do Resend, pois a captura os abrevia. Não envie senha ou chave de API pelo chat.
