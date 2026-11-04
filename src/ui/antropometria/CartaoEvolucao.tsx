import type { SerieDoHistorico } from '@/domain/historicoAntropometrico.ts'
import { formatarNumero } from '@/domain/historicoAntropometrico.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { GraficoLinha } from '@ds/componentes/display/GraficoLinha.tsx'

interface CartaoEvolucaoProps {
  readonly graficos: readonly SerieDoHistorico[]
  /** A leitura em uma frase, pela MMD do motor (D-1483); `null` sem soma nem cintura comparáveis. */
  readonly leitura: string | null
}

/**
 * "Evolução" (spec antropometria-telas, D-1426, D-1484 e D-1487): um gráfico de linha por medida, sem segundo eixo, e
 * a leitura em frase embaixo. Avaliação sem o valor não vira ponto; sem ponto nenhum, o lugar do gráfico diz isso.
 */
export function CartaoEvolucao({ graficos, leitura }: CartaoEvolucaoProps) {
  return (
    <section aria-labelledby="titulo-evolucao" className="min-w-0">
      <Card className="h-full gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <CardTitle id="titulo-evolucao">Evolução</CardTitle>
          <span className="text-sm text-muted-foreground sm:ml-auto">Toque ou passe o cursor sobre uma data</span>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {graficos.map((g) => {
            const comPonto = g.pontos.some((p) => p.valor !== null)
            return (
              <figure key={g.id} className="m-0 grid min-w-0 content-start gap-2.5">
                <h3 className="text-sm font-semibold text-foreground">
                  {g.titulo} <span className="font-medium text-muted-foreground">{g.sub}</span>
                </h3>
                {comPonto ? (
                  <GraficoLinha
                    descricao={`${g.titulo}, ${g.sub}`}
                    pontos={g.pontos}
                    formatarMarca={(v) => formatarNumero(v, 0)}
                    rotuloDoUltimo={g.rotuloDoUltimo ?? ''}
                  />
                ) : (
                  <p className="grid h-56 place-items-center rounded-xl bg-surfacerow px-4 text-center text-sm text-muted-foreground sm:h-64">{g.vazio}</p>
                )}
                {g.nota ? <figcaption className="text-xs text-muted-foreground">{g.nota}</figcaption> : null}
              </figure>
            )
          })}
        </div>
        {leitura ? <p className="rounded-xl bg-surfacerow px-3.5 py-3 text-sm text-foreground">{leitura}</p> : null}
      </Card>
    </section>
  )
}
