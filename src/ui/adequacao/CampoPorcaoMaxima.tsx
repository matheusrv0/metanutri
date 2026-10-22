import { useState } from 'react'
import { PORCAO_MAXIMA_PADRAO_G } from '@/domain/cobrir.ts'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'

interface CampoPorcaoMaximaProps {
  /** A porção máxima guardada no caso; a padrão (200 g) é a automática. */
  readonly valor: number
  readonly aoMudar: (porcaoMaximaG: number) => void
}

/**
 * "Porção máxima por sugestão" (spec sugestoes-com-criterio, correção C, D-475): vazio na automática, que é a porção do
 * grupo e da idade; o número digitado limita; apagar volta à automática. O campo guarda o que a pessoa digita enquanto a
 * gaveta está aberta: digitar 200 não apaga o campo.
 */
export function CampoPorcaoMaxima({ valor, aoMudar }: CampoPorcaoMaximaProps) {
  const [inicial] = useState(valor === PORCAO_MAXIMA_PADRAO_G ? null : valor)
  return (
    <CampoNumero
      rotulo="Porção máxima por sugestão"
      valor={inicial}
      aoMudar={(v) => {
        if (v === null) aoMudar(PORCAO_MAXIMA_PADRAO_G)
        else if (v > 0) aoMudar(v)
      }}
      placeholder="Automática"
      dica="Automática, pelo grupo do alimento e pela idade. Digite um valor para limitar."
      sufixo="g"
    />
  )
}
