import type { ReactNode } from 'react'
import { LEAD } from './estiloDaLanding.ts'

interface PassoDeComoFuncionaProps {
  readonly frase: string
  readonly chamada: ReactNode
  readonly larga?: boolean
  readonly children: ReactNode
}

/**
 * Um passo de "Como funciona": a frase, o que se digita ou se abre no app (a chamada) e o fragmento de interface com a
 * resposta, recuado como a resposta de uma conversa.
 */
export function PassoDeComoFunciona({ frase, chamada, larga = false, children }: PassoDeComoFuncionaProps) {
  return (
    <div data-surge="" className="grid gap-3.5">
      <p className={`${LEAD} font-semibold tracking-[-0.01em]`}>{frase}</p>
      <div className={`rounded-xl bg-landing-afundado p-[18px] ${LEAD} font-semibold text-landing-teal-claro`}>{chamada}</div>
      <div
        data-ui=""
        className={`ml-[52px] max-[720px]:ml-0 ${
          larga ? 'w-[min(720px,calc(100vw-2*var(--landing-margem)-52px))] max-[1100px]:w-auto max-[1100px]:max-w-[720px] max-[720px]:w-full' : ''
        }`}
      >
        {children}
      </div>
    </div>
  )
}
