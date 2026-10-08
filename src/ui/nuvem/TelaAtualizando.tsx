import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

const impedir = (evento: Event) => evento.preventDefault()

/**
 * CB-127 (spec dados-na-nuvem): ao voltar para a aba, a área espera a conferência da nuvem antes de deixar
 * editar (DP-20). É um instante: modal, sem fechar, e o foco volta para onde estava quando termina.
 */
export function TelaAtualizando() {
  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent semFechar aria-modal="true" aria-describedby={undefined} className="max-w-xs" onEscapeKeyDown={impedir} onPointerDownOutside={impedir} onInteractOutside={impedir}>
        <DialogHeader className="flex-row items-center gap-3 pr-0">
          <PontosDaMarca pulsando />
          <DialogTitle className="text-base">Atualizando…</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
