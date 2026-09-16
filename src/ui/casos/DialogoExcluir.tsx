import { Trash } from 'lucide-react'
import { Button } from '../componentes/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../componentes/dialog.tsx'

interface DialogoExcluirProps {
  /** Nome do caso a excluir; `null` mantém a janela fechada. */
  readonly nome: string | null
  readonly aoConfirmar: () => void
  readonly aoFechar: () => void
}

/** CA-50: excluir sempre pede confirmação. */
export function DialogoExcluir({ nome, aoConfirmar, aoFechar }: DialogoExcluirProps) {
  return (
    <Dialog open={nome !== null} onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent role="alertdialog">
        <DialogHeader>
          <DialogTitle>Excluir “{nome}”?</DialogTitle>
          <DialogDescription>O caso e o plano alimentar serão apagados deste aparelho. Não dá para desfazer.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={aoFechar} autoFocus>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={aoConfirmar}>
            <Trash aria-hidden="true" />
            Excluir caso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
