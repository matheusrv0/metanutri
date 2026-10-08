import { Fragment, type ReactNode } from 'react'
import { ProvedorAcompanhamentos } from './ProvedorAcompanhamentos.tsx'
import { ProvedorCasos } from './ProvedorCasos.tsx'
import { ProvedorPacientes } from './ProvedorPacientes.tsx'

interface ProvedoresDeDadosProps {
  /** A conta cujos dados aparecem; `null` sem sessão ou sem servidor de conta. */
  readonly usuarioId: string | null
  readonly children: ReactNode
}

/**
 * Planos, pacientes e acompanhamentos da conta que entrou, e as telas que mostram esses dados.
 * Os provedores e as telas leem o armazenamento ao montar: trocar de conta remonta tudo aqui
 * dentro no mesmo render em que a sessão muda, e nada da conta anterior aparece, nem por um
 * instante (spec dados-por-conta, CB-120). As telas de conta ficam de fora: a sessão que chega
 * no meio de um fluxo, como o código da troca de senha, não as recomeça (DP-11).
 */
export function ProvedoresDeDados({ usuarioId, children }: ProvedoresDeDadosProps) {
  return (
    <Fragment key={usuarioId ?? 'aparelho'}>
      <ProvedorCasos>
        <ProvedorPacientes>
          <ProvedorAcompanhamentos usuarioId={usuarioId}>{children}</ProvedorAcompanhamentos>
        </ProvedorPacientes>
      </ProvedorCasos>
    </Fragment>
  )
}
