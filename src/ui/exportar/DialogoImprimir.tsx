import { Printer } from 'lucide-react'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { Button } from '../componentes/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../componentes/dialog.tsx'
import { FolhaDieta } from './FolhaDieta.tsx'

interface DialogoImprimirProps {
  readonly aberto: boolean
  readonly caso: Caso
  readonly plano: Plano
  readonly aoFechar: () => void
}

/**
 * Pré-visualização da dieta antes de imprimir.
 * Na caixa de impressão do navegador, "Salvar como PDF" gera o arquivo, sem depender de biblioteca.
 */
export function DialogoImprimir({ aberto, caso, plano, aoFechar }: DialogoImprimirProps) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto print:max-h-none print:overflow-visible print:border-0 print:p-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Dieta para imprimir</DialogTitle>
          <DialogDescription>Na janela de impressão, escolha “Salvar como PDF” para entregar ao paciente pelo celular.</DialogDescription>
        </DialogHeader>

        <div className="area-impressao border border-fio print:border-0">
          <FolhaDieta caso={caso} plano={plano} />
        </div>

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
