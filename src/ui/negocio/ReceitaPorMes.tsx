import { marcasDoEixo, type BarraDeReceita } from '@/domain/negocio.ts'
import { marcaDoEixo, reais } from '@/domain/negocioTextos.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { GraficoBarras } from '@ds/componentes/display/GraficoBarras.tsx'

/** CA-350 e CA-351. */
export function ReceitaPorMes({ barras }: { readonly barras: readonly BarraDeReceita[] }) {
  const marcas = marcasDoEixo(Math.max(0, ...barras.map((b) => b.centavos))).map((c) => ({ valor: c, rotulo: marcaDoEixo(c) }))
  return (
    <section aria-labelledby="titulo-receita">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <CardTitle id="titulo-receita">Receita por mês</CardTitle>
          <p className="text-xs text-muted-foreground">Assinaturas ativas no fim de cada mês. O anual entra dividido por 12.</p>
        </div>
        <GraficoBarras
          descricao="Receita por mês"
          marcas={marcas}
          barras={barras.map((b) => ({
            chave: b.chave,
            rotulo: b.mes,
            valor: b.centavos,
            dica: `${b.mes} · ${reais(b.centavos)}`,
            destaque: b.atual,
            valorEscrito: b.atual ? reais(b.centavos) : undefined,
          }))}
        />
      </Card>
    </section>
  )
}
