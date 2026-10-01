import type { ReactNode } from 'react'

interface CaixaDeclaracaoProps {
  readonly id: string
  readonly marcada: boolean
  readonly aoMudar: (marcada: boolean) => void
  readonly invalido?: boolean | undefined
  readonly children: ReactNode
}

/** Caixa de declaração ou de aceite: o texto inteiro é clicável. */
export function CaixaDeclaracao({ id, marcada, aoMudar, invalido = false, children }: CaixaDeclaracaoProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={marcada}
        aria-invalid={invalido}
        onChange={(e) => aoMudar(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--brand-primary)]"
      />
      <span>{children}</span>
    </label>
  )
}
