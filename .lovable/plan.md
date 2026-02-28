

## Correção: Vendedores e Alunos não aparecem

### Problema identificado

As consultas do frontend usam joins embutidos (ex: `profiles:user_id(nome, email, ativo)`), mas **nenhuma Foreign Key existe** entre as tabelas. O PostgREST exige FKs para resolver esses joins -- sem elas, retorna erro 400 e os dados não aparecem.

Alem disso, o trigger `handle_new_user` existe como funcao mas **nao esta vinculado** a nenhuma tabela (a secao de triggers esta vazia), e a Edge Function `create-vendedor` nao insere na tabela `profiles`. Resultado: vendedores criados ficam sem perfil.

### Solucao

**Passo 1 -- Migracao SQL** (via ferramenta de migracao):

- Adicionar constraint `UNIQUE` em `profiles.user_id` (necessario para ser referenciado por FK)
- Criar FK: `vendedores.user_id` -> `profiles.user_id`
- Criar FK: `matriculas.vendedor_id` -> `vendedores.id`
- Criar FK: `matriculas.curso_id` -> `cursos.id`
- Backfill: inserir perfis faltantes para usuarios que ja existem mas nao tem perfil

**Passo 2 -- Atualizar Edge Function** `create-vendedor`:

- Adicionar insert na tabela `profiles` (nome + email) logo apos criar o usuario, ja que o trigger automatico nao funciona
- Isso garante que todo vendedor novo tera perfil imediatamente

### Arquivos alterados

- Nova migracao SQL (criada via ferramenta)
- `supabase/functions/create-vendedor/index.ts` -- adicionar insert em `profiles`

### Resultado esperado

- Aba Vendedores mostrara todos os vendedores com nome, email e status
- Aba Alunos mostrara todas as matriculas com dados de curso e vendedor
- Dashboard Admin mostrara os dados corretamente nos filtros e tabelas
- Novos vendedores criados terao perfil criado automaticamente
