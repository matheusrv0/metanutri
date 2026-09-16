import { BookOpen, HardDrive, Stethoscope } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../componentes/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../componentes/dialog.tsx'

export const CHAVE_AVISO_VISTO = 'metanutri:aviso-inicial-visto'

function jaViu(): boolean {
  try {
    return globalThis.localStorage?.getItem(CHAVE_AVISO_VISTO) === '1'
  } catch {
    return false
  }
}

const PONTOS = [
  { icone: BookOpen, texto: 'O MetaNutri apoia o estudo e o planejamento alimentar.' },
  { icone: Stethoscope, texto: 'A prescrição é responsabilidade do nutricionista.' },
  { icone: HardDrive, texto: 'Os casos ficam salvos só neste aparelho e navegador. Nada é enviado para a internet.' },
] as const

/** CA-51: aviso mostrado no primeiro acesso, até a pessoa confirmar que leu. */
export function AvisoPrimeiroAcesso() {
  const [aberto, setAberto] = useState(() => !jaViu())

  const confirmar = () => {
    setAberto(false)
    try {
      globalThis.localStorage?.setItem(CHAVE_AVISO_VISTO, '1')
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
          {PONTOS.map(({ icone: Icone, texto }) => (
            <li key={texto} className="flex items-start gap-3 text-sm">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-xs border border-primary/30 bg-lightprimary text-primary">
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
