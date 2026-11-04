import { TriangleAlert } from 'lucide-react'
import { useRef } from 'react'
import { flushSync } from 'react-dom'
import { textoDaPorcao } from '@/domain/buscaDeSubstitutos.ts'
import { medidaNaLinha } from '@/domain/medidaDoItem.ts'
import { lerOpcoesDoItem } from '@/domain/opcoesDoItem.ts'
import { nomeSemAlimento } from '@/domain/produtos.ts'
import { restricaoDoAlimento } from '@/domain/restricoes.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import type { ItemPlano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { useRestricoesDoPlano } from '../estado/contextoRestricoes.ts'

interface OpcoesDoItemProps {
  readonly item: ItemPlano
  /** O nome do item, para o leitor de tela dizer de quem são as opções. */
  readonly descricao: string
  readonly aoTirar?: ((indice: number) => void) | undefined
}

/**
 * CA-2120 (spec busca-substitutos, D-1114): as opções do item, embaixo dele, com a porção e "Tirar". A opção que bate com
 * a restrição do paciente avisa, como o item (CA-2125); a do alimento excluído diz o nome do que aconteceu (CB-1102).
 */
export function OpcoesDoItem({ item, descricao, aoTirar }: OpcoesDoItemProps) {
  const restricoes = useRestricoesDoPlano()
  const lista = useRef<HTMLUListElement>(null)
  const opcoes = lerOpcoesDoItem(item)
  if (opcoes.length === 0) return null
  // D-1128: o "Tirar" clicado sai da tela; o foco vai ao "Tirar" da opção que ficou no lugar dele (ou da anterior) e, sem
  // nenhuma, ao "Buscar substitutos" do item (ou ao "Remover", quando o item não tem o botão). O flushSync põe o plano novo
  // na tela antes de mover o foco.
  const tirar = (indice: number) => {
    if (!aoTirar) return
    const linha = lista.current?.closest('li')
    flushSync(() => aoTirar(indice))
    const restantes = opcoes.length - 1
    if (restantes > 0) {
      lista.current?.querySelectorAll('button')[Math.min(indice, restantes - 1)]?.focus()
      return
    }
    const destino = linha?.querySelector<HTMLElement>(`[data-substitutos-de="${item.id}"]`) ?? linha?.querySelector<HTMLElement>(`[data-remover-de="${item.id}"]`)
    destino?.focus()
  }
  return (
    <ul ref={lista} aria-label={`Opções de ${descricao}`} className="flex flex-col gap-1.5 border-l border-border pl-3">
      {opcoes.map((o, n) => {
        const alimento = buscarAlimento(o.alimentoId)
        // D-1122: sem a base ampliada, o nome da cópia; o próprio excluído diz o nome do que aconteceu (CB-1102).
        const nome = alimento?.descricao ?? o.copia?.descricao ?? nomeSemAlimento(o.alimentoId)
        const medida = medidaNaLinha({ alimentoId: o.alimentoId, gramas: o.gramas, ...(o.medida === undefined ? {} : { medida: o.medida }) })
        const porcao = alimento ? textoDaPorcao({ alimento, gramas: o.gramas, textoDaMedida: medida?.texto ?? null }) : `${formatarNumero(o.gramas, 0)} g`
        const aviso = alimento ? restricaoDoAlimento(alimento, restricoes) : null
        return (
          <li key={`${n}-${o.alimentoId}`} className="flex flex-col gap-0.5 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-xs font-semibold text-muted-foreground">{`Opção ${n + 1}`}</span>
              <span className="min-w-0 break-words text-foreground">{nome}</span>
              <span className="numeros text-muted-foreground">{porcao}</span>
              {aoTirar ? (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-xs underline underline-offset-4 max-sm:min-h-11"
                  onClick={() => tirar(n)}
                  aria-label={`Tirar a opção ${nome}`}
                >
                  Tirar
                </Button>
              ) : null}
            </div>
            {aviso ? (
              <p className="flex items-center gap-1 text-xs font-medium text-errortext">
                <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                {aviso}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
