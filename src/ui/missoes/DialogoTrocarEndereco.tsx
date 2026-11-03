import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

interface DialogoTrocarEnderecoProps {
  readonly aberto: boolean
  readonly aoFechar: () => void
  readonly aoConfirmar: () => void
  /** "Juliana"; vazio sem nome. */
  readonly primeiroNome: string
  /** O e-mail do link que funciona, mascarado ("j•••a@gmail.com"); nulo sem e-mail, ou com o e-mail devolvido. */
  readonly emailMascarado: string | null
  readonly ocupado?: boolean
}

/**
 * "Trocar o endereço?" (spec lado-do-paciente, D-1215, CA-2223): para quando o link vazou. Com e-mail no link, o
 * endereço novo vai na hora pelo S4; sem, o diálogo manda pelo WhatsApp.
 */
export function DialogoTrocarEndereco({ aberto, aoFechar, aoConfirmar, primeiroNome, emailMascarado, ocupado = false }: DialogoTrocarEnderecoProps) {
  const quem = primeiroNome.trim() || 'O paciente'
  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : aoFechar())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Trocar o endereço?</DialogTitle>
          <DialogDescription className="text-foreground">O endereço atual deixa de abrir.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-foreground [overflow-wrap:anywhere]">
          {emailMascarado ? `${quem} recebe o novo em ${emailMascarado}.` : 'Sem e-mail que funcione: mande o novo pelo WhatsApp.'}
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button loading={ocupado} onClick={aoConfirmar}>
            Trocar o endereço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
