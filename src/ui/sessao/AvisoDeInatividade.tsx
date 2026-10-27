import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

interface AvisoDeInatividadeProps {
  readonly aberto: boolean
  /** Fechar de qualquer jeito (o botão, o Esc, o X) conta como uso: a contagem recomeça. */
  readonly aoContinuar: () => void
}

/**
 * D-516 e CA-1442 (spec separacao-site-app): 2 minutos antes da saída sem uso. Texto mínimo (D-526). Qualquer tecla,
 * clique ou toque também conta como uso e fecha a janela (o vigia ouve a página inteira).
 */
export function AvisoDeInatividade({ aberto, aoContinuar }: AvisoDeInatividadeProps) {
  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : aoContinuar())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Você ainda está aí?</DialogTitle>
          <DialogDescription>A sessão termina em 2 minutos.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button autoFocus onClick={aoContinuar}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
