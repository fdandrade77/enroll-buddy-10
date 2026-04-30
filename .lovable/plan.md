## Objetivo

Garantir que o link gerado pelo vendedor seja **sempre** no formato `/r/{codigo_ref}/{slug-do-curso}`, eliminando qualquer chance de aparecer o formato antigo `?curso_id=...` e tornando o fluxo do Dashboard idêntico ao da tela "Meus Cursos".

## Situação atual (verificada no código)

- `VendedorDashboard.tsx` (linhas 221-243): já constrói `/r/{codigo_ref}/{slug}` quando há slug — mas tem fallback para `?curso_id={id}` se o curso não tiver slug.
- `VendedorCursos.tsx`: já lista todos os cursos com link individual `/r/{codigo_ref}/{slug}` e botão Copiar — funciona corretamente.
- Banco: todos os 5 cursos ativos têm slug preenchido, então o fallback nunca dispara hoje. Mas qualquer curso novo cadastrado sem slug quebraria o padrão.

## Mudanças propostas

### 1. `VendedorDashboard.tsx` — Reforçar o gerador de link

- **Tornar o curso obrigatório**: trocar a opção "Geral" por um placeholder "Selecione um curso" — o vendedor precisa escolher um curso antes do link aparecer.
- **Remover o fallback `?curso_id=`**: se um curso (improvável) não tiver slug, mostrar aviso "Este curso não tem apelido para link configurado — peça ao admin" em vez de gerar URL antiga.
- **Mostrar preview claro**: o input fica vazio até o vendedor escolher um curso; ao escolher, mostra `https://matriculafatebead.com.br/r/fernando/neuropsicanalise`.
- **Botão Copiar desabilitado** até ter um link válido.

### 2. `VendedorDashboard.tsx` — Adicionar lista rápida de links por curso

Logo abaixo do gerador, adicionar uma seção "Meus links por curso" listando **todos os cursos ativos** com:
- Nome do curso
- Link pronto: `/r/{codigo_ref}/{slug}`
- Botão "Copiar" individual em cada linha

Assim o vendedor não precisa nem usar o dropdown — vê todos os links de uma vez (mesmo comportamento da tela "Meus Cursos", trazido para o Dashboard).

### 3. `VendedorCursos.tsx` — Sem mudanças

Já está correto. Apenas confirmar visualmente que os links gerados batem com os do Dashboard.

### 4. Validação no Admin (`AdminCursos.tsx`)

Tornar o campo "Apelido para o link" (slug) **obrigatório** ao criar/editar curso, com geração automática a partir do nome se ficar em branco. Garante que nenhum curso futuro fique sem slug e quebre o padrão.

## Resultado final

Para o Fernando:
- `https://matriculafatebead.com.br/r/fernando/neuropsicanalise`
- `https://matriculafatebead.com.br/r/fernando/terapeuta-completo`
- `https://matriculafatebead.com.br/r/fernando/constelacao-familiar`

Para a Silvana:
- `https://matriculafatebead.com.br/r/silvana/neuropsicanalise`
- `https://matriculafatebead.com.br/r/silvana/terapeuta-completo`
- (etc., um link por curso ativo)

O formato `?curso_id=...` deixa de existir no sistema.

## Arquivos afetados

- `src/pages/vendedor/VendedorDashboard.tsx` — gerador refeito + lista por curso
- `src/pages/admin/AdminCursos.tsx` — slug obrigatório com auto-geração

Sem mudanças no banco, sem mudanças em RLS, sem mudanças em Edge Functions.
