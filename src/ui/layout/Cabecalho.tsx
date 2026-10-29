import { ChevronRight, Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@ds/componentes/forms/button.tsx'

export interface PassoTrilha {
  readonly rotulo: string
  readonly aoClicar: () => void
}

interface CabecalhoProps {
  readonly titulo: string
  /** Caminho até a tela atual (ex.: Planos). O título fecha a trilha. */
  readonly trilha?: readonly PassoTrilha[] | undefined
  readonly acoes?: ReactNode
  /** Se os dados já estão na nuvem (spec dados-na-nuvem, D-129). */
  readonly situacao?: ReactNode
  readonly aoAbrirMenu: () => void
}

/** Cabeça de página: trilha fina, título e ações. */
export function Cabecalho({ titulo, trilha, acoes, situacao, aoAbrirMenu }: CabecalhoProps) {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:static print:backdrop-blur-none">
      <div className="mx-auto flex min-h-16 max-w-[1400px] items-center gap-3 px-4 py-2 sm:px-8">
        <Button variant="ghost" size="icon" className="xl:hidden print:hidden" onClick={aoAbrirMenu} aria-label="Abrir menu">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
        {/* M-005: com o título em 2 linhas, o bloco encosta no alto; o respiro de cima devolve os 44 px de toque da trilha,
            cuja área invisível (o `::before`) passa da borda da tela (CA-790). */}
        <div className="min-w-0 flex-1 max-sm:pt-1.5">
          {trilha && trilha.length > 0 ? (
            <nav aria-label="Você está em">
              <ol className="rotulo flex items-center gap-1">
                {trilha.map((p) => (
                  <li key={p.rotulo} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={p.aoClicar}
                      className="relative rounded-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:before:absolute max-sm:before:-inset-x-2 max-sm:before:-top-3.5 max-sm:before:-bottom-5 max-sm:before:content-[''] sm:pointer-coarse:before:absolute sm:pointer-coarse:before:-inset-x-2 sm:pointer-coarse:before:-top-3.5 sm:pointer-coarse:before:-bottom-5 sm:pointer-coarse:before:content-['']"
                    >
                      {p.rotulo}
                    </button>
                    <ChevronRight className="size-3" aria-hidden="true" />
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          {/* M-005 (spec ajustes-mobile, D-801): o nome do plano ou do paciente quebra em até 2 linhas, em vez de virar
              "Ana — r…", e vai inteiro no `title`. */}
          <h1 className="line-clamp-2 break-words text-lg leading-tight sm:text-xl" title={titulo}>
            {titulo}
          </h1>
        </div>
        {/* M-005: no celular, "Salvo" desce para baixo das ações, e o título fica com a largura que sobra. */}
        <div className="flex shrink-0 items-center gap-3 max-sm:flex-col-reverse max-sm:items-end max-sm:gap-0.5">
          {situacao}
          {/* D-240: no papel, só a trilha e o título; os botões ficam na tela. */}
          {acoes ? <div className="flex shrink-0 items-center gap-2 print:hidden">{acoes}</div> : null}
        </div>
      </div>
    </header>
  )
}
