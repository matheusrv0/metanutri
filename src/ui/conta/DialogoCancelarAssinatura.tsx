import { useRef, useState } from 'react'
import type { Assinatura } from '@/domain/assinatura.ts'
import { valeAteSeCancelar } from '@/domain/assinaturaTextos.ts'
import { planoPorId } from '@/domain/conta.ts'
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import type { ResultadoDaMudanca } from '../estado/usarAssinatura.ts'
import { AvisoPagamento } from '../pagamento/AvisoPagamento.tsx'

interface DialogoCancelarAssinaturaProps {
  readonly aberto: boolean
  readonly assinatura: Assinatura
  readonly cancelar: () => Promise<ResultadoDaMudanca>
  readonly aoFechar: () => void
  readonly aoCancelada: () => void
}

/** CA-377 e CA-378: a confirmação diz até quando o plano vale; "Manter assinatura" vem primeiro e recebe o foco. */
export function DialogoCancelarAssinatura({ aberto, assinatura, cancelar, aoFechar, aoCancelada }: DialogoCancelarAssinaturaProps) {
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)
  const ativa = assinatura.status === 'ativa'
  const nome = planoPorId(ativa ? assinatura.plano : assinatura.planoPedido)?.nome ?? 'pago'
  const ate = valeAteSeCancelar(assinatura)

  const confirmar = async () => {
    // CB-92: o segundo clique não sai.
    if (enviandoRef.current) return
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    const resultado = await cancelar()
    enviandoRef.current = false
    setEnviando(false)
    if (resultado.ok) aoCancelada()
    else setErro(resultado.erro)
  }

  const fechar = () => {
    if (enviandoRef.current) return
    setErro(null)
    aoFechar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : fechar())}>
      <DialogContent iconeFechar={<IconeMarca nome="fechar" />}>
        <DialogHeader>
          <DialogTitle>Cancelar a assinatura?</DialogTitle>
          <DialogDescription>
            {!ativa
              ? `A assinatura do plano ${nome} para e nada mais é cobrado. Você continua no plano Free.`
              : ate
              ? `O plano ${nome} continua até ${ate}, o fim do período já pago. Depois você volta para o Free, sem perder nenhum plano.`
              : `O plano ${nome} continua até o fim do período já pago. Depois você volta para o Free, sem perder nenhum plano.`}
          </DialogDescription>
        </DialogHeader>
        {erro ? <AvisoPagamento tipo="erro">{erro}</AvisoPagamento> : null}
        <DialogFooter>
          <Button onClick={fechar} disabled={enviando}>
            Manter assinatura
          </Button>
          <Button variant="lighterror" onClick={() => void confirmar()} disabled={enviando} aria-busy={enviando || undefined}>
            {enviando ? <PontosDaMarca pulsando /> : null}
            Cancelar assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
