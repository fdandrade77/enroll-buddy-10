
## Plano de Implementacao -- 11 Melhorias

### 1. Alterar email e senha do administrador
- Adicionar pagina "Configuracoes" na area admin (`src/pages/admin/AdminConfig.tsx`)
- Formulario com campos: novo email, nova senha, confirmar senha
- Usar `supabase.auth.updateUser({ email, password })` para atualizar
- Adicionar link "Configuracoes" no menu lateral (`AdminLayout.tsx`)
- Adicionar rota `/admin/configuracoes` no `App.tsx`

### 2. Codigo unico do vendedor = nome (slug)
- Alterar `AdminVendedores.tsx`: remover `generateSlug()` e usar o nome como base do codigo
- Converter nome para slug (lowercase, sem acentos, sem espacos -> hifen ou junto)
- Antes de criar, consultar `vendedores` para verificar se ja existe `codigo_ref` igual
- Se existir, adicionar sufixo numerico: carlos, carlos1, carlos2...
- Atualizar a Edge Function para receber o `codigo_ref` ja calculado (ja funciona assim)

### 3. Botao de excluir aluno (matricula)
- Adicionar coluna "Acoes" na tabela de alunos em `AdminAlunos.tsx`
- Botao com icone Trash2 + dialog de confirmacao (AlertDialog)
- Criar migration para adicionar RLS policy de DELETE para admin na tabela `matriculas`
- Chamar `supabase.from("matriculas").delete().eq("id", id)` ao confirmar

### 4. Comissao independente do status de pagamento
- Em `AdminDashboard.tsx`:
  - Alterar calculo de `comissaoTotal` para considerar TODAS as matriculas filtradas (nao apenas `status === "pago"`)
  - Alterar `comissaoPorVendedor` para contar todas as matriculas (nao filtrar por `status === "pago"`)
- Em `VendedorDashboard.tsx`:
  - Mesmo ajuste: comissao calculada sobre todas as matriculas, nao apenas pagas
- O campo pago/nao_pago continua servindo para visualizar inadimplentes

### 5. Excluir vendedor mesmo com alunos cadastrados
- Alterar a FK `matriculas.vendedor_id -> vendedores.id` para incluir `ON DELETE SET NULL` (migration)
- Tornar `matriculas.vendedor_id` nullable (migration)
- Em `AdminVendedores.tsx`: manter o dialog de confirmacao que ja existe (usa `confirm()`, vou trocar por AlertDialog mais claro)
- Mensagem: "Este vendedor possui alunos cadastrados. Deseja realmente excluir?"

### 6. Campo "Senha cadastrada" na tela de vendedores
- Adicionar coluna `senha_gerada` na tabela `vendedores` (migration) para armazenar a senha gerada no momento da criacao
- Atualizar Edge Function `create-vendedor` para salvar a senha no campo
- Exibir na tabela de vendedores a coluna "Senha" com valor mascarado e botao para revelar/copiar
- Nota: a senha sera armazenada apenas para referencia administrativa

### 7. Campo de materiais do curso (upload de arquivos)
- Criar bucket de storage `curso-materiais` (migration)
- Adicionar tabela `curso_materiais` com campos: id, curso_id (FK), nome_arquivo, url, tipo (text/pdf/image), criado_em
- RLS: admin pode CRUD, vendedor pode SELECT
- No formulario de cursos (`AdminCursos.tsx`): adicionar secao para upload de arquivos (aceitar .txt, .pdf, .png, .jpg, .webp)
- Listar materiais existentes com opcao de excluir
- No dashboard do vendedor, permitir visualizar materiais do curso

### 8-11. Tela de matricula no formato da imagem
- Redesenhar `PublicMatricula.tsx` seguindo o layout da imagem:
  - Fundo escuro (preto), card centralizado com bordas arredondadas
  - Logo FATEB centralizada no topo (copiar `user-uploads://logo.webp` para `src/assets/logo.webp`)
  - Titulo "FICHA MATRICULA FATEB / SOBRAPPSI"
  - Nome do curso em destaque dourado na parte superior (vindo do curso pre-selecionado ou do select)
  - "Consultor: [Nome e Sobrenome do Vendedor]" -- buscar nome do vendedor via profiles join
  - Mensagem de boas-vindas
  - Campos em grid 2 colunas: Nome completo | CPF, E-mail | WhatsApp, Tipo de pagamento | Data de vencimento, De quantas vezes (condicional)
  - Botao "Inscrever agora" dourado
  - Inputs com fundo branco e bordas arredondadas

### Detalhes Tecnicos

**Arquivos novos:**
- `src/pages/admin/AdminConfig.tsx`
- `src/assets/logo.webp` (copiado do upload)

**Arquivos modificados:**
- `src/App.tsx` -- nova rota /admin/configuracoes
- `src/components/AdminLayout.tsx` -- link Configuracoes no menu
- `src/pages/admin/AdminVendedores.tsx` -- codigo=nome, campo senha, AlertDialog para exclusao
- `src/pages/admin/AdminAlunos.tsx` -- botao excluir matricula
- `src/pages/admin/AdminDashboard.tsx` -- comissao sem filtro de status
- `src/pages/admin/AdminCursos.tsx` -- upload de materiais
- `src/pages/vendedor/VendedorDashboard.tsx` -- comissao sem filtro de status
- `src/pages/PublicMatricula.tsx` -- redesign completo
- `supabase/functions/create-vendedor/index.ts` -- salvar senha_gerada

**Migrations necessarias:**
1. Adicionar coluna `senha_gerada` em `vendedores`
2. Adicionar policy DELETE em `matriculas` para admin
3. Alterar `matriculas.vendedor_id` para nullable + ON DELETE SET NULL
4. Criar bucket `curso-materiais` e tabela `curso_materiais`
