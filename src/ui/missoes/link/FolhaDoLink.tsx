import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@ds/componentes/overlay/sheet.tsx'
import { propsDaCorDaMarca } from '../marcaNoLink.ts'

interface FolhaDoLinkProps {
  readonly aberta: boolean
  readonly aoFechar: () => void
  readonly titulo: string
  /** A linha embaixo do título ("Juliana · com Ana Lima"); sem ela, nada. */
  readonly descricao?: ReactNode
  /** A cor da nutricionista: a folha sai da tela do link (portal) e leva a cor junto (D-956). */
  readonly cor: string | null
  /** O título fica escondido quando o conteúdo já tem o seu (a folha de instalar no iPhone). */
  readonly tituloVisivel?: boolean
  readonly children: ReactNode
}

/**
 * As folhas do link (spec lado-do-paciente, D-1212, D-1219 e D-1221): a gaveta de baixo do design system, com o
 * puxador, o título e o conteúdo. Ela é desenhada fora da tela do link (portal), então leva a cor da marca por conta
 * própria; o tema vem da página.
 */
export function FolhaDoLink({ aberta, aoFechar, titulo, descricao, cor, tituloVisivel = true, children }: FolhaDoLinkProps) {
  const marca = propsDaCorDaMarca(cor)
  return (
    <Sheet open={aberta} onOpenChange={(abrir) => (abrir ? undefined : aoFechar())}>
      <SheetContent
        side="bottom"
        {...(descricao ? {} : { 'aria-describedby': undefined })}
        className={cn('mx-auto max-h-[92dvh] w-full max-w-md gap-4 overflow-y-auto rounded-t-3xl px-5 pt-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]', marca.className)}
        style={marca.style}
      >
        <span aria-hidden="true" className="mx-auto h-1.25 w-10 shrink-0 rounded-full bg-borderstrong" />
        <div className={cn('flex flex-col gap-1 pr-10', tituloVisivel ? null : 'sr-only')}>
          <SheetTitle className="font-titulo text-xl font-extrabold tracking-tight">{titulo}</SheetTitle>
          {descricao ? <SheetDescription className="text-sm">{descricao}</SheetDescription> : null}
        </div>
        {children}
      </SheetContent>
    </Sheet>
  )
}
