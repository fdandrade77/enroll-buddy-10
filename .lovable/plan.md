# Restaurar a notificação de matrícula pelo Resend

## Objetivo
Voltar a enviar apenas o aviso de nova matrícula para o e-mail configurado no painel administrativo, sem transferir o domínio e sem alterar o funcionamento do site.

## Plano
1. Manter `matriculafatebead.com.br` no Registro.br e preservar todos os registros atuais do site.
2. Conferir no Resend o domínio ou subdomínio de envio e usar exatamente os registros DNS fornecidos por ele. O Registro.br aceita os tipos normalmente usados pelo Resend, como MX e TXT.
3. Confirmar que a credencial atual do Resend ainda pertence à conta acessível; se estiver inválida, substituí-la de forma segura por uma nova credencial dessa conta.
4. Alterar somente o envio da notificação de nova matrícula para usar novamente o Resend.
5. Preservar o destinatário configurável na tela administrativa, com o endereço atualmente cadastrado como referência.
6. Manter no e-mail todos os dados solicitados: nome, curso, CPF, e-mail, WhatsApp, vencimento, pagamento, valor total e vendedor.
7. Publicar a função atualizada e realizar um teste controlado de envio.
8. Conferir o resultado no histórico do Resend e, se necessário, corrigir apenas a verificação do remetente.

## Resultado esperado
Ao criar uma matrícula, o sistema enviará um único aviso pelo Resend ao endereço salvo em **Admin → Configurações**, sem depender da transferência do domínio para o Lovable.

## Ação necessária durante a execução
Você precisará apenas abrir o Resend para consultar os registros exatos do domínio e, se a credencial antiga não funcionar, autorizar uma nova conexão segura. Não envie senhas ou chaves pelo chat.
