import { useEffect, useState } from 'react'
import { contaFoiExcluida, esquecerContaExcluida } from '../contaExcluida.ts'
import { AvisoPagamento } from '../pagamento/AvisoPagamento.tsx'

/**
 * "Sua conta foi excluída." no topo da página inicial, logo depois da exclusão (spec exclusao-de-conta, D-255, CA-808).
 * Dentro da página, não por cima dela. Lido uma vez ao abrir e esquecido em seguida: recarregar não o traz de volta.
 */
export function AvisoContaExcluida() {
  const [mostrar] = useState(() => contaFoiExcluida())
  useEffect(() => {
    if (mostrar) esquecerContaExcluida()
  }, [mostrar])
  if (!mostrar) return null
  return (
    <div className="mx-auto max-w-[1216px] px-4 pb-2 pt-2 sm:px-8">
      <AvisoPagamento tipo="ok">Sua conta foi excluída.</AvisoPagamento>
    </div>
  )
}
