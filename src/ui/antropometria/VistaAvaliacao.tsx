import type { Paciente } from '@/domain/pacientes.ts'
import type { Caso } from '@/domain/tipos.ts'

interface VistaAvaliacaoProps {
  /** O plano como vale, com o que vem da ficha (sexo, idade e gestação na data da avaliação). */
  readonly caso: Caso
  /** O plano como está gravado: é sobre ele que as mudanças se aplicam. */
  readonly bruto: Caso
  readonly paciente: Paciente | null
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
}

/**
 * A vista Avaliação (spec antropometria-telas, D-1406): à esquerda, as medidas; à direita, o resultado e o ponto de
 * partida. Uma coluna abaixo de 1280 px, na mesma ordem.
 */
export function VistaAvaliacao({ caso, bruto, paciente, aoAlterar }: VistaAvaliacaoProps) {
  void caso
  void bruto
  void paciente
  void aoAlterar
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
      <div className="flex min-w-0 flex-col gap-6" />
      <div className="flex min-w-0 flex-col gap-6" />
    </div>
  )
}
