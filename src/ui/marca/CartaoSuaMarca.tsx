import { ImageOff, TriangleAlert } from 'lucide-react'
import { codigoDaCor, COR_PADRAO, nomeDaCorPronta } from '@/domain/corDaMarca.ts'
import { corValeNoLink } from '@/domain/marca.ts'
import { lerPerfil } from '@/domain/perfil.ts'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { PlacaLogo } from '@ds/componentes/display/PlacaLogo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'

/** CB-966 (D-963): a cor salva que não passa na regra de hoje; o link usa a do MetaNutri. */
const AVISO_COR_FORA_DA_REGRA = 'O link usa a cor do MetaNutri: esta tem pouco contraste.'

/** O cartão "Sua marca" na página da Conta (spec marca-no-link, D-950 e CA-1950): a logo e a cor de agora, e o caminho para mudar. */
export function CartaoSuaMarca({ aoAbrir }: { readonly aoAbrir: () => void }) {
  const perfil = lerPerfil(useArmazenamento())
  const cor = perfil.cor ?? COR_PADRAO
  const corForaDaRegra = perfil.cor !== null && !corValeNoLink(perfil.cor)
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Sua marca</CardTitle>
      </CardHeader>
      <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-surfacerow p-4">
        {perfil.logo ? (
          <PlacaLogo src={perfil.logo} alt="Sua logo" />
        ) : (
          <span className="inline-flex h-14 items-center gap-2 rounded-md border border-dashed border-borderstrong px-4 text-sm text-muted-foreground">
            <ImageOff className="size-4" aria-hidden="true" />
            Sem logo
          </span>
        )}
        <span className="flex min-w-0 flex-1 basis-40 items-center gap-2.5">
          <span aria-hidden="true" className="size-6 shrink-0 rounded-full ring-1 ring-inset ring-heading/20" style={{ backgroundColor: cor }} />
          <span className="min-w-0 text-sm">
            <span className="font-medium text-heading">{nomeDaCorPronta(perfil.cor) ?? 'Outra cor'}</span>{' '}
            <span className="numeros text-muted-foreground">{codigoDaCor(cor)}</span>
          </span>
        </span>
        <Button variant="outline" onClick={aoAbrir}>
          Editar
        </Button>
      </div>
      {corForaDaRegra ? (
        <p className="flex items-start gap-2 text-sm text-warningtext">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {AVISO_COR_FORA_DA_REGRA}
        </p>
      ) : null}
    </Card>
  )
}
