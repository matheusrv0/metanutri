import type { FaseDaNuvem } from '@/domain/sincronia.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { DialogoSair } from '../conta/DialogoSair.tsx'
import type { ValorConta } from '../estado/usarConta.ts'
import { useSaida } from '../estado/usarSaida.ts'

const TEXTOS: Readonly<Record<Exclude<FaseDaNuvem, 'pronta'>, string>> = {
  abrindo: 'Carregando seus dados…',
  // CA-484: a entrada não trouxe os dados; o motor tenta de novo quando a internet volta.
  'sem-conexao': 'Sem internet. Conecte-se para abrir seus dados.',
  // Uma cópia gravada por uma versão mais nova do MetaNutri não é sobrescrita por esta.
  'formato-desconhecido': 'A cópia na nuvem está num formato que este MetaNutri não entende.',
}

interface TelaAbrindoDadosProps {
  readonly fase: Exclude<FaseDaNuvem, 'pronta'>
  /** Para o "Sair" das telas que não abriram (DP-25). */
  readonly conta: Pick<ValorConta, 'sair'>
  readonly aoSaiu: () => void
}

/**
 * O que aparece no lugar da área de trabalho enquanto os dados da nuvem não chegaram (spec dados-na-nuvem).
 * Sem internet ou com a cópia num formato desconhecido, dá para sair (DP-25); com dado que nunca subiu,
 * a saída pergunta antes (CA-479).
 */
export function TelaAbrindoDados({ fase, conta, aoSaiu }: TelaAbrindoDadosProps) {
  const saida = useSaida(conta, aoSaiu)
  return (
    <div className="grid min-h-dvh place-content-center justify-items-center gap-4 bg-background px-6 text-center text-sm text-muted-foreground">
      <p role={fase === 'abrindo' ? 'status' : 'alert'}>{TEXTOS[fase]}</p>
      {fase === 'abrindo' ? null : (
        <>
          <Button variant="outline" onClick={() => void saida.pedirSair()} disabled={saida.saindo}>
            {saida.saindo ? 'Saindo…' : 'Sair'}
          </Button>
          <DialogoSair aberto={saida.perguntando} saindo={saida.saindo} aoFicar={saida.ficar} aoSairMesmoAssim={() => void saida.sairMesmoAssim()} />
        </>
      )}
    </div>
  )
}
