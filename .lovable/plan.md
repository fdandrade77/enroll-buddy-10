

## Correcoes: Comissao Fixa + Valor Mensal

### Alteracao 1 — AdminDashboard.tsx (Comissao fixa)

No calculo de `comissaoBruta` para modelo `fixo`, remover o filtro `.filter(m => m.status === 'pago')`. Vendedores fixos recebem comissao por toda matricula, independente do status do aluno.

### Alteracao 2 — VendedorDashboard.tsx (Valor Mensal)

No `calcMensal()`, filtrar parcelas pendentes para incluir apenas as de matriculas com `status === 'pago'`. Assim o card "Valor Mensal" mostra apenas o que sera efetivamente pago no dia 17 — a soma de 15% (ou percentual configurado) da proxima parcela pendente de cada aluno que esta em dia.

**Exemplo real**: Vendedora com 4 alunos pagos, curso de R$ 1.200 em 12x. Parcela = R$ 100, comissao = 15% = R$ 15/aluno. Valor Mensal = 4 x R$ 15 = R$ 60.

### Arquivos alterados

| Arquivo | Mudanca |
|---|---|
| `src/pages/admin/AdminDashboard.tsx` | Remover filtro `status === 'pago'` no calculo de comissao fixa |
| `src/pages/vendedor/VendedorDashboard.tsx` | Filtrar `calcMensal()` para so incluir parcelas de matriculas pagas |

