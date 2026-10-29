import { RefreshCw } from 'lucide-react'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card } from '@ds/componentes/display/card.tsx'

interface EsperaDaBaseProps {
  readonly estado: 'carregando' | 'erro'
  readonly aoTentarDeNovo: () => void
}

/**
 * D-711 (spec base-ampliada): o plano que tem alimento da base ampliada abre quando ela chega; sem ela, o item apareceria
 * como "Alimento removido" e os totais sairiam parciais.
 */
export function EsperaDaBase({ estado, aoTentarDeNovo }: EsperaDaBaseProps) {
  if (estado === 'carregando') {
    return (
      <Card className="items-start gap-4">
        <p role="status">Carregando a base de alimentos…</p>
      </Card>
    )
  }
  return (
    <Card className="items-start gap-4">
      <p role="alert">Não foi possível carregar a base de alimentos. Confira a conexão e tente de novo.</p>
      <Button variant="lightprimary" onClick={aoTentarDeNovo}>
        <RefreshCw aria-hidden="true" />
        Tentar de novo
      </Button>
    </Card>
  )
}
