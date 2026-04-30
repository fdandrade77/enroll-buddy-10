# Mostrar todas as informações da matrícula na lista de alunos do vendedor

## Onde
A "lista de alunos" do vendedor é a tabela de matrículas em `src/pages/vendedor/VendedorDashboard.tsx` (atualmente mostra apenas: Nome, CPF, Curso, Tipo Pgto, Parcelas, Vencimento, Comissão, Status, Data).

## O que falta
Hoje vários campos da matrícula não aparecem (Email, WhatsApp, Valor total, Indicador, etc.) e os custos da matrícula (despesas) também não.

## Mudanças propostas

### 1. Tabela principal — adicionar todas as colunas da matrícula
Adicionar/garantir as seguintes colunas (todas vêm de `matriculas` + joins já feitos):

- Nome completo
- CPF
- Email
- WhatsApp
- Curso
- Valor total (R$ — `valor_total` da matrícula, snapshot)
- Tipo de pagamento (À vista / Parcelado)
- Qtd. parcelas
- Data de vencimento
- Status (Pago / Não pago)
- Comissão total (com expansão de parcelas, como já existe)
- Data da matrícula (criado_em)

Como ficam muitas colunas, manter o `overflow-x-auto` que já existe e usar `whitespace-nowrap` nas células-chave para não quebrar layout em telas menores.

### 2. Linha expandida — mostrar detalhes extras
Ao clicar para expandir uma matrícula (já existe o expand das parcelas de comissão), além das parcelas mostrar um bloco "Detalhes da matrícula" com:

- ID da matrícula (curto, últimos 8 chars)
- Indicador (se houver) — buscar nome via `indicadores` (novo fetch leve filtrando pelos `indicador_id` presentes)
- Despesas da matrícula (`despesas_matricula` já carregadas) — listar tipo, descrição e valor
- Total de despesas da matrícula
- Resumo financeiro: Valor total – Total despesas – Comissão = Líquido (apenas informativo p/ o vendedor)

### 3. Exportação CSV
Atualizar o `exportCSV` para incluir todas as novas colunas (Email, WhatsApp, Valor total, Indicador) mantendo o nome do arquivo `minhas-matriculas.csv`.

### 4. Sem mudanças de banco
Todos os dados já existem em `matriculas`, `cursos`, `comissoes_parcelas`, `despesas_matricula`. A única consulta nova é `indicadores` (apenas leitura, sem alteração de schema/RLS — já é público para `ativo = true` e podemos buscar só os necessários).

## Arquivo a editar
- `src/pages/vendedor/VendedorDashboard.tsx`

## Fora de escopo
- Permitir o vendedor editar matrículas (continua somente leitura, conforme regra atual).
- Mudar permissões/RLS.
