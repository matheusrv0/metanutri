import { useState } from 'react'
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import type { ResultadoDaExclusao } from '../estado/usarExclusaoDaConta.ts'
import type { ExtraDoPedido } from '../publico/conta/usarVerificacao.ts'
import { FormularioExcluirConta } from './FormularioExcluirConta.tsx'

interface DialogoExcluirContaProps {
  readonly aberto: boolean
  /** CA-803: assinatura do Mercado Pago que ainda cobra; a exclusão a cancela. */
  readonly pagaNaOperadora: boolean
  readonly excluir: (senha: string, extra: ExtraDoPedido) => Promise<ResultadoDaExclusao>
  readonly aoBaixarBackup: () => void
  readonly aoFechar: () => void
}

/**
 * A janela de excluir a conta (spec exclusao-de-conta, D-250, CA-802 a CA-811). "Manter conta" recebe o foco: é a
 * escolha que não apaga nada. Enquanto o pedido corre, ela não fecha. Rola por dentro em tela baixa.
 */
export function DialogoExcluirConta({ aberto, pagaNaOperadora, excluir, aoBaixarBackup, aoFechar }: DialogoExcluirContaProps) {
  const [enviando, setEnviando] = useState(false)
  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir || enviando ? undefined : aoFechar())}>
      <DialogContent iconeFechar={<IconeMarca nome="fechar" />} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Excluir sua conta?</DialogTitle>
          <DialogDescription>Tudo sai da nuvem na hora, e não dá para desfazer.</DialogDescription>
        </DialogHeader>
        <FormularioExcluirConta
          pagaNaOperadora={pagaNaOperadora}
          excluir={excluir}
          aoBaixarBackup={aoBaixarBackup}
          aoFechar={aoFechar}
          enviando={enviando}
          aoMudarEnviando={setEnviando}
        />
      </DialogContent>
    </Dialog>
  )
}
