import type { TravaDaNuvem as Trava } from '@/domain/sincronia.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { DialogoSair } from '../conta/DialogoSair.tsx'
import { COPIA_GRANDE_DEMAIS } from '../estado/mensagemDoBanco.ts'
import type { ValorConta } from '../estado/usarConta.ts'
import { useSaida } from '../estado/usarSaida.ts'

/** D-130: a frase em duas partes, título e texto; juntas, é a frase da spec. */
const SEM_INTERNET = ['Sem internet.', 'Suas últimas mudanças ainda não foram salvas na nuvem. Conecte-se para continuar.'] as const

/** CA-445: a frase de sempre da trava de tamanho, partida depois da primeira frase. */
function partesDoTamanho(): readonly [string, string] {
  const fim = COPIA_GRANDE_DEMAIS.indexOf('. ') + 1
  return [COPIA_GRANDE_DEMAIS.slice(0, fim), COPIA_GRANDE_DEMAIS.slice(fim + 1)]
}

interface TravaDaNuvemProps {
  readonly trava: Trava
  readonly conta: Pick<ValorConta, 'sair'>
  readonly aoSaiu: () => void
  readonly aoReduzir: () => void
}

const impedir = (evento: Event) => evento.preventDefault()

/**
 * A capa da área de trabalho (spec dados-na-nuvem): sem internet (D-130, CA-477) ou com a cópia grande
 * demais (CB-123). É modal e não fecha: prende o foco e o clique, e a área de trás sai do alcance.
 * Destrava sozinha quando a nuvem aceita a cópia. "Sair" é o único caminho até o CA-479 (DP-10); na
 * de tamanho, "Reduzir os dados" tira a capa para a pessoa apagar o que não precisa (DP-9).
 */
export function TravaDaNuvem({ trava, conta, aoSaiu, aoReduzir }: TravaDaNuvemProps) {
  const saida = useSaida(conta, aoSaiu)
  const [titulo, texto] = trava === 'sem-internet' ? SEM_INTERNET : partesDoTamanho()

  return (
    <>
      <Dialog open onOpenChange={() => undefined}>
        <DialogContent semFechar aria-modal="true" onEscapeKeyDown={impedir} onPointerDownOutside={impedir} onInteractOutside={impedir}>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle> <DialogDescription>{texto}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => void saida.pedirSair()} disabled={saida.saindo}>
              {saida.saindo ? 'Saindo…' : 'Sair'}
            </Button>
            {trava === 'grande-demais' ? <Button onClick={aoReduzir}>Reduzir os dados</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DialogoSair aberto={saida.perguntando} saindo={saida.saindo} aoFicar={saida.ficar} aoSairMesmoAssim={() => void saida.sairMesmoAssim()} />
    </>
  )
}
