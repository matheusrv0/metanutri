import type { ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'
import type { AjudaDaMedida as Ajuda } from './ajudas.ts'
import { AjudaDaMedida } from './AjudaDaMedida.tsx'
import { CampoMedida } from './CampoMedida.tsx'

/** Um lado da medida: o valor gravado e como gravar. */
export interface LadoDaMedida {
  readonly valor: number | null
  readonly aoMudar: (valor: number | null) => void
}

interface LinhaDeMedidaProps {
  readonly nome: string
  readonly ajuda?: Ajuda | undefined
  /** O lado direito, ou o campo único (a fita vai no lado direito, salvo motivo anotado). */
  readonly direito: LadoDaMedida
  /** Só nas medidas que o plano guarda dos dois lados (D-1410). */
  readonly esquerdo?: LadoDaMedida | undefined
  /** O grupo tem as colunas "Direito" e "Esquerdo": o campo único fica na do direito. */
  readonly comLados: boolean
  /** Embaixo do nome: o ponto da cintura, "Técnica em conferência". */
  readonly abaixoDoNome?: ReactNode
  readonly unidade?: string | undefined
}

/**
 * Uma linha da tabela de medidas (spec antropometria-telas, D-1410 e D-1411): o nome com o "?" e os campos do lado
 * direito e do esquerdo. No celular, o nome vai numa linha e os campos lado a lado embaixo, com "Dir." e "Esq." dentro
 * deles (D-1440).
 */
export function LinhaDeMedida({ nome, ajuda, direito, esquerdo, comLados, abaixoDoNome, unidade = 'cm' }: LinhaDeMedidaProps) {
  const emCm = unidade === 'cm' ? 'em centímetros' : `em ${unidade}`
  return (
    <div
      className={cn(
        'relative grid items-center gap-x-3 gap-y-1.5 border-t border-border py-2.5 first:border-t-0 sm:min-h-13',
        esquerdo ? 'grid-cols-2' : 'grid-cols-[minmax(0,1fr)]',
        comLados ? 'sm:grid-cols-[minmax(0,1fr)_8rem_8rem]' : 'sm:grid-cols-[minmax(0,1fr)_8rem]',
      )}
    >
      <div className="col-span-full flex min-w-0 flex-col gap-1 sm:col-span-1">
        <div className="flex min-h-6 items-center gap-1.5">
          <span className="min-w-0 text-sm font-medium text-heading">{nome}</span>
          {ajuda ? <AjudaDaMedida nome={nome} ajuda={ajuda} posicao="left-0 top-11" /> : null}
        </div>
        {abaixoDoNome}
      </div>
      <CampoMedida
        rotuloAcessivel={esquerdo ? `${nome}, lado direito, ${emCm}` : `${nome}, ${emCm}`}
        unidade={unidade}
        valor={direito.valor}
        aoMudar={direito.aoMudar}
        lado={esquerdo ? 'Dir.' : undefined}
      />
      {esquerdo ? <CampoMedida rotuloAcessivel={`${nome}, lado esquerdo, ${emCm}`} unidade={unidade} valor={esquerdo.valor} aoMudar={esquerdo.aoMudar} lado="Esq." /> : null}
    </div>
  )
}
