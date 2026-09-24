import { useId, useState } from 'react'
import { BookText, ChevronDown } from 'lucide-react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Procedência recolhida.
 *
 * A regra do produto é que nenhum número apareça sem dizer de onde veio. Mas a
 * citação inteira ao lado de cada linha ocupa mais espaço que o próprio dado e
 * afoga a leitura — num cartão com seis linhas, a fonte vira o conteúdo.
 *
 * Então a fonte sai da vista e fica a um clique, uma vez por cartão, com o rótulo
 * dizendo a qual dado ela pertence. Nada se perde: continua no DOM quando aberto,
 * continua no Word exportado e continua na tela de Ajuda.
 *
 * Não é tooltip de propósito: no celular não existe passar o cursor, e o sistema
 * proíbe esconder informação obrigatória só no hover.
 */
export interface ItemFonte {
  /** A qual dado a fonte pertence ("IMC", "Energia"). Some quando só há uma. */
  readonly rotulo?: string | undefined
  readonly texto: string
}

interface FontesProps {
  readonly itens: readonly ItemFonte[]
  readonly className?: string
}

export function Fontes({ itens, className }: FontesProps) {
  const [aberto, setAberto] = useState(false)
  const id = useId()

  if (itens.length === 0) return null

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={id}
        className="inline-flex w-fit items-center gap-1.5 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BookText className="size-3.5 shrink-0" aria-hidden="true" />
        {aberto ? 'Ocultar fontes' : itens.length === 1 ? 'Ver a fonte' : `Ver as ${itens.length} fontes`}
        <ChevronDown className={cn('size-3.5 shrink-0 transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
      </button>

      <ul id={id} hidden={!aberto} className="flex flex-col gap-1.5 text-xs leading-relaxed text-muted-foreground">
        {itens.map((item) => (
          <li key={`${item.rotulo ?? ''}${item.texto}`}>
            {item.rotulo ? <span className="font-medium text-foreground">{item.rotulo}: </span> : null}
            {item.texto}
          </li>
        ))}
      </ul>
    </div>
  )
}
