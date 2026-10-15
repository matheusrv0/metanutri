import { Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

interface DialogoDocumentoProps {
  readonly titulo: string
  readonly aoFechar: () => void
  /** A folha. Ela fica dentro de `.area-impressao`: só ela chega ao papel. */
  readonly children: ReactNode
}

/**
 * Prévia de uma folha curta antes de imprimir (spec anamnese-e-prescricoes), pelo mesmo caminho da dieta:
 * na caixa de impressão do navegador, "Salvar como PDF" gera o arquivo.
 */
export function DialogoDocumento({ titulo, aoFechar, children }: DialogoDocumentoProps) {
  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto print:max-h-none print:overflow-visible print:border-0 print:p-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Na janela de impressão, “Salvar como PDF” gera o arquivo.</DialogDescription>
        </DialogHeader>

        <div className="area-impressao border border-border print:border-0">{children}</div>

        <DialogFooter className="print:hidden">
          <Button variant="ghost" onClick={aoFechar}>
            Fechar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Imprimir ou salvar em PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
