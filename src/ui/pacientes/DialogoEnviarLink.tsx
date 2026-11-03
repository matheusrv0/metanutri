import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

interface DialogoEnviarLinkProps {
  readonly aberto: boolean
  readonly aoFechar: () => void
  readonly aoEnviar: () => void
  /** O e-mail do link, inteiro: é a nutricionista que confere (o endereço é da ficha dela). */
  readonly email: string
  /** O S2 leva o pedido de aceite dos avisos oferecidos e ainda não aceitos (CA-2243). */
  readonly comConvite: boolean
  readonly enviando: boolean
  /** A recusa do servidor ("Você chegou a 30 e-mails hoje. Amanhã volta.", CA-2262); nula sem recusa. */
  readonly erro: string | null
}

/** "Enviar o link por e-mail" (spec lado-do-paciente, D-1224, CA-2262): o S2, pelo servidor. */
export function DialogoEnviarLink({ aberto, aoFechar, aoEnviar, email, comConvite, enviando, erro }: DialogoEnviarLinkProps) {
  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : aoFechar())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar o link por e-mail</DialogTitle>
          <DialogDescription className="text-foreground [overflow-wrap:anywhere]">{`Enviar o link para ${email}?`}</DialogDescription>
        </DialogHeader>
        {comConvite ? <p className="text-sm text-muted-foreground">O e-mail leva também o pedido de aceite dos avisos.</p> : null}
        {erro ? (
          <Alert variant="warning" role="alert">
            {erro}
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button loading={enviando} disabled={erro !== null} onClick={aoEnviar}>
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
