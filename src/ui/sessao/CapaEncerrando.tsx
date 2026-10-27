import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

const impedir = (evento: Event) => evento.preventDefault()

/**
 * D-517, passo 1 (spec separacao-site-app): a tela fica coberta enquanto o que falta vai para a nuvem e a sessão sai,
 * para ninguém editar no meio. Modal, sem fechar, como "Atualizando…" (CB-127).
 */
export function CapaEncerrando() {
  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent semFechar aria-modal="true" aria-describedby={undefined} className="max-w-xs" onEscapeKeyDown={impedir} onPointerDownOutside={impedir} onInteractOutside={impedir}>
        <DialogHeader className="flex-row items-center gap-3 pr-0">
          <PontosDaMarca pulsando />
          <DialogTitle className="text-base">Encerrando a sessão…</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
