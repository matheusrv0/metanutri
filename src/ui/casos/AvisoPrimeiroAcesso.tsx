import { BookOpen, Cloud, HardDrive, Stethoscope } from 'lucide-react'
import { useState } from 'react'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { useNuvem } from '../estado/contextoNuvem.ts'
import { CHAVE_AVISO_NUVEM } from '../nuvem/chavesDosAvisos.ts'

/** Por conta: quem nunca usou o aparelho vê o aviso, mesmo que outra conta já tenha visto (CB-122). */
export const CHAVE_AVISO_VISTO = 'metanutri:aviso-inicial-visto'

function jaViu(armazenamento: Armazenamento | null): boolean {
  try {
    return armazenamento?.getItem(CHAVE_AVISO_VISTO) === '1'
  } catch {
    return false
  }
}

const PONTOS = [
  { icone: BookOpen, texto: 'O MetaNutri apoia o estudo e o planejamento alimentar.' },
  { icone: Stethoscope, texto: 'A prescrição é responsabilidade do nutricionista.' },
] as const

/** Onde os casos ficam: na nuvem, com conta (spec dados-na-nuvem, D-128); no modo local, só no aparelho. */
const ONDE_FICAM = {
  nuvem: { icone: Cloud, texto: 'Os casos ficam salvos na nuvem, presos à sua conta.' },
  aparelho: { icone: HardDrive, texto: 'Os casos ficam salvos só neste aparelho e navegador. Nada é enviado para a internet.' },
} as const

/** CA-51: aviso mostrado no primeiro acesso, até a pessoa confirmar que leu. */
export function AvisoPrimeiroAcesso() {
  const armazenamento = useArmazenamento()
  const [aberto, setAberto] = useState(() => !jaViu(armazenamento))
  const naNuvem = useNuvem() !== null
  const pontos = [...PONTOS, naNuvem ? ONDE_FICAM.nuvem : ONDE_FICAM.aparelho]

  const confirmar = () => {
    setAberto(false)
    try {
      armazenamento?.setItem(CHAVE_AVISO_VISTO, '1')
      // Quem é novo e já leu que os casos ficam na nuvem não precisa do aviso de quem já usava (DP-26).
      if (naNuvem) armazenamento?.setItem(CHAVE_AVISO_NUVEM, '1')
    } catch {
      // armazenamento bloqueado: o aviso volta na próxima visita, o que é aceitável
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && confirmar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Boas-vindas ao MetaNutri</DialogTitle>
          <DialogDescription>Antes de começar, três pontos importantes:</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-3">
          {pontos.map(({ icone: Icone, texto }) => (
            <li key={texto} className="flex items-start gap-3 text-sm">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-lightprimary text-primary">
                <Icone className="size-4" aria-hidden="true" />
              </span>
              <span className="pt-1.5">{texto}</span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button onClick={confirmar}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
