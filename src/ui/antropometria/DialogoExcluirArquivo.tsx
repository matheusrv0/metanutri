import { Trash } from 'lucide-react'
import { anguloNaFrase } from '@/domain/fotosDaAvaliacao.ts'
import type { ArquivoDaAvaliacao } from '@/domain/tipos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

/** O arquivo a excluir e se é foto ou anexo; `null` mantém a janela fechada. */
export type ArquivoAExcluir = { readonly tipo: 'foto' | 'anexo'; readonly arquivo: ArquivoDaAvaliacao } | null

interface DialogoExcluirArquivoProps {
  readonly alvo: ArquivoAExcluir
  readonly aoConfirmar: () => void
  readonly aoFechar: () => void
}

/** D-1509 e CA-50: excluir uma foto ou um anexo sempre pede confirmação. */
export function DialogoExcluirArquivo({ alvo, aoConfirmar, aoFechar }: DialogoExcluirArquivoProps) {
  const foto = alvo?.tipo === 'foto'
  const titulo = alvo === null ? '' : foto ? `Excluir a foto de ${anguloNaFrase(alvo.arquivo.angulo)}?` : `Excluir “${alvo.arquivo.nome}”?`
  return (
    <Dialog open={alvo !== null} onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent role="alertdialog">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {foto ? 'A foto sai do prontuário e do armazenamento. Não é possível desfazer.' : 'O anexo sai do prontuário e do armazenamento. Não é possível desfazer.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={aoFechar} autoFocus>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={aoConfirmar}>
            <Trash aria-hidden="true" />
            {foto ? 'Excluir foto' : 'Excluir anexo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
