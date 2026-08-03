# Corrigir página pública de inscrição que ora carrega, ora dá erro

## Diagnóstico (confirmado no banco)

O comportamento intermitente tem uma causa clara: **depende de quem está logado no navegador**.

Nas correções de segurança recentes, as políticas de leitura pública das tabelas `vendedores`, `profiles` e `indicadores` foram removidas (dados sensíveis como CPF/PIX estavam expostos). No lugar delas foram criadas duas funções seguras que devolvem apenas `id` e `nome`:

- `get_vendedor_public(codigo)`
- `get_indicador_public(slug)`

Porém as páginas públicas **não foram migradas** para usar essas funções — elas ainda fazem consulta direta:

- `src/pages/PublicMatricula.tsx`: `from("vendedores").select("*, profiles:user_id(nome)")`
- `src/pages/PublicIndicacao.tsx`: `from("indicadores").select("*")`

Políticas atuais confirmadas no banco:
- `vendedores` SELECT: só admin, ou o próprio vendedor (`auth.uid() = user_id`)
- `indicadores`: só admin
- `profiles`: só admin ou o próprio usuário
- `cursos` SELECT: público (por isso os cursos aparecem, mas o vendedor não)

Resultado:

```text
Visitante anônimo (aluno)              -> bloqueado -> "Link inválido ou vendedor não encontrado"
Admin logado no mesmo navegador        -> permitido -> página carrega normalmente
Vendedor logado abrindo o próprio link -> carrega
Vendedor logado abrindo link de outro  -> erro
```

Ou seja: quando você testa logado, funciona; quando o aluno abre (ou você abre em aba anônima), dá erro. Não é instabilidade de rede nem da hospedagem.

## Correção

1. `src/pages/PublicMatricula.tsx`
   - Trocar a consulta direta em `vendedores` por `supabase.rpc("get_vendedor_public", { _codigo: codigo })`.
   - Usar `id` e `nome` retornados para preencher o vendedor e o texto "Consultor".
   - Manter a busca de `cursos` como está (leitura pública já permitida).
   - Em caso de erro/sem resultado, manter a mensagem de link inválido.

2. `src/pages/PublicIndicacao.tsx`
   - Trocar a consulta direta em `indicadores` por `supabase.rpc("get_indicador_public", { _slug: slug })`.
   - Usar `id` no insert da matrícula e `nome` no texto "Você foi indicado por".

3. Verificação
   - Abrir `/r/{codigo}/{slug-do-curso}` sem sessão e confirmar que o formulário carrega com o nome do consultor e o curso.
   - Repetir para um link `/i/{slug}` de indicador.
   - Enviar uma matrícula de teste anônima para confirmar que o insert continua funcionando.

Nenhuma alteração de banco é necessária — as funções seguras já existem e já têm permissão de execução para visitantes anônimos.