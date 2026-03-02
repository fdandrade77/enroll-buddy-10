
## Plano Unificado: 5 Correcoes

### 1. Upload de arquivos com nomes especiais (sanitizacao + drag-and-drop)

**Arquivo**: `src/pages/admin/AdminCursos.tsx`

**Sanitizacao**:
- Criar funcao `sanitizeFileName(name)` que:
  - Separa extensao do nome base
  - Remove acentos via `normalize("NFD").replace(/[\u0300-\u036f]/g, "")`
  - Remove emojis e caracteres nao-ASCII
  - Substitui espacos por `-`
  - Mantem apenas `[a-zA-Z0-9._-]`
  - Fallback para `arquivo` se resultado ficar vazio
- Na funcao `handleUpload`, substituir `file.name` por nome sanitizado na chave do storage (linha 125)
- Manter `file.name` original no campo `nome_arquivo` do banco para exibicao

**Drag-and-drop**:
- Adicionar estado `dragging` para controle visual
- Criar funcao `processFiles(files: FileList)` extraindo a logica de upload do `handleUpload`
- Adicionar area com `onDragOver`, `onDragLeave`, `onDrop` no dialog de materiais
- Borda tracejada com feedback visual (cor muda ao arrastar)
- Reutilizar a mesma logica de validacao e upload

---

### 2. CRUD de administradores

**Nova Edge Function**: `supabase/functions/create-admin/index.ts`
- Similar a `create-vendedor`: valida que o chamador e admin, cria usuario no auth, insere em `profiles` e `user_roles` com role `admin`
- Campos: nome, email, senha

**Atualizar**: `src/pages/admin/AdminConfig.tsx`
- Adicionar secao "Gerenciar Administradores" com:
  - Listagem de admins (join `user_roles` + `profiles` onde role = admin)
  - Botao para adicionar novo admin (dialog com nome, email, senha)
  - Botao para excluir admin (chama `delete-vendedor` que ja deleta do auth, e depois remove de profiles/user_roles) -- exceto o proprio usuario logado
  - Usar `AlertDialog` para confirmacao de exclusao

---

### 3. Corrigir RLS de matriculas (INSERT)

**Migracao SQL**:
```sql
DROP POLICY "Anyone can create matriculas for active vendedores" ON public.matriculas;
CREATE POLICY "Anyone can create matriculas for active vendedores"
ON public.matriculas FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendedores v
    JOIN profiles p ON p.user_id = v.user_id
    WHERE v.id = matriculas.vendedor_id AND p.ativo = true
  )
);
```
Muda de RESTRICTIVE para PERMISSIVE, permitindo que visitantes anonimos facam inscricoes.

---

### 4. Nome do consultor na matricula publica

**Migracao SQL** (mesma migracao):
```sql
CREATE POLICY "Public can read vendedor profiles"
ON public.profiles FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM vendedores v
    WHERE v.user_id = profiles.user_id
  )
);
```
Permite que visitantes anonimos leiam o perfil de vendedores para exibir o nome do consultor no formulario de matricula.

---

### Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `src/pages/admin/AdminCursos.tsx` | Sanitizacao de nomes + drag-and-drop |
| `src/pages/admin/AdminConfig.tsx` | CRUD de administradores |
| `supabase/functions/create-admin/index.ts` | Nova Edge Function |
| Migracao SQL | Corrigir RLS matriculas + adicionar politica profiles |
