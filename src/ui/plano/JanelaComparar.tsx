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

function Cabeca({ alimento, porcao }: { readonly alimento: Alimento; readonly porcao: string }) {
  return (
    <span className="flex flex-col items-end gap-0.5 text-right">
      <span className="break-words text-sm font-semibold text-heading">{alimento.descricao}</span>
      <span className="numeros text-xs font-normal text-muted-foreground">{porcao}</span>
    </span>
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
      <DialogContent className="max-h-[90dvh] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Comparar alimentos</DialogTitle>
          <DialogDescription className="sr-only">Os dois alimentos nas porções propostas, nutriente por nutriente.</DialogDescription>
        </DialogHeader>
        {substituto ? (
          <table className="numeros w-full table-fixed border-separate border-spacing-0 text-sm">
            <colgroup>
              <col className="w-[30%]" />
              <col />
              <col />
              <col className="w-[22%] sm:w-[18%]" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="pb-2 pr-2 text-left align-bottom text-xs font-medium text-muted-foreground">
                  Na porção
                </th>
                <th scope="col" className="pb-2 pl-2 align-bottom">
                  <Cabeca alimento={original.alimento} porcao={textoDaPorcao(original)} />
                </th>
                <th scope="col" className="pb-2 pl-2 align-bottom">
                  <Cabeca alimento={substituto.alimento} porcao={textoDaPorcao(substituto)} />
                </th>
                <th scope="col" className="pb-2 pl-2 text-right align-bottom">
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-semibold text-heading">Diferença</span>
                    <span className="text-xs font-normal text-muted-foreground">substituto − original</span>
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
                  <td className={cn('border-t border-border py-2 pl-2 text-right', l.semDado.original ? 'text-xs text-muted-foreground' : 'text-foreground')}>
                    {l.original}
                  </td>
                  <td className={cn('border-t border-border py-2 pl-2 text-right', l.semDado.substituto ? 'text-xs text-muted-foreground' : 'text-foreground')}>
                    {l.substituto}
                  </td>
                  <td className={cn('border-t border-border py-2 pl-2 text-right', l.diferenca === '—' ? 'text-muted-foreground' : 'font-medium text-heading')}>
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
          <Button onClick={aoSubstituir}>Substituir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
