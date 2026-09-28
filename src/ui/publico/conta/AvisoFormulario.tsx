import { CheckCircle2, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Erro ou confirmação dentro de um formulário de conta. Erro é `alert`; confirmação é `status`. */
export function AvisoFormulario({ tipo, children }: { readonly tipo: 'erro' | 'ok'; readonly children: ReactNode }) {
  const erro = tipo === 'erro'
  return (
    <div role={erro ? 'alert' : 'status'} className={cn('flex items-start gap-2 rounded-xl p-3 text-sm', erro ? 'bg-lighterror text-errortext' : 'bg-lightprimary text-primary')}>
      {erro ? <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
