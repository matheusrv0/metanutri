import { ChevronRight, Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../componentes/button.tsx'

export interface PassoTrilha {
  readonly rotulo: string
  readonly aoClicar: () => void
}

interface CabecalhoProps {
  readonly titulo: string
  readonly subtitulo?: string | undefined
  /** Caminho até a tela atual (ex.: Meus casos). O título fecha a trilha. */
  readonly trilha?: readonly PassoTrilha[] | undefined
  readonly acoes?: ReactNode
  readonly aoAbrirMenu: () => void
}

/** Cabeça de página: trilha fina, título e, à direita, a seção corrente. */
export function Cabecalho({ titulo, subtitulo, trilha, acoes, aoAbrirMenu }: CabecalhoProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-fioforte bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex min-h-[64px] max-w-[1400px] items-center gap-3 px-4 py-2 sm:px-8">
        <Button variant="ghost" size="icon" className="xl:hidden" onClick={aoAbrirMenu} aria-label="Abrir menu">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
        <div className="min-w-0 flex-1">
          {trilha && trilha.length > 0 ? (
            <nav aria-label="Você está em">
              <ol className="rotulo flex items-center gap-1">
                {trilha.map((p) => (
                  <li key={p.rotulo} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={p.aoClicar}
                      className="rounded-xs hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {p.rotulo}
                    </button>
                    <ChevronRight className="size-3" aria-hidden="true" />
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <h1 className="truncate text-xl leading-tight">{titulo}</h1>
        </div>
        {subtitulo ? <p className="rotulo hidden max-w-56 truncate text-right md:block">{subtitulo}</p> : null}
        {acoes ? <div className="flex shrink-0 items-center gap-2">{acoes}</div> : null}
      </div>
    </header>
  )
}
