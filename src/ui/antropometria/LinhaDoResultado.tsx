import { Info } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '@ds/lib/cn.ts'
import { SeloDaSituacao } from './SeloDaSituacao.tsx'
import type { ApresentacaoDaLinha } from './textosDaAvaliacao.ts'

interface LinhaDoResultadoProps {
  readonly linha: ApresentacaoDaLinha
}

/** As colunas da tabela: no celular, nome e real numa linha, recomendação e situação na outra (D-1440). */
export const COLUNAS_DO_RESULTADO = 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1fr)_5.5rem_5.75rem_9.5rem]'

/**
 * Uma linha "Indicador | Real | Recomendação | Situação" (spec antropometria-telas, D-1417): o nome com o detalhe curto,
 * o valor nas casas do motor, a recomendação e o selo, ou a frase do que falta. O "ⓘ" abre embaixo a citação completa
 * da fonte, os avisos e os valores de apoio.
 */
export function LinhaDoResultado({ linha }: LinhaDoResultadoProps) {
  const id = useId()
  const [aberta, setAberta] = useState(false)
  const temFonte = linha.fonte !== null || linha.avisos.length > 0 || linha.apoio.length > 0
  return (
    <>
      <div role="row" className={cn(COLUNAS_DO_RESULTADO, 'items-center border-t border-border py-2.5 sm:min-h-12')}>
        <span role="rowheader" className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1 text-sm font-semibold text-heading">
            <span className="min-w-0">{linha.nome}</span>
            {temFonte ? (
              <button
                type="button"
                aria-label={`Fonte: ${linha.nome}`}
                aria-expanded={aberta}
                aria-controls={aberta ? `${id}-fonte` : undefined}
                onClick={() => setAberta((a) => !a)}
                className={cn(
                  'inline-grid size-5.5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'max-sm:-m-2.75 max-sm:size-11 sm:pointer-coarse:-m-2.75 sm:pointer-coarse:size-11',
                  aberta && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                )}
              >
                <Info className="size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </span>
          {linha.subtitulo ? <small className="text-xs leading-snug text-muted-foreground">{linha.subtitulo}</small> : null}
        </span>
        <span role="cell" className="numeros text-right text-sm font-semibold text-heading">
          {linha.real}
        </span>
        <span role="cell" className="text-xs text-muted-foreground sm:text-sm">
          {linha.recomendacao}
        </span>
        <span role="cell" className="flex min-w-0 justify-end text-right sm:justify-start sm:text-left">
          {linha.selo ? <SeloDaSituacao rotulo={linha.selo.rotulo} tom={linha.selo.tom} /> : <span className="text-xs leading-snug text-muted-foreground">{linha.nota}</span>}
        </span>
      </div>
      {aberta ? (
        <div role="row" className="grid">
          <div role="cell" aria-colspan={4} id={`${id}-fonte`} className="mb-2 grid gap-1.5 rounded-xl bg-surfacerow px-3.5 py-3 text-sm text-foreground">
            {linha.fonte ? <p>{`Fonte: ${linha.fonte.citacao}`}</p> : null}
            {linha.avisos.length > 0 ? (
              <ul className="grid list-disc gap-1 pl-4 text-muted-foreground">
                {linha.avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : null}
            {linha.apoio.length > 0 ? <p className="numeros text-muted-foreground">{linha.apoio.join(' · ')}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
