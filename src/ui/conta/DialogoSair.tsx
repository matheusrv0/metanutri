import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

interface DialogoSairProps {
  readonly aberto: boolean
  /** A saída já foi pedida e ainda não terminou: nenhum botão aceita outro clique. */
  readonly saindo?: boolean
  readonly aoFicar: () => void
  readonly aoSairMesmoAssim: () => void
}

/**
 * CA-479 (spec dados-na-nuvem): só aparece quando há mudança que não chegou à nuvem, porque sair
 * apaga a cópia de trabalho do navegador (D-131). "Ficar" vem primeiro e recebe o foco: é a escolha
 * que não perde nada.
 */
export function DialogoSair({ aberto, saindo = false, aoFicar, aoSairMesmoAssim }: DialogoSairProps) {
  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir || saindo ? undefined : aoFicar())}>
      <DialogContent iconeFechar={<IconeMarca nome="fechar" />}>
        <DialogHeader>
          <DialogTitle>Há mudanças que ainda não foram salvas na nuvem.</DialogTitle>{' '}
          <DialogDescription>Se sair agora, elas se perdem.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" autoFocus onClick={aoFicar} disabled={saindo}>
            Ficar
          </Button>
          <Button
            variant="destructive"
            // O segundo clique de um duplo clique em "Sair" cai neste botão, que aparece no mesmo lugar: não conta.
            onClick={(evento) => (evento.detail > 1 ? undefined : aoSairMesmoAssim())}
            disabled={saindo}
            aria-busy={saindo || undefined}
          >
            {saindo ? <PontosDaMarca pulsando /> : null}
            Sair mesmo assim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
