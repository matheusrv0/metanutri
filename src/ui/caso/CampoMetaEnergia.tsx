import { estadoDaMeta } from '@/domain/energia.ts'
import type { Caso } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'

interface CampoMetaEnergiaProps {
  readonly caso: Caso
  readonly aoMudar: (meta: number | null) => void
  readonly erro?: string | undefined
}

const kcal = (valor: number) => formatarNumero(valor, 0)

/**
 * CA-226 a CA-230: a meta calculada aparece como texto-guia do campo, com o selo;
 * o número digitado vale mais. O calculado nunca vira o valor do campo: se virasse,
 * apagar o campo o traria de volta no meio da digitação.
 */
export function CampoMetaEnergia({ caso, aoMudar, erro }: CampoMetaEnergiaProps) {
  const estado = estadoDaMeta(caso)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-56">
          <CampoNumero
            rotulo="Meta de energia"
            valor={caso.metaEnergiaKcal}
            aoMudar={aoMudar}
            sufixo="kcal"
            erro={erro}
            placeholder={estado.tipo === 'calculada' ? kcal(estado.kcal) : 'Digite a meta'}
          />
        </div>
        {estado.tipo === 'calculada' ? (
          <Badge variant="lightPrimary" className="mb-2.5">
            calculada
          </Badge>
        ) : null}
        {estado.tipo === 'digitada' ? (
          <Badge variant="muted" className="mb-2.5">
            definida por você
          </Badge>
        ) : null}
      </div>
      {estado.tipo === 'digitada' && estado.calculada !== null ? (
        <p className="text-xs text-muted-foreground">{`Vale o seu número. Apague o campo para voltar à calculada (${kcal(estado.calculada)} kcal).`}</p>
      ) : null}
      {estado.tipo === 'sem-calculo' ? <p className="text-xs text-warningtext">{estado.motivo}</p> : null}
    </div>
  )
}
