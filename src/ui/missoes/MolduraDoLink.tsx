import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { propsDaCorDaMarca, type TemaDaPrevia } from './marcaNoLink.ts'

interface MolduraDoLinkProps {
  readonly children: ReactNode
  /** A cor da nutricionista (spec marca-no-link, D-956); nula, a ação de sempre. */
  readonly cor?: string | null
  /** A prévia de "Sua marca": o celular claro ou o escuro. */
  readonly previa?: TemaDaPrevia | undefined
}

/**
 * A raiz do link do paciente. CA-757 (spec revisao-geral-publica): o conteúdo da tela é a região principal. Na prévia,
 * o celular é um pedaço da tela de "Sua marca": sem a altura da tela inteira e sem região principal, no escopo do tema
 * dele. Com a cor dela, a raiz leva a classe e as variáveis da marca (`propsDaCorDaMarca`).
 */
export function MolduraDoLink({ children, cor = null, previa }: MolduraDoLinkProps) {
  const marca = propsDaCorDaMarca(cor)
  if (previa) {
    return (
      <div className={previa === 'escuro' ? 'dark' : 'tema-claro'}>
        <div data-link-do-paciente="" className={cn('bg-background px-4 pt-5 pb-8 text-foreground', marca.className)} style={marca.style}>
          {children}
        </div>
      </div>
    )
  }
  return (
    <div data-link-do-paciente="" className={cn('min-h-dvh bg-background px-4 py-8', marca.className)} style={marca.style}>
      <main className="mx-auto w-full max-w-md">{children}</main>
    </div>
  )
}
