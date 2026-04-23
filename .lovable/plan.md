

## Plano: Gerenciar email de notificação pela tela de Admin

### Objetivo
Permitir que o administrador altere o email destinatário das notificações de novas matrículas diretamente pela interface, sem precisar acessar o painel de secrets.

### Como funciona hoje
A Edge Function `notify-matricula` lê a secret `ADMIN_EMAIL` para saber quem recebe a notificação. Trocar exige acesso ao painel de Cloud → Secrets.

### Solução proposta
Migrar o destinatário da secret para a tabela `configuracoes` (que já existe no banco), e criar uma UI na tela `AdminConfig` para editar o valor. A Edge Function passa a ler do banco em vez da secret.

### Alterações

**1. Banco — semente da configuração**
Inserir uma linha em `configuracoes` com chave `notification_email`, valor inicial = email atual. Migration simples (idempotente, com `ON CONFLICT DO NOTHING`).

**2. Edge Function `notify-matricula`**
- Antes de enviar o email, buscar `configuracoes.valor` onde `chave = 'notification_email'`.
- Se encontrar, usar esse valor como destinatário.
- Fallback: se a linha não existir, continuar usando `Deno.env.get("ADMIN_EMAIL")` (compatibilidade).

**3. UI — `src/pages/admin/AdminConfig.tsx`**
Adicionar uma seção "Notificações por Email" com:
- Campo de input (tipo email) com o valor atual carregado da tabela `configuracoes`.
- Botão "Salvar" que faz upsert em `configuracoes` (`chave = 'notification_email'`).
- Validação: formato de email válido antes de salvar.
- Toast de sucesso/erro.
- Texto explicativo: "Este endereço receberá um email sempre que uma nova matrícula for cadastrada."

**4. Suporte a múltiplos destinatários (opcional, incluído)**
O input aceita uma lista separada por vírgula (ex: `admin@x.com, financeiro@x.com`). A Edge Function quebra a string em array antes de mandar para o Resend. Assim já cobre o cenário de mais de um destinatário sem nova tela.

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/` (nova) | Insere `notification_email` em `configuracoes` com o email atual |
| `supabase/functions/notify-matricula/index.ts` | Lê destinatário da tabela `configuracoes`; suporta lista separada por vírgula; fallback para secret |
| `src/pages/admin/AdminConfig.tsx` | Nova seção com input + botão salvar para gerenciar o email destinatário |

### Resultado
Admin entra em **Configurações** → edita o campo "Email para notificações" → clica Salvar. A próxima matrícula já dispara email para o novo endereço, sem deploy nem acesso ao painel de secrets.

