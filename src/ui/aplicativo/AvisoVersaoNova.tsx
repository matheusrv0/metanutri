import { RefreshCw } from 'lucide-react'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { useVersaoNova } from './versaoNova.ts'

interface AvisoVersaoNovaProps {
  /** Injetável no teste; por padrão, recarrega a página. */
  readonly recarregar?: () => void
}

const recarregarPagina = (): void => globalThis.location.reload()

/**
 * D-172 e CA-602: a barra no topo da área de trabalho, no fluxo da página (não cobre nada), quando uma versão nova do
 * MetaNutri passa a valer. Só recarrega quando a pessoa toca em "Atualizar".
 */
export function AvisoVersaoNova({ recarregar = recarregarPagina }: AvisoVersaoNovaProps) {
  const temVersaoNova = useVersaoNova()
  if (!temVersaoNova) return null
  return (
    <Alert variant="info" className="mb-6 flex-wrap items-center print:hidden">
      <RefreshCw aria-hidden="true" />
      <p className="min-w-0 flex-1">Há uma versão nova do MetaNutri.</p>
      <Button size="sm" variant="outline" onClick={recarregar}>
        Atualizar
      </Button>
    </Alert>
  )
}
