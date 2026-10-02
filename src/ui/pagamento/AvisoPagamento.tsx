import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'

/** Erro ou confirmação no checkout e em Conta e plano, com o ícone da marca (CA-383). Erro é `alert`; confirmação é `status`. */
export function AvisoPagamento({ tipo, children }: { readonly tipo: 'erro' | 'ok'; readonly children: ReactNode }) {
  const erro = tipo === 'erro'
  return (
    <div role={erro ? 'alert' : 'status'} className={cn('flex items-start gap-2.5 rounded-lg p-3.5 text-sm', erro ? 'bg-lighterror text-errortext' : 'bg-lightsuccess text-successtext')}>
      <IconeMarca nome={erro ? 'alerta' : 'check'} className="mt-0.5 size-4" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
