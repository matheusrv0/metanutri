import { Check, TriangleAlert } from 'lucide-react'
import type { MudancaMinimaDoHistorico } from '@/domain/historicoAntropometrico.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'

interface CartaoMudancaMinimaProps {
  readonly mudancaMinima: MudancaMinimaDoHistorico
}

/**
 * "Mudança mínima detectável" (spec antropometria-telas, D-1427 e D-1488): a MMD da soma das dobras, da cintura e do
 * quadril entre a penúltima e a última avaliação, com o ETM padrão da ISAK nível 1 (o ETM da avaliadora fica fora de
 * escopo), e as marcas do que concorda entre as duas.
 */
export function CartaoMudancaMinima({ mudancaMinima }: CartaoMudancaMinimaProps) {
  return (
    <section aria-labelledby="titulo-mmd" className="min-w-0">
      <Card className="h-full gap-3.5">
        <CardTitle id="titulo-mmd">Mudança mínima detectável</CardTitle>
        <p className="text-sm text-foreground">
          Abaixo dela, a diferença entre duas consultas pode ser só erro de medida. Calculada com o erro técnico de medida (ETM) e 95% de confiança.
        </p>
        <dl className="grid">
          {mudancaMinima.linhas.map((l, i) => (
            <div
              key={l.nome}
              className={
                i === 0
                  ? 'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 pb-2.5'
                  : 'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 border-t border-border py-2.5'
              }
            >
              <dt className="text-sm text-foreground">{l.nome}</dt>
              <dd className="numeros text-right text-lg font-semibold text-heading">{l.valor}</dd>
              <dd className="col-span-2 text-xs text-muted-foreground">{l.detalhe}</dd>
            </div>
          ))}
        </dl>
        {mudancaMinima.marcas.length > 0 ? (
          <ul className="grid gap-1.5 text-sm text-foreground">
            {mudancaMinima.marcas.map((m) => (
              <li key={m.texto} className="flex items-start gap-2">
                {m.concorda ? (
                  <Check className="mt-0.5 size-3.5 shrink-0 text-successtext" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warningtext" aria-hidden="true" />
                )}
                <span className="min-w-0">{m.texto}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-muted-foreground">
          MMD = 2,77 × ETM (Weir 2005). Sem ETM próprio, o app usa os limites da ISAK nível 1: 7,5% nas dobras e 1,5% nas outras medidas.
        </p>
      </Card>
    </section>
  )
}
