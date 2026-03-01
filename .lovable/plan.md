

## Correcao de 3 Problemas

### 1. Erro ao cadastrar vendedor (Edge Function)

**Causa raiz**: Quando voce exclui um vendedor pela interface, ele e removido das tabelas `vendedores`, `profiles` e `user_roles`, mas o usuario continua existindo no sistema de autenticacao. Ao tentar criar um novo vendedor com o mesmo email, o sistema retorna erro de "email ja existe".

**Solucao**:
- Atualizar a Edge Function `create-vendedor` para primeiro verificar se ja existe um usuario com o mesmo email no auth. Se existir, reutilizar esse usuario ao inves de criar um novo.
- Atualizar a funcao `confirmDelete` em `AdminVendedores.tsx` para tambem chamar uma nova Edge Function que deleta o usuario do auth (usando `admin.deleteUser`).
- Criar uma nova Edge Function `delete-vendedor` que recebe o `user_id` e chama `adminClient.auth.admin.deleteUser(userId)`.
- Limpar os dados orfaos atuais: usar a Edge Function para deletar o usuario auth do vendedor "teste" que ficou orfao.

**Arquivos**:
- `supabase/functions/delete-vendedor/index.ts` (novo)
- `supabase/functions/create-vendedor/index.ts` (atualizar para tratar email duplicado)
- `src/pages/admin/AdminVendedores.tsx` (chamar delete-vendedor antes de deletar dados)

### 2. Ativar protecao contra senhas vazadas

- Usar a ferramenta de configuracao de autenticacao para habilitar a protecao contra senhas comprometidas (leaked password protection).

### 3. Erro 404 na Hostinger para rotas SPA

**Causa**: Aplicacoes SPA (Single Page Application) como esta usam rotas no frontend (ex: `/r/teste`). Quando voce acessa diretamente uma URL como `matriculafatebead.com.br/r/teste`, o servidor da Hostinger procura uma pasta `/r/teste` que nao existe e retorna 404. O servidor precisa ser configurado para redirecionar TODAS as rotas para o `index.html`.

**Solucao**: Criar um arquivo `.htaccess` na raiz do projeto que sera incluido no build. Isso instrui o servidor Apache da Hostinger a redirecionar todas as requisicoes para `index.html`.

**Arquivos**:
- `public/.htaccess` (novo) -- com regra de rewrite para SPA

### Detalhes Tecnicos

**Edge Function `delete-vendedor`**:
```text
Recebe: { user_id: string }
Acao: adminClient.auth.admin.deleteUser(user_id)
Valida: apenas admins podem chamar
```

**`.htaccess`**:
```text
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

**Fluxo de exclusao atualizado**:
1. Chamar `delete-vendedor` com o `user_id` (deleta do auth)
2. Deletar de `vendedores`, `profiles`, `user_roles` (ja existente)

