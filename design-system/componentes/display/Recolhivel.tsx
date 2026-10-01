import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@ds/lib/cn.ts'

/*
 * O que é opcional fica recolhido numa linha cinza e abre com um clique.
 * Serve para a tela mostrar só o que se usa sempre (spec pdf-e-telas-limpas, D-53),
 * sem esconder nada: o conteúdo continua no DOM e abre sozinho quando já tem dado
 * (quem chama decide pelo `abertoInicial`).
 */
interface RecolhivelProps {
  readonly titulo: string
  /** Uma linha abaixo do título dizendo o que tem dentro. */
  readonly resumo?: string | undefined
  readonly abertoInicial?: boolean | undefined
  readonly children: ReactNode
  readonly className?: string | undefined
}

export function Recolhivel({ titulo, resumo, abertoInicial = false, children, className }: RecolhivelProps) {
  const [aberto, setAberto] = useState(abertoInicial)
  const id = useId()
  return (
    <div className={cn('rounded-lg bg-surfacerow', className)}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={id}
        className="flex min-h-14 w-full items-center gap-3 rounded-lg px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-heading">{titulo}</span>
          {resumo ? <span className="block text-xs text-muted-foreground">{resumo}</span> : null}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
      </button>
      <div id={id} hidden={!aberto} className="flex flex-col gap-4 px-4 pb-4">
        {children}
      </div>
    </div>
  )
}
