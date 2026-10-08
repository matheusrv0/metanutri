import { useState } from 'react'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { CHAVE_AVISO_VISTO } from '../casos/AvisoPrimeiroAcesso.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { useNuvem } from '../estado/contextoNuvem.ts'
import { CHAVE_AVISO_NUVEM } from './chavesDosAvisos.ts'

const viu = (armazenamento: Armazenamento | null, chave: string): boolean => {
  try {
    return armazenamento?.getItem(chave) === '1'
  } catch {
    return false
  }
}

/**
 * Spec dados-na-nuvem, DP-26: quem já usava o MetaNutri (viu o aviso de primeiro acesso, que dizia que
 * nada ia para a internet) fica sabendo uma vez que os dados agora ficam na nuvem. Guardado na conta.
 */
export function AvisoNuvem() {
  const armazenamento = useArmazenamento()
  const naNuvem = useNuvem() !== null
  const [aberto, setAberto] = useState(() => naNuvem && viu(armazenamento, CHAVE_AVISO_VISTO) && !viu(armazenamento, CHAVE_AVISO_NUVEM))

  const confirmar = () => {
    setAberto(false)
    try {
      armazenamento?.setItem(CHAVE_AVISO_NUVEM, '1')
    } catch {
      // armazenamento bloqueado: o aviso volta na próxima vez, o que é aceitável
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && confirmar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seus planos e pacientes agora ficam salvos na nuvem, presos à sua conta.</DialogTitle>{' '}
          <DialogDescription>Assim você abre tudo em qualquer aparelho.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={confirmar}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
