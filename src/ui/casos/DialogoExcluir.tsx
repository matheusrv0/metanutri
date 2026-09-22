import { Trash } from 'lucide-react'
import { Button } from '../componentes/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../componentes/dialog.tsx'

interface DialogoExcluirProps {
  /** Nome do que vai ser excluído; `null` mantém a janela fechada. */
  readonly nome: string | null
  /** O que some e o que isso afeta. Sem informar, fala do plano alimentar. */
  readonly descricao?: string
  /** Texto do botão que confirma. Sem informar, "Excluir plano". */
  readonly acao?: string
  readonly aoConfirmar: () => void
  readonly aoFechar: () => void
}

/** CA-50: excluir sempre pede confirmação. Serve a plano e a produto. */
export function DialogoExcluir({
  nome,
  descricao = 'O plano alimentar será apagado deste aparelho. Não dá para desfazer.',
  acao = 'Excluir plano',
  aoConfirmar,
  aoFechar,
}: DialogoExcluirProps) {
  return (
    <Dialog open={nome !== null} onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent role="alertdialog">
        <DialogHeader>
          <DialogTitle>Excluir “{nome}”?</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={aoFechar} autoFocus>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={aoConfirmar}>
            <Trash aria-hidden="true" />
            {acao}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
