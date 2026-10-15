import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@ds/lib/cn.ts'

/*
 * O que é opcional fica recolhido numa linha cinza e abre com um clique.
 * Serve para a tela mostrar só o que se usa sempre (spec pdf-e-telas-limpas, D-53),
 * sem esconder nada: o conteúdo continua no DOM e abre sozinho quando já tem dado
 * (quem chama decide pelo `abertoInicial`).
 *
 * Com `aberto` e `aoAlternar`, quem chama controla o estado (spec anamnese-e-prescricoes,
 * CA-563: "Abrir tudo" e "Recolher tudo" de uma lista de blocos). Sem eles, o estado é do
 * próprio componente, como sempre foi.
 */
interface RecolhivelProps {
  readonly titulo: string
  /** Uma linha abaixo do título dizendo o que tem dentro. */
  readonly resumo?: string | undefined
  readonly abertoInicial?: boolean | undefined
  /** Estado controlado por quem chama; ignora `abertoInicial`. */
  readonly aberto?: boolean | undefined
  readonly aoAlternar?: ((aberto: boolean) => void) | undefined
  readonly children: ReactNode
  readonly className?: string | undefined
}

export function Recolhivel({ titulo, resumo, abertoInicial = false, aberto: controlado, aoAlternar, children, className }: RecolhivelProps) {
  const [proprio, setProprio] = useState(abertoInicial)
  const id = useId()
  const aberto = controlado ?? proprio
  const alternar = () => {
    if (controlado === undefined) setProprio(!aberto)
    aoAlternar?.(!aberto)
  }
  return (
    <div className={cn('rounded-lg bg-surfacerow', className)}>
      <button
        type="button"
        onClick={alternar}
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
