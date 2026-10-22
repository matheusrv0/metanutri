import type { LinhaAdequacao } from '@/domain/adequacao.ts'
import { quantidadeNoPlano, valorDeReferencia } from '@/domain/formatarQuantidade.ts'
import { Progress } from '@ds/componentes/display/progress.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { COR_TEXTO, textoDaAdequacao, VARIANTE_BARRA } from './estiloAdequacao.ts'
import { MarcaLimite } from './MarcaLimite.tsx'
import { MarcaSemDado } from './MarcaSemDado.tsx'
import { podeCobrir } from './podeCobrir.ts'

interface ItemListaAdequacaoProps {
  readonly linha: LinhaAdequacao
  readonly aoCobrir: () => void
}

/** No celular, cada nutriente é um item: nome e estado, a barra, quanto tem de quanto precisa e o Cobrir (CA-692). */
export function ItemListaAdequacao({ linha, aoCobrir }: ItemListaAdequacaoProps) {
  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="min-w-0 text-sm font-medium text-heading">
          {linha.rotulo}
          <MarcaLimite nota={linha.notaLimite} />
        </span>
        <span className={`numeros text-xs font-semibold ${COR_TEXTO[linha.estado]}`}>{textoDaAdequacao(linha)}</span>
      </div>
      <Progress value={linha.adequacaoPct} variant={VARIANTE_BARRA[linha.estado]} />
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span className="numeros text-xs text-muted-foreground">
          {`${quantidadeNoPlano(linha.total)} ${linha.unidade}`}
          <MarcaSemDado semDado={linha.semDado} />
          {` de ${valorDeReferencia(linha.referencia.valor)} ${linha.unidade} `}
          <span className="uppercase">{linha.referencia.tipo}</span>
        </span>
        {podeCobrir(linha) ? (
          <Button size="sm" variant="lightprimary" onClick={aoCobrir} aria-label={`Cobrir ${linha.rotulo}`} data-cobrir={linha.chave}>
            Cobrir
          </Button>
        ) : null}
      </div>
    </li>
  )
}
