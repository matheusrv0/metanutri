import { Button } from '@ds/componentes/forms/button.tsx'
import { FolhaDoLink } from './FolhaDoLink.tsx'

interface FolhaEsquecerProps {
  readonly aberta: boolean
  readonly aoFechar: () => void
  readonly aoEsquecer: () => void
  readonly cor: string | null
}

/**
 * "Esquecer neste aparelho" (D-1218, CA-2228): confirma antes; esquecer apaga a lembrança e a cópia sem internet daquele
 * link. O link continua abrindo para quem tem o endereço.
 */
export function FolhaEsquecer({ aberta, aoFechar, aoEsquecer, cor }: FolhaEsquecerProps) {
  return (
    <FolhaDoLink aberta={aberta} aoFechar={aoFechar} titulo="Esquecer o plano neste aparelho?" descricao="O link continua valendo. Para abrir de novo, use o link ou o e-mail." cor={cor}>
      <div className="flex flex-col gap-2">
        <Button size="lg" block onClick={aoEsquecer} className="bg-linkacao text-linkacaotexto hover:bg-linkacao hover:brightness-110">
          Esquecer
        </Button>
        <Button size="lg" block variant="ghost" onClick={aoFechar}>
          Cancelar
        </Button>
      </div>
    </FolhaDoLink>
  )
}
