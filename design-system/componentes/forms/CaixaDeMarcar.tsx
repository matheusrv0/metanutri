import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

/*
 * A caixa de marcar do sistema: a do navegador, na cor da ação (`accent-primary`, teal no claro, marfim no escuro),
 * dentro do rótulo, que é a área de toque de 44 px no celular e no tablet (spec ajustes-mobile, D-802). O rótulo pode
 * ficar só para o leitor de tela quando a linha já diz o que se marca (`rotuloOculto`). `marcada="misto"` é o
 * "algumas marcadas" do "Marcar todas".
 */
interface CaixaDeMarcarProps {
  readonly rotulo: ReactNode
  readonly marcada: boolean | 'misto'
  readonly aoMudar: (marcada: boolean) => void
  readonly rotuloOculto?: boolean | undefined
  readonly desativada?: boolean | undefined
  /** O id do texto que explica a caixa (o motivo da linha, por exemplo). */
  readonly descritaPor?: string | undefined
  readonly className?: string | undefined
}

export function CaixaDeMarcar({ rotulo, marcada, aoMudar, rotuloOculto = false, desativada = false, descritaPor, className }: CaixaDeMarcarProps) {
  const caixa = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (caixa.current) caixa.current.indeterminate = marcada === 'misto'
  }, [marcada])

  return (
    <label
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center gap-2.5 text-sm text-foreground sm:min-h-9 sm:pointer-coarse:min-h-11',
        rotuloOculto && 'justify-center',
        desativada ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <input
        ref={caixa}
        type="checkbox"
        checked={marcada === true}
        disabled={desativada}
        aria-describedby={descritaPor}
        onChange={(e) => aoMudar(e.target.checked)}
        className="size-5 shrink-0 cursor-[inherit] accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
      />
      <span className={rotuloOculto ? 'sr-only' : 'min-w-0'}>{rotulo}</span>
    </label>
  )
}
