import type { AvaliacaoNaLista } from '@/domain/avaliacoesDoPaciente.ts'
import type { Paciente } from '@/domain/pacientes.ts'

interface VistaHistoricoProps {
  readonly avaliacoes: readonly AvaliacaoNaLista[]
  readonly paciente: Paciente
  /** AAAA-MM-DD. */
  readonly hoje: string
}

/** A vista Histórico (spec antropometria-telas, D-1425 a D-1428). */
export function VistaHistorico({ avaliacoes, paciente, hoje }: VistaHistoricoProps) {
  void paciente
  void hoje
  return <p className="text-sm text-muted-foreground">{avaliacoes.length < 2 ? 'O histórico começa na segunda avaliação.' : `${avaliacoes.length} avaliações`}</p>
}
