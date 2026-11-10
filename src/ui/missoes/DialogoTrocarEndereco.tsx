import { useState } from 'react'
import { CaixaDeMarcar } from '@ds/componentes/forms/CaixaDeMarcar.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

interface DialogoTrocarEnderecoProps {
  readonly aberto: boolean
  readonly aoFechar: () => void
  /** `mandar`: a caixa "Mandar o endereço novo para…" ficou marcada (D-1248). */
  readonly aoConfirmar: (mandar: boolean) => void
  /** O e-mail da ficha que funciona, mascarado ("j•••a@gmail.com"); nulo sem e-mail na ficha, ou com ele devolvido. */
  readonly emailDaFicha: string | null
  readonly ocupado?: boolean
}

/**
 * "Trocar o endereço?" (spec lado-do-paciente, D-1215, D-1248, CA-2223, CB-1230): para quando o link vazou. A troca
 * devolve o link ao e-mail da ficha; o endereço novo só vai por e-mail (o S4) se a nutricionista marcar a caixa, que vem
 * desmarcada. Sem e-mail na ficha, o diálogo manda pelo WhatsApp.
 */
export function DialogoTrocarEndereco({ aberto, aoFechar, aoConfirmar, emailDaFicha, ocupado = false }: DialogoTrocarEnderecoProps) {
  const [mandar, setMandar] = useState(false)
  const fechar = () => {
    setMandar(false)
    aoFechar()
  }
  const confirmar = () => {
    const escolha = emailDaFicha !== null && mandar
    setMandar(false)
    aoConfirmar(escolha)
  }
  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : fechar())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Trocar o endereço?</DialogTitle>
          <DialogDescription className="text-foreground">O endereço atual deixa de abrir, e o link do paciente volta ao e-mail da ficha.</DialogDescription>
        </DialogHeader>
        {emailDaFicha ? (
          <CaixaDeMarcar rotulo={<span className="[overflow-wrap:anywhere]">{`Mandar o endereço novo para ${emailDaFicha}`}</span>} marcada={mandar} aoMudar={setMandar} />
        ) : (
          <p className="text-sm text-foreground">Sem e-mail na ficha: mande o novo pelo WhatsApp.</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={fechar}>
            Cancelar
          </Button>
          <Button loading={ocupado} onClick={confirmar}>
            Trocar o endereço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
