import { Logo } from '@ds/componentes/display/Logo.tsx'
import type { ReactNode } from 'react'

/*
 * As telas de conta (criar, entrar, senha) no desenho aprovado: o formulário à
 * esquerda e, à direita, em cinza, o que a pessoa leva (spec estilo-spora, CA-127 e CA-135).
 */
interface MolduraContaProps {
  readonly titulo: string
  readonly subtitulo: string
  readonly passo?: { readonly atual: number; readonly total: number } | undefined
  readonly lado?: ReactNode
  /** Sem ele, a logo não é link (a tela do código prende até confirmar, D-93). */
  readonly aoIrParaInicio?: (() => void) | undefined
  /** Um aviso no topo, antes do título (spec separacao-site-app, DP-SA-49). */
  readonly aviso?: ReactNode
  readonly children: ReactNode
}

export function MolduraConta({ titulo, subtitulo, passo, lado, aoIrParaInicio, aviso, children }: MolduraContaProps) {
  return (
    <div className="min-h-dvh bg-background px-4 py-10 sm:px-8 sm:py-16">
      {/* D-237 (spec revisao-geral-publica): coluna que encolhe (DESIGN.md). Sem o minmax, um e-mail longo alargava a
          coluna e o formulário saía cortado pelo cartão. */}
      <div className="mx-auto grid max-w-[1000px] grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl bg-card lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <main className="flex min-w-0 flex-col gap-4 p-6 sm:p-10">
          {aoIrParaInicio ? (
            <button
              type="button"
              onClick={aoIrParaInicio}
              aria-label="MetaNutri, início"
              className="inline-flex min-h-11 w-fit items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Logo tamanho={24} />
            </button>
          ) : (
            <div className="inline-flex min-h-11 w-fit items-center">
              <Logo tamanho={24} />
            </div>
          )}
          {passo ? (
            <div role="img" aria-label={`Passo ${passo.atual} de ${passo.total}`} className="flex gap-1.5">
              {Array.from({ length: passo.total }, (_, i) => (
                <span key={i} className={i < passo.atual ? 'h-1.5 flex-1 rounded-full bg-primary' : 'h-1.5 flex-1 rounded-full bg-surfacerow'} />
              ))}
            </div>
          ) : null}
          {aviso}
          <div>
            <h1 className="text-3xl font-bold leading-tight">{titulo}</h1>
            <p className="mt-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">{subtitulo}</p>
          </div>
          {children}
        </main>
        {lado ? <aside className="flex flex-col justify-between gap-4 bg-surfacerow p-6 sm:p-8">{lado}</aside> : null}
      </div>
    </div>
  )
}
