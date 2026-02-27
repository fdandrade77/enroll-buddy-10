

## Correção: Vendedor não aparece na lista após cadastro

### Problema

Ao criar um vendedor, a lista não atualiza porque a query `select("*, profiles:user_id(nome, email, ativo)")` faz um join entre `vendedores` e `profiles` via `user_id`, mas **faltam duas coisas no banco**:

1. **Foreign keys ausentes** -- As tabelas `vendedores` e `profiles` não possuem FK para `auth.users`, e o PostgREST precisa dessas FKs para resolver os joins. Sem elas, a query falha silenciosamente e retorna vazio.

2. **Trigger `handle_new_user` não vinculado** -- A função existe no banco, mas nenhum trigger a executa. Quando a Edge Function cria o usuário, o `profiles` nunca é populado automaticamente, então o join retorna `null`.

### Solução

**Passo 1 -- Migration SQL** para corrigir o banco:

- Adicionar FK de `profiles.user_id` para `auth.users(id)`
- Adicionar FK de `vendedores.user_id` para `auth.users(id)`
- Criar o trigger `on_auth_user_created` na tabela `auth.users` que executa `handle_new_user()`
- Criar perfis retroativos para usuários que já existem mas não têm perfil

**Passo 2 -- Ajustar o frontend** (`AdminVendedores.tsx`):

- Adicionar um pequeno delay (1 segundo) antes do `fetchVendedores()` após criação, para garantir que o trigger tenha tempo de criar o perfil
- Melhorar tratamento de erro para emails duplicados ("Este email já está cadastrado")

### Detalhes Tecnicos

Arquivos modificados:
- Nova migration SQL (via ferramenta de migration)
- `src/pages/admin/AdminVendedores.tsx` -- delay no refetch + melhor erro
- `supabase/functions/create-vendedor/index.ts` -- mensagem de erro mais clara para email duplicado

