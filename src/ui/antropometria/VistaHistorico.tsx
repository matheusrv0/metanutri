import type { HistoricoAntropometrico } from '@/domain/historicoAntropometrico.ts'
import { Card } from '@ds/componentes/display/card.tsx'
import { CartaoEvolucao } from './CartaoEvolucao.tsx'
import { CartaoMudancaMinima } from './CartaoMudancaMinima.tsx'
import { TabelaAvaliacoes } from './TabelaAvaliacoes.tsx'

interface VistaHistoricoProps {
  /** O Histórico do domínio (`historicoAntropometrico`), já montado pela tela (o resumo vai para a barra). */
  readonly historico: HistoricoAntropometrico
}

/**
 * A vista Histórico (spec antropometria-telas, D-1425 a D-1428): a evolução e a mudança mínima detectável lado a lado
 * (uma coluna abaixo de 1280 px), e a tabela das avaliações embaixo. Com menos de 2 avaliações, o aviso e a tabela.
 */
export function VistaHistorico({ historico }: VistaHistoricoProps) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {historico.comecaNaSegunda ? (
        <Card>
          <p className="text-sm text-foreground">O histórico começa na segunda avaliação.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_22.5rem]">
          <CartaoEvolucao graficos={historico.graficos} leitura={historico.leitura} />
          {historico.mudancaMinima ? <CartaoMudancaMinima mudancaMinima={historico.mudancaMinima} /> : null}
        </div>
      )}
      {historico.avaliacoes.length > 0 ? <TabelaAvaliacoes historico={historico} /> : null}
    </div>
  )
}
