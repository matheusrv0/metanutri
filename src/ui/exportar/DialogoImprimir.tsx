import { Printer } from 'lucide-react'
import { useId, useState } from 'react'
import { modoDeQuantidade } from '@/domain/caso.ts'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { gravarOpcoesImpressao, lerOpcoesImpressao, type OpcoesImpressao } from '@/domain/folhaDieta.ts'
import { suplementosParaDocumento, type Suplemento } from '@/domain/suplementos.ts'
import type { Caso, ModoQuantidade, Plano } from '@/domain/tipos.ts'
import type { RestricoesDoPaciente } from '@/domain/restricoes.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Switch } from '@ds/componentes/forms/switch.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { ModoDasQuantidades } from '../plano/ModoDasQuantidades.tsx'
import { FolhaDieta } from './FolhaDieta.tsx'

interface DialogoImprimirProps {
  readonly aberto: boolean
  readonly caso: Caso
  readonly plano: Plano
  /** Restrições da ficha do paciente; a lista de trocas as respeita. */
  readonly restricoes?: RestricoesDoPaciente | undefined
  /** Quem assina o plano (spec ajustes-de-uso). */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
  /** Os suplementos da ficha do paciente (spec anamnese-e-prescricoes, CA-577). */
  readonly suplementos?: readonly Suplemento[] | undefined
  /** Troca o modo do plano (D-376); sem ele, a escolha vale só para esta impressão. */
  readonly aoMudarModo?: ((modo: ModoQuantidade) => void) | undefined
  readonly aoFechar: () => void
}

function Opcao({ titulo, texto, marcado, aoMudar }: { readonly titulo: string; readonly texto: string; readonly marcado: boolean; readonly aoMudar: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surfacerow px-4 py-3">
      <Switch id={id} checked={marcado} onCheckedChange={aoMudar} aria-labelledby={`${id}-titulo`} aria-describedby={`${id}-texto`} className="mt-0.5" />
      <Label htmlFor={id} className="min-h-11 flex-1 cursor-pointer flex-col items-start gap-0.5 font-normal leading-normal">
        <span id={`${id}-titulo`} className="text-sm font-semibold text-heading">{titulo}</span>
        <span id={`${id}-texto`} className="text-xs text-muted-foreground">{texto}</span>
      </Label>
    </div>
  )
}

/**
 * Prévia da dieta antes de imprimir, com o que mais vai junto (CA-317).
 * Na caixa de impressão do navegador, "Salvar como PDF" gera o arquivo.
 */
export function DialogoImprimir({ aberto, caso, plano, restricoes, assinatura, suplementos = [], aoMudarModo, aoFechar }: DialogoImprimirProps) {
  const armazenamento = useArmazenamento()
  const [opcoes, setOpcoes] = useState<OpcoesImpressao>(() => lerOpcoesImpressao(armazenamento))
  // CA-577: com suplementos na ficha, a opção aparece ligada a cada impressão; sem eles, nem aparece.
  const [comSuplementos, setComSuplementos] = useState(true)
  const temSuplementos = suplementosParaDocumento(suplementos).length > 0
  // D-376 (spec alimentos-e-gramaturas): a escolha da etapa Refeições também fica aqui. Sem quem grave no plano, vale só
  // nesta impressão.
  const [modoLocal, setModoLocal] = useState<ModoQuantidade | null>(null)
  const modo = aoMudarModo ? modoDeQuantidade(caso) : (modoLocal ?? modoDeQuantidade(caso))
  const mudarModo = (novo: ModoQuantidade) => (aoMudarModo ? aoMudarModo(novo) : setModoLocal(novo))

  const mudar = (mudanca: Partial<OpcoesImpressao>) => {
    const novas = { ...opcoes, ...mudanca }
    setOpcoes(novas)
    // CA-320 e CB-72: sem armazenamento, vale só para esta impressão.
    gravarOpcoesImpressao(armazenamento, novas)
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto print:max-h-none print:overflow-visible print:border-0 print:p-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Plano alimentar para imprimir</DialogTitle>
          <DialogDescription>Refeições, orientações e assinatura sempre entram. Escolha o que incluir além disso.</DialogDescription>
        </DialogHeader>

        <div className="print:hidden">
          <ModoDasQuantidades modo={modo} aoMudar={mudarModo} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 print:hidden">
          <Opcao titulo="Lista de compras" texto="Para 7 dias, no peso de compra." marcado={opcoes.listaDeCompras} aoMudar={(v) => mudar({ listaDeCompras: v })} />
          <Opcao titulo="Trocas" texto="Até 2 opções para cada alimento do plano." marcado={opcoes.trocas} aoMudar={(v) => mudar({ trocas: v })} />
          {temSuplementos ? (
            <Opcao titulo="Suplementos da ficha" texto="Os suplementos registrados na ficha do paciente." marcado={comSuplementos} aoMudar={setComSuplementos} />
          ) : null}
        </div>

        <div className="area-impressao border border-border print:border-0">
          <FolhaDieta caso={{ ...caso, quantidades: modo }} plano={plano} restricoes={restricoes} assinatura={assinatura} opcoes={opcoes} suplementos={comSuplementos ? suplementos : []} />
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
