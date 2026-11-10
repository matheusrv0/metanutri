import { gorduraDoCaso } from '@/domain/indicadoresDeGordura.ts'
import { protocoloPorId } from '@/domain/protocolosDeDobras.ts'
import { resultadoAntropometrico } from '@/domain/resultadoAntropometrico.ts'
import type { Caso } from '@/domain/tipos.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { cn } from '@ds/lib/cn.ts'
import { COLUNAS_DO_RESULTADO, LinhaDoResultado } from './LinhaDoResultado.tsx'
import { apresentarLinha, gruposDoResultado, opcoesDaGorduraDoCaso } from './textosDaAvaliacao.ts'

interface CartaoResultadoProps {
  /** O plano como vale (com a ficha). */
  readonly caso: Caso
}

/**
 * "Resultado" (spec antropometria-telas, D-1416 e D-1417): as linhas do motor em quatro grupos, na ordem dele, com o
 * valor, a recomendação, o selo e a fonte. O cabeçalho diz de onde vem a gordura.
 */
export function CartaoResultado({ caso }: CartaoResultadoProps) {
  const opcoes = opcoesDaGorduraDoCaso(caso)
  const gordura = gorduraDoCaso(caso, opcoes)
  const conversao = gordura?.detalhes.find((d) => d.rotulo === 'Conversão')
  const metodoDaGordura = gordura ? (conversao?.tipo === 'texto' ? `${gordura.metodo} · ${conversao.texto}` : gordura.metodo) : null
  const protocolo = protocoloPorId(caso.composicao.protocolo)
  const deOnde = gordura?.origem === 'bioimpedancia' ? 'Gordura pela bioimpedância' : protocolo ? `Gordura por ${protocolo.nome}` : null
  const grupos = gruposDoResultado(resultadoAntropometrico(caso, opcoes))
  const contexto = { metodoDaGordura, pontoDaCintura: caso.medidasCorporais.pontoDaCintura }

  return (
    <section aria-labelledby="titulo-resultado">
      <Card className="gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <CardTitle id="titulo-resultado">Resultado</CardTitle>
          {deOnde && caso.condicao.tipo !== 'gestante' ? <span className="text-sm text-muted-foreground sm:ml-auto">{deOnde}</span> : null}
        </div>
        <div role="table" aria-label="Resultado da avaliação" className="grid">
          <div role="rowgroup" className="hidden sm:grid">
            <div role="row" className={cn(COLUNAS_DO_RESULTADO, 'pb-1 text-xs text-muted-foreground')}>
              <span role="columnheader">Indicador</span>
              <span role="columnheader" className="text-right">
                Real
              </span>
              <span role="columnheader">Recomendação</span>
              <span role="columnheader">Situação</span>
            </div>
          </div>
          {grupos.map((g) => (
            <div key={g.id} role="rowgroup" className="grid">
              <div role="row" className="grid">
                <span role="cell" aria-colspan={4} className="pb-0.5 pt-3.5 text-xs font-semibold text-muted-foreground">
                  {g.nome}
                </span>
              </div>
              {g.linhas.map((l) => (
                <LinhaDoResultado key={l.id} linha={apresentarLinha(l, contexto)} />
              ))}
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
