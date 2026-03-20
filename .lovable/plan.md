

## Plano de Teste e Correcoes das Funcoes de Cadastro

### Problemas Encontrados

**Problema 1 -- Trigger de notificacao bloqueia INSERT de matriculas**

A funcao `notify_matricula_webhook()` chama `extensions.http_post(...)`, mas a funcao `http_post` esta no schema `net`, nao `extensions`. Isso causa o erro:
```
function extensions.http_post(url => text, body => jsonb, headers => jsonb) does not exist
```

O trigger `on_matricula_inserted` dispara ANTES do INSERT completar (tipo 5 = BEFORE). Quando o trigger falha, o INSERT inteiro e revertido -- por isso a matricula nao e criada.

**Correcao**: Migration SQL para recriar a funcao usando `net.http_post(...)` em vez de `extensions.http_post(...)`. Tambem mudar o trigger para AFTER INSERT para que a falha na notificacao nao bloqueie o cadastro.

**Problema 2 -- Edge Function `create-admin` usa metodo errado**

Linha 49 de `create-admin/index.ts` usa `adminClient.auth.admin.updateUser(existingUser.id, ...)` que nao existe. O correto e `updateUserById`.

**Correcao**: Trocar para `updateUserById` e fixar versao do import para `@2.49.1`.

**Problema 3 -- Edge Function `delete-vendedor` usa import sem versao fixa**

Usa `@supabase/supabase-js@2` sem versao especifica, o que pode causar incompatibilidades.

**Correcao**: Fixar para `@2.49.1`.

---

### Resumo das Correcoes

| Item | Arquivo | Correcao |
|---|---|---|
| 1 | Nova migration SQL | `net.http_post` + trigger AFTER INSERT |
| 2 | `supabase/functions/create-admin/index.ts` | `updateUserById` + versao fixa |
| 3 | `supabase/functions/delete-vendedor/index.ts` | Versao fixa do import |

### Teste Pos-Correcao

Apos aplicar as correcoes, testar sequencialmente:

1. **Criar vendedor** -- verificar se cria sem erro
2. **Excluir vendedor** -- verificar se exclui do auth e banco
3. **Criar admin** -- verificar se cria sem erro
4. **Cadastrar matricula** -- verificar se insere e se o email de notificacao chega
5. **Verificar nome do consultor** -- na tela publica de matricula

