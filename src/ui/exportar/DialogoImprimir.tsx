import { Printer } from 'lucide-react'
import { useId, useState } from 'react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { gravarOpcoesImpressao, lerOpcoesImpressao, type OpcoesImpressao } from '@/domain/folhaDieta.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Switch } from '@ds/componentes/forms/switch.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'
import { FolhaDieta } from './FolhaDieta.tsx'

interface DialogoImprimirProps {
  readonly aberto: boolean
  readonly caso: Caso
  readonly plano: Plano
  /** Restrições da ficha do paciente; a lista de trocas as respeita. */
  readonly restricoes?: string | undefined
  /** Quem assina o plano (spec ajustes-de-uso). */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
  readonly aoFechar: () => void
}

function Opcao({ titulo, texto, marcado, aoMudar }: { readonly titulo: string; readonly texto: string; readonly marcado: boolean; readonly aoMudar: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surfacerow px-4 py-3">
      <Switch id={id} checked={marcado} onCheckedChange={aoMudar} aria-describedby={`${id}-texto`} className="mt-0.5" />
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id}>{titulo}</Label>
        <p id={`${id}-texto`} className="text-xs text-muted-foreground">
          {texto}
        </p>
      </div>
    </div>
  )
}

/**
 * Prévia da dieta antes de imprimir, com o que mais vai junto (CA-317).
 * Na caixa de impressão do navegador, "Salvar como PDF" gera o arquivo.
 */
export function DialogoImprimir({ aberto, caso, plano, restricoes, assinatura, aoFechar }: DialogoImprimirProps) {
  const [opcoes, setOpcoes] = useState<OpcoesImpressao>(() => lerOpcoesImpressao(armazenamentoLocal()))

  const mudar = (mudanca: Partial<OpcoesImpressao>) => {
    const novas = { ...opcoes, ...mudanca }
    setOpcoes(novas)
    // CA-320 e CB-72: sem armazenamento, vale só para esta impressão.
    gravarOpcoesImpressao(armazenamentoLocal(), novas)
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto print:max-h-none print:overflow-visible print:border-0 print:p-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Dieta para imprimir</DialogTitle>
          <DialogDescription>As refeições, os lembretes, as orientações e a assinatura sempre vão. Marque o que mais quer entregar.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-2 print:hidden">
          <Opcao titulo="Lista de compras" texto="Os alimentos do dia com as quantidades." marcado={opcoes.listaDeCompras} aoMudar={(v) => mudar({ listaDeCompras: v })} />
          <Opcao titulo="Trocas" texto="Até 2 opções para cada alimento do plano." marcado={opcoes.trocas} aoMudar={(v) => mudar({ trocas: v })} />
        </div>

        <div className="area-impressao border border-border print:border-0">
          <FolhaDieta caso={caso} plano={plano} restricoes={restricoes} assinatura={assinatura} opcoes={opcoes} />
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
