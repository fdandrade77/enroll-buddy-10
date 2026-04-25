## Problema

A tela **Vendedor → Cursos** já gera o link novo com slug (`/r/{codigo}/{slug}`), mas a seção **"Gerar Link de Matrícula"** no **Dashboard do Vendedor** ainda usa o formato antigo `/r/{codigo}?curso_id={uuid}`. Foi de lá que você gerou o link que veio errado.

Trecho atual em `src/pages/vendedor/VendedorDashboard.tsx`:

```ts
value={linkCurso !== "all" ? `${link}?curso_id=${linkCurso}` : link}
```

## Correção

Atualizar o Dashboard do Vendedor para montar o link usando o `slug` do curso selecionado, igual à tela de Cursos:

- Quando "Geral" estiver selecionado → `https://site.com/r/{codigo_ref}` (sem curso fixado)
- Quando um curso específico for selecionado → `https://site.com/r/{codigo_ref}/{slug-do-curso}`
- Caso raro de um curso antigo sem slug → cair de volta para `?curso_id={uuid}` para não quebrar

### Arquivo alterado

| Arquivo | Mudança |
|---|---|
| `src/pages/vendedor/VendedorDashboard.tsx` | Trocar a montagem do link (Input readonly + botão Copiar) para usar `cursos.find(c => c.id === linkCurso)?.slug` no lugar de `?curso_id=` |

### Observação

A rota `/r/:codigo/:cursoSlug` já existe em `App.tsx` e o `PublicMatricula.tsx` já resolve o curso pelo slug, então nenhuma outra mudança é necessária. Cursos criados antes do campo slug existir já tiveram slug preenchido pela migration de backfill.