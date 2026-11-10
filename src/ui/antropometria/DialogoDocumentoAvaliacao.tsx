import { Printer } from 'lucide-react'
import { useId } from 'react'
import { documentoDaAvaliacao, rascunhoDoDiagnostico, type EntradaDoDocumento } from '@/domain/documentoDaAvaliacao.ts'
import type { AssinaturaDaFolha } from '@/domain/folhaDieta.ts'
import type { DadosDaAvaliacao } from '@/domain/tipos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { FolhaAvaliacao } from './FolhaAvaliacao.tsx'

interface DialogoDocumentoAvaliacaoProps {
  readonly entrada: EntradaDoDocumento
  readonly assinatura: AssinaturaDaFolha
  readonly proposta: boolean
  /** Grava o diagnóstico e as observações na avaliação (D-1432). */
  readonly aoAlterar: (mudanca: Partial<DadosDaAvaliacao>) => void
  readonly aoFechar: () => void
}

const vazioParaNulo = (texto: string): string | null => (texto === '' ? null : texto)

/**
 * A prévia do "Documento da avaliação" (spec antropometria-telas, D-1429 e D-1432): o diagnóstico e as observações são
 * campos da prévia, gravados na avaliação, que não saem no papel como campo; a folha fica dentro de `.area-impressao`
 * (só ela chega ao papel) e "Salvar em PDF" abre a impressão do navegador.
 */
export function DialogoDocumentoAvaliacao({ entrada, assinatura, proposta, aoAlterar, aoFechar }: DialogoDocumentoAvaliacaoProps) {
  const id = useId()
  const documento = documentoDaAvaliacao(entrada)
  const { diagnostico, observacoesDaMedida } = entrada.atual.caso.avaliacao
  const rascunho = diagnostico ? '' : rascunhoDoDiagnostico(entrada.atual.caso)
  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto print:max-h-none print:overflow-visible print:border-0 print:p-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Documento da avaliação</DialogTitle>
          <DialogDescription>Na janela de impressão, “Salvar como PDF” gera o arquivo.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 print:hidden">
          <div className="grid gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor={`${id}-diagnostico`}>Diagnóstico nutricional</Label>
              {rascunho ? (
                <Button size="sm" variant="outline" onClick={() => aoAlterar({ diagnostico: rascunho })}>
                  Usar o resumo das classificações
                </Button>
              ) : null}
            </div>
            <Textarea id={`${id}-diagnostico`} value={diagnostico ?? ''} onChange={(e) => aoAlterar({ diagnostico: vazioParaNulo(e.target.value) })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-observacoes`}>Observações da medida</Label>
            <Textarea
              id={`${id}-observacoes`}
              className="min-h-16"
              value={observacoesDaMedida ?? ''}
              onChange={(e) => aoAlterar({ observacoesDaMedida: vazioParaNulo(e.target.value) })}
            />
          </div>
        </div>

        <div className="area-impressao border border-border print:border-0">
          <FolhaAvaliacao documento={documento} assinatura={assinatura} proposta={proposta} data={entrada.atual.data} />
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="ghost" onClick={aoFechar}>
            Fechar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Salvar em PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
