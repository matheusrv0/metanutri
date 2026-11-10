import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/** D-1306 e D-1349: a linha ao lado do "Cancelar" (o servidor não para quando o navegador desiste, D-1330). */
export const AVISO_DO_CANCELAR = 'Cancelar só fecha a espera; se a IA terminar, conta no limite.'

interface EsperaDaIaProps {
  /** `Date.now()` da saída do pedido. */
  readonly inicio: number
  readonly modo: 'gerar' | 'ajustar'
}

const relogio = (segundos: number): string => `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`

/**
 * D-1306: a espera honesta. O relógio em m:ss e as três etapas; a terceira (a conferência do app) acontece quando a
 * resposta chega, por isso fica por vir durante a espera.
 */
export function EsperaDaIa({ inicio, modo }: EsperaDaIaProps) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const decorrido = Math.max(0, Math.floor((agora - inicio) / 1000))
  const atual = decorrido < 1 ? 0 : 1
  const etapas = ['Pedido enviado, sem nome nem contato', modo === 'gerar' ? 'A IA monta as refeições' : 'A IA monta os ajustes', 'O app confere com a ficha e as regras']

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-1.5 py-7">
      <p className="text-base font-semibold text-heading">Montando a sugestão. Leva de 1 a 2 minutos.</p>
      <p className="numeros mb-3 mt-1 text-3xl font-bold tracking-tight text-heading" aria-label={`Tempo decorrido ${relogio(decorrido)}`}>
        {relogio(decorrido)}
      </p>
      <ol className="flex flex-col gap-2.5">
        {etapas.map((texto, i) => {
          const estado = i < atual ? 'feito' : i === atual ? 'agora' : 'depois'
          return (
            <li key={texto} className={cn('flex items-center gap-2.5 text-sm', estado === 'depois' ? 'text-muted-foreground' : 'text-foreground')}>
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-4 shrink-0 place-items-center rounded-full',
                  estado === 'feito' && 'bg-primary text-primary-foreground',
                  estado === 'agora' && 'ring-[1.5px] ring-inset ring-primary',
                  estado === 'depois' && 'ring-[1.5px] ring-inset ring-borderdefault',
                )}
              >
                {estado === 'feito' ? <Check className="size-3" strokeWidth={3} /> : null}
                {estado === 'agora' ? <span className="size-2 rounded-full bg-primary motion-safe:animate-pulse" /> : null}
              </span>
              {texto}
              <span className="sr-only">{estado === 'feito' ? ' (feito)' : estado === 'agora' ? ' (agora)' : ''}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
