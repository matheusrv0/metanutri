import { useEffect, useState } from 'react'
import { contaFoiExcluida, esquecerContaExcluida } from '../contaExcluida.ts'
import { AvisoPagamento } from '../pagamento/AvisoPagamento.tsx'

/**
 * "Sua conta foi excluída." logo depois da exclusão (spec exclusao-de-conta, D-255, CA-808). Spec separacao-site-app,
 * DP-SA-49: no alto de Entrar, porque a página inicial agora é do site, em outro endereço. Dentro da página, não por cima
 * dela. Lido uma vez ao abrir e esquecido em seguida: recarregar não o traz de volta.
 */
export function AvisoContaExcluida() {
  const [mostrar] = useState(() => contaFoiExcluida())
  useEffect(() => {
    if (mostrar) esquecerContaExcluida()
  }, [mostrar])
  if (!mostrar) return null
  return <AvisoPagamento tipo="ok">Sua conta foi excluída.</AvisoPagamento>
}
