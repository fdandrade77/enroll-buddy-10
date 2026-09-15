# Atualizar o envio das notificações de matrícula

## Objetivo
Substituir o envio direto pelo Resend pelo sistema de e-mail atual do Lovable, mantendo o aviso automático quando uma matrícula é criada.

## Plano
1. Preservar o conteúdo atual da notificação: nome, curso, CPF, e-mail, WhatsApp, vencimento, pagamento, valor total e vendedor.
2. Migrar a notificação de nova matrícula para o envio de e-mail do Lovable, com controle de entrega, tentativas automáticas e registros de falhas.
3. Manter o destinatário configurável na tela de administração e o endereço alternativo já existente.
4. Manter o acionamento automático após a criação da matrícula, evitando envios duplicados.
5. Validar o envio com uma matrícula de teste e conferir o registro de entrega.

## Situação que precisa de ação externa
O domínio `notify.matriculafatebead.com.br` ainda está pendente de configuração DNS. A atualização pode ser preparada antes, mas os e-mails só serão enviados depois que o domínio estiver verificado em **Configurações do Projeto → Email**.

## Detalhes técnicos
- Converter a função atual, que chama diretamente a API do Resend, para o modelo de envio do Lovable.
- Reaproveitar a configuração `notification_email` como destinatário.
- Preservar o template atual e os dados consultados de curso e vendedor.
- Revisar o gatilho da matrícula e a identificação única do envio.
- Não alterar outros e-mails ou regras de matrícula.
