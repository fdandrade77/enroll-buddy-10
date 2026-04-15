

## Correcao: Remover despesas do vendedor fixo

### Problema

No calculo do "Fechamento dia 17", vendedores com modelo **fixo** estao tendo despesas de trafego e FATEB descontadas da comissao. O usuario confirmou que vendedores fixos **nao tem essas despesas** — apenas vendedores de comissao parcelada.

### Alteracao

**Arquivo**: `src/pages/admin/AdminDashboard.tsx` (linhas 234-238)

Condicionar as despesas globais (trafego + FATEB) ao modelo parcelado. Para modelo fixo, zerar essas despesas:

```typescript
// Despesas globais só para modelo parcelado
const despesaTrafego = modelo === 'fixo' ? 0 : Number(v.despesa_trafego_padrao ?? 0);
const despesaFateb = modelo === 'fixo' ? 0 : Number(v.despesa_fateb_padrao ?? 0);
```

Isso garante que vendedores fixos mostrem apenas despesas específicas de matricula (se houver), sem desconto de trafego/FATEB.

