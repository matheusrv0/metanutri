import { Fragment } from 'react'
import type { ColunaDoHistorico, HistoricoAntropometrico, VariacaoDaMedida } from '@/domain/historicoAntropometrico.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { cn } from '@ds/lib/cn.ts'

interface TabelaAvaliacoesProps {
  readonly historico: HistoricoAntropometrico
}

/**
 * Quais datas aparecem em cada largura (D-1440, como o protótipo): no computador, todas; no tablet, a primeira e a
 * atual; no celular, só a atual. As colunas "Desde" ficam sempre. Com uma avaliação só, ela é a atual.
 */
function classeDaData(coluna: ColunaDoHistorico, total: number): string {
  if (total === 1 || coluna.papel === 'atual') return ''
  if (coluna.papel === 'primeira') return 'max-sm:hidden'
  return 'max-lg:hidden'
}

const SUB_DA_DATA = { primeira: 'primeira', atual: 'atual' } as const

function CelulaDaVariacao({ variacao }: { readonly variacao: VariacaoDaMedida | null }) {
  if (variacao === null) return null
  return (
    <td className="border-t border-border py-2 max-sm:pl-2 pl-3 text-right align-middle">
      <b className={cn('block font-semibold', variacao.leitura === 'erro' ? 'font-medium text-muted-foreground' : 'text-heading')}>{variacao.texto}</b>
      {variacao.nota ? (
        <small className={cn('block text-xs leading-snug', variacao.leitura === 'real' ? 'text-successtext' : 'text-muted-foreground')}>{variacao.nota}</small>
      ) : null}
    </td>
  )
}

/**
 * "Avaliações" (spec antropometria-telas, D-1428, D-1481 e D-1486): uma coluna por data, da mais velha à mais nova, e as
 * variações "Desde <penúltima>" e "Desde <primeira>" com a nota de cada uma. Linha sem valor em nenhuma avaliação não
 * aparece (o domínio já tira).
 */
export function TabelaAvaliacoes({ historico }: TabelaAvaliacoesProps) {
  const { colunas, grupos, desdeAnterior, desdePrimeira, concordancia } = historico
  const total = colunas.length
  const nColunas = 1 + total + (desdeAnterior ? 1 : 0) + (desdePrimeira ? 1 : 0)
  return (
    <section aria-labelledby="titulo-avaliacoes" className="min-w-0">
      <Card className="gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <CardTitle id="titulo-avaliacoes">Avaliações</CardTitle>
          {concordancia ? <span className="text-sm text-muted-foreground sm:ml-auto">{concordancia}</span> : null}
        </div>
        <div className="-mx-5 overflow-x-auto px-5">
          <table aria-labelledby="titulo-avaliacoes" className="numeros w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="align-bottom text-xs text-muted-foreground">
                <th scope="col" className="pb-1.5 pr-3 text-left font-normal">
                  Medida
                </th>
                {colunas.map((c) => (
                  <th key={c.casoId} scope="col" className={cn('whitespace-nowrap pb-1.5 max-sm:pl-2 pl-3 text-right font-normal', classeDaData(c, total))}>
                    <b className="block text-[0.8125rem] font-semibold text-foreground">{c.data}</b>
                    {total > 1 && c.papel ? SUB_DA_DATA[c.papel] : null}
                  </th>
                ))}
                {desdeAnterior ? (
                  <th scope="col" className="pb-1.5 max-sm:pl-2 pl-3 text-right font-normal">
                    <b className="block text-[0.8125rem] font-semibold text-foreground">{desdeAnterior}</b>
                    última consulta
                  </th>
                ) : null}
                {desdePrimeira ? (
                  <th scope="col" className="pb-1.5 max-sm:pl-2 pl-3 text-right font-normal">
                    <b className="block text-[0.8125rem] font-semibold text-foreground">{desdePrimeira}</b>
                    primeira consulta
                  </th>
                ) : null}
              </tr>
            </thead>
            {grupos.map((g) => (
              <tbody key={g.nome}>
                <tr>
                  <td colSpan={nColunas} className="pb-1 pt-3.5 text-xs font-semibold text-muted-foreground">
                    {g.nome}
                  </td>
                </tr>
                {g.linhas.map((l) => (
                  <tr key={l.id}>
                    <th scope="row" className="border-t border-border py-2.5 pr-3 text-left align-middle font-normal">
                      {/* "Cintura/estatura" quebra depois da barra no celular, não no meio da palavra (pior caso, 390 px). */}
                      <b className="block font-semibold text-heading">
                        {l.nome.split('/').map((parte, i) => (
                          <Fragment key={parte}>
                            {i > 0 ? (
                              <>
                                /<wbr />
                              </>
                            ) : null}
                            {parte}
                          </Fragment>
                        ))}
                      </b>
                      {l.sub ? <small className="block text-xs leading-snug text-muted-foreground">{l.sub}</small> : null}
                    </th>
                    {l.textos.map((t, i) => {
                      const coluna = colunas[i]
                      const atual = i === total - 1
                      return (
                        <td
                          key={coluna?.casoId ?? i}
                          className={cn(
                            'whitespace-nowrap border-t border-border py-2.5 max-sm:pl-2 pl-3 text-right align-middle',
                            atual ? 'font-semibold text-heading' : 'text-foreground',
                            coluna ? classeDaData(coluna, total) : '',
                          )}
                        >
                          {t}
                        </td>
                      )
                    })}
                    {desdeAnterior ? <CelulaDaVariacao variacao={l.desdeAnterior} /> : null}
                    {desdePrimeira ? <CelulaDaVariacao variacao={l.desdePrimeira} /> : null}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Card>
    </section>
  )
}
