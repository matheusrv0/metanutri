import { compararNaPorcao, textoDaPorcao, type Candidato } from '@/domain/buscaDeSubstitutos.ts'
import type { VagaParaOpcao } from '@/domain/opcoesDoItem.ts'
import type { Alimento, ChaveNutrienteAlimento } from '@/domain/tipos.ts'
import { cn } from '@/lib/utils'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { rotuloDaOpcao } from './rotuloDaOpcao.ts'

/** O alimento numa porção: o do item ou o candidato. */
export type PorcaoParaComparar = Pick<Candidato, 'alimento' | 'gramas' | 'textoDaMedida'>

interface JanelaCompararProps {
  readonly original: PorcaoParaComparar
  /** `null` mantém a janela fechada. */
  readonly substituto: PorcaoParaComparar | null
  readonly escolhidos: readonly ChaveNutrienteAlimento[]
  readonly vaga: VagaParaOpcao
  readonly aoAdicionarOpcao: () => void
  readonly aoSubstituir: () => void
  readonly aoFechar: () => void
}

/** No celular, a coluna diz só "Original" ou "Substituto"; o nome e a porção ficam na legenda acima da tabela. */
function Cabeca({ alimento, porcao, curto }: { readonly alimento: Alimento; readonly porcao: string; readonly curto: string }) {
  return (
    <span className="flex flex-col items-end gap-0.5 text-right">
      <span className="text-xs font-semibold text-heading sm:hidden">{curto}</span>
      <span className="break-words text-sm font-semibold text-heading max-sm:hidden">{alimento.descricao}</span>
      <span className="numeros text-xs font-normal text-muted-foreground max-sm:hidden">{porcao}</span>
    </span>
  )
}

function Legenda({ rotulo, alimento, porcao }: { readonly rotulo: string; readonly alimento: Alimento; readonly porcao: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs font-medium text-muted-foreground">{rotulo}</dt>
      <dd className="break-words text-sm text-heading">
        <span className="font-semibold">{alimento.descricao}</span>
        <span className="numeros text-muted-foreground">{` · ${porcao}`}</span>
      </dd>
    </div>
  )
}

/**
 * CA-2117 (spec busca-substitutos, D-1112): os dois alimentos lado a lado, nas porções do item e do candidato, com a
 * diferença; o que a tabela não mediu diz "não analisado", nunca zero.
 */
export function JanelaComparar({ original, substituto, escolhidos, vaga, aoAdicionarOpcao, aoSubstituir, aoFechar }: JanelaCompararProps) {
  const linhas = substituto ? compararNaPorcao(original, substituto, escolhidos) : []
  return (
    <Dialog open={substituto !== null} onOpenChange={(aberta) => !aberta && aoFechar()}>
      <DialogContent className="max-h-[90dvh] grid-cols-[minmax(0,1fr)] overflow-y-auto max-sm:w-[calc(100%-1rem)] max-sm:p-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Comparar alimentos</DialogTitle>
          <DialogDescription className="sr-only">Os dois alimentos nas porções propostas, nutriente por nutriente.</DialogDescription>
        </DialogHeader>
        {substituto ? (
          <dl className="flex flex-col gap-2 sm:hidden">
            <Legenda rotulo="Original" alimento={original.alimento} porcao={textoDaPorcao(original)} />
            <Legenda rotulo="Substituto" alimento={substituto.alimento} porcao={textoDaPorcao(substituto)} />
          </dl>
        ) : null}
        {substituto ? (
          <table className="numeros w-full table-fixed border-separate border-spacing-0 text-xs sm:text-sm">
            <colgroup>
              <col className="w-[26%] sm:w-[28%]" />
              <col />
              <col />
              <col className="w-[25%] sm:w-[18%]" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="pb-2 pr-2 text-left align-bottom text-xs font-medium text-muted-foreground">
                  Na porção
                </th>
                <th scope="col" className="pb-2 pl-2 align-bottom">
                  <Cabeca alimento={original.alimento} porcao={textoDaPorcao(original)} curto="Original" />
                </th>
                <th scope="col" className="pb-2 pl-2 align-bottom">
                  <Cabeca alimento={substituto.alimento} porcao={textoDaPorcao(substituto)} curto="Substituto" />
                </th>
                <th scope="col" className="pb-2 pl-2 text-right align-bottom">
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="text-xs font-semibold text-heading sm:text-sm">Diferença</span>
                    <span className="text-xs font-normal text-muted-foreground max-sm:hidden">substituto − original</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.chave} className={cn(l.escolhido && 'bg-lightprimary')}>
                  <th scope="row" className={cn('border-t border-border py-2 pr-2 text-left font-normal text-foreground', l.escolhido && 'font-semibold')}>
                    {l.rotulo}
                    {l.escolhido ? <span className="block text-xs font-medium text-primary">escolhido</span> : null}
                  </th>
                  <td
                    className={cn(
                      'border-t border-border py-2 pl-2 text-right',
                      l.semDado.original ? 'text-xs text-muted-foreground' : 'whitespace-nowrap text-foreground',
                    )}
                  >
                    {l.original}
                  </td>
                  <td
                    className={cn(
                      'border-t border-border py-2 pl-2 text-right',
                      l.semDado.substituto ? 'text-xs text-muted-foreground' : 'whitespace-nowrap text-foreground',
                    )}
                  >
                    {l.substituto}
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap border-t border-border py-2 pl-2 text-right',
                      l.diferenca === '—' ? 'text-muted-foreground' : 'font-medium text-heading',
                    )}
                  >
                    {l.diferenca}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <p className="text-xs text-muted-foreground">“Não analisado” é falta de medição na tabela, não zero.</p>
        <DialogFooter className="gap-2 sm:flex-wrap">
          <Button variant="ghost" className="sm:mr-auto" onClick={aoFechar}>
            Fechar
          </Button>
          <Button variant="outline" disabled={vaga !== 'livre'} onClick={aoAdicionarOpcao}>
            {rotuloDaOpcao(vaga)}
          </Button>
          <Button disabled={vaga === 'e-o-item'} onClick={aoSubstituir}>
            Substituir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
