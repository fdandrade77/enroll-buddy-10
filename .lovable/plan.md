# Validar a notificação de nova matrícula

## Objetivo
Confirmar o envio pelo Resend para `fernandodandrade@hotmail.com` sempre que uma nova matrícula for criada.

## Situação confirmada
A captura do Resend mostra os três registros de autenticação como **Verified** e o envio habilitado.

## Plano
1. Conferir se `fernandodandrade@hotmail.com` está salvo como destinatário das notificações na configuração administrativa.
2. Verificar se o remetente cadastrado no sistema pertence ao domínio já validado no Resend.
3. Criar uma matrícula de teste pelo mesmo formulário usado pelos alunos.
4. Confirmar que o acionamento automático executou sem erros e que o Resend aceitou a mensagem.
5. Validar que o e-mail contém Nome, Curso, CPF, E-mail, WhatsApp, Data de vencimento, Pagamento, Valor total e Vendedor.
6. Se o teste falhar, corrigir somente o ponto identificado no envio e repetir uma vez.

## Resultado esperado
Uma nova matrícula gera automaticamente um único e-mail completo para `fernandodandrade@hotmail.com`.
