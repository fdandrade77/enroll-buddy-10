

## Análise: Por que o email de notificação não está sendo enviado

### Diagnóstico

Investiguei o sistema e encontrei **a causa raiz**: o trigger do banco que dispara a Edge Function `notify-matricula` está **falhando silenciosamente** porque as configurações que ele depende não existem mais.

**Evidências encontradas:**

1. ✅ Trigger `on_matricula_inserted` existe e está ativo na tabela `matriculas`.
2. ✅ Última matrícula foi criada em 23/04 às 22:35 (Fernando Andrade).
3. ✅ Configuração `notification_email` está corretamente salva no banco (`fernandodandrade@hotmail.com`).
4. ❌ **Edge Function `notify-matricula` NÃO tem nenhum log de execução** — ou seja, ela nunca foi chamada.
5. ❌ **Tabela `net._http_response` está vazia** — o `pg_net` nunca conseguiu disparar a requisição HTTP.
6. ❌ **`current_setting('app.settings.supabase_url')` retorna NULL** e **`app.settings.service_role_key` também está vazio**.

### Causa raiz

A função `notify_matricula_webhook` (no banco) tenta ler duas configurações de runtime do Postgres:

```sql
edge_function_url := rtrim(current_setting('app.settings.supabase_url', true), '/') || '/functions/v1/notify-matricula';
service_role_key := current_setting('app.settings.service_role_key', true);
```

Essas configurações **não estão definidas** no banco. O resultado:
- A URL fica como `/functions/v1/notify-matricula` (sem domínio)
- O `Authorization` fica vazio
- A chamada HTTP falha
- O `EXCEPTION WHEN OTHERS` engole o erro silenciosamente (apenas um `RAISE WARNING`)
- Por isso nem aparece nos logs da Edge Function — a chamada nunca chega lá.

Provavelmente essas configurações foram perdidas em algum reset/restore do projeto ou nunca foram persistidas corretamente.

### Solução

Reescrever a função `notify_matricula_webhook` para **embutir a URL e a chave do serviço diretamente no código da função** (não depender mais de `current_setting`). Como o `service_role_key` é sensível, a abordagem correta é guardá-lo no **Vault do Supabase** e a função lê de lá.

### Plano de correção

**1. Migration: armazenar service_role_key no Vault**

```sql
-- Guarda a chave de serviço no Vault (criptografada)
SELECT vault.create_secret(
  '<SERVICE_ROLE_KEY_AQUI>',
  'service_role_key',
  'Used by notify_matricula_webhook to call edge functions'
)
ON CONFLICT (name) DO NOTHING;
```

**2. Migration: reescrever a função `notify_matricula_webhook`**

Substituir as leituras de `current_setting` por:
- URL embutida diretamente: `https://jjxjuqtdaphmoscntzqc.supabase.co/functions/v1/notify-matricula`
- Service role key lido do Vault: `SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'`

Também vou **melhorar o tratamento de erro**: em vez de só `RAISE WARNING`, registrar em uma tabela de log (ou pelo menos garantir que o erro seja visível nos logs do Postgres). Assim, se algo der errado no futuro, o problema fica visível.

**3. Validação**

Após o deploy:
- Inserir uma matrícula de teste pela tela pública
- Verificar `net._http_response` para confirmar que a chamada HTTP foi disparada (status 200)
- Verificar logs da Edge Function `notify-matricula` para confirmar execução
- Confirmar que o email chegou em `fernandodandrade@hotmail.com`

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/` (nova) | Insere `service_role_key` no Vault e reescreve `notify_matricula_webhook` com URL embutida + leitura do Vault + log de erro melhorado |

### Observação importante

A Edge Function `notify-matricula` em si está **correta**: ela já lê o destinatário da tabela `configuracoes`, suporta múltiplos emails, tem fallback para a secret `ADMIN_EMAIL`, e usa o Resend corretamente. **O problema é puramente no trigger do banco que nunca está conseguindo chamá-la.**

Após aprovação, implemento a migration e o sistema volta a enviar emails automaticamente.

