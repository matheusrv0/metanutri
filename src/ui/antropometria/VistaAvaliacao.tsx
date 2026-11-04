import { useState } from 'react'
import type { Paciente } from '@/domain/pacientes.ts'
import type { Caso } from '@/domain/tipos.ts'
import { ContextoDaAjudaAberta } from './ajudaAberta.ts'
import { CartaoPesoEstatura } from './CartaoPesoEstatura.tsx'

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
 * partida. Uma coluna abaixo de 1280 px, na mesma ordem. Uma ajuda aberta por vez na vista inteira (D-1461).
 */
export function VistaAvaliacao({ caso, bruto, paciente, aoAlterar }: VistaAvaliacaoProps) {
  const [aberta, abrir] = useState<string | null>(null)
  void paciente
  return (
    <ContextoDaAjudaAberta.Provider value={{ aberta, abrir }}>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,35rem)]">
        <div className="flex min-w-0 flex-col gap-6">
          <CartaoPesoEstatura caso={caso} bruto={bruto} aoAlterar={aoAlterar} />
        </div>
        <div className="flex min-w-0 flex-col gap-6" />
      </div>
    </ContextoDaAjudaAberta.Provider>
  )
}
