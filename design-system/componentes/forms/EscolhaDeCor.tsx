import { Check } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Cores prontas como um grupo de opções (spec marca-no-link, D-953 e CA-1980). São rádios nativos: o Tab entra no
 * grupo pela escolhida, e as setas andam entre as cores, como em qualquer grupo de opções. Cada cor diz o nome e o
 * código ("Verde-folha, #3F5F2A") ao leitor de tela, e a escolhida tem o anel e o visto, além da cor.
 *
 * As cores são dado de quem usa (a marca da nutricionista), não do design system: vão no estilo, uma a uma. O visto é
 * branco, então as opções precisam de 4,5:1 ou mais com o branco (as seis prontas passam, D-954).
 */
export interface OpcaoDeCor {
  readonly nome: string
  /** `#rrggbb`. */
  readonly valor: string
}

interface EscolhaDeCorProps {
  readonly opcoes: readonly OpcaoDeCor[]
  /** A cor de agora; outra fora das opções deixa o grupo sem nenhuma marcada. */
  readonly valor: string | null
  readonly aoEscolher: (valor: string) => void
  /** O id do título que nomeia o grupo ("Cor"). */
  readonly rotuloId: string
  readonly className?: string
}

export function EscolhaDeCor({ opcoes, valor, aoEscolher, rotuloId, className }: EscolhaDeCorProps) {
  const nome = useId()
  return (
    <div role="radiogroup" aria-labelledby={rotuloId} className={cn('flex flex-wrap gap-1.5', className)}>
      {opcoes.map((opcao) => {
        const escolhida = opcao.valor === valor
        return (
          <label
            key={opcao.valor}
            title={opcao.nome}
            data-escolhida={escolhida}
            className={cn(
              'relative grid size-11 cursor-pointer place-items-center rounded-full transition-shadow duration-150',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
              escolhida ? 'ring-2 ring-heading' : 'hover:ring-2 hover:ring-borderstrong',
            )}
          >
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={escolhida}
              onChange={() => aoEscolher(opcao.valor)}
              aria-label={`${opcao.nome}, ${opcao.valor.toUpperCase()}`}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-full text-textonink shadow-xs ring-1 ring-inset ring-heading/20"
              style={{ backgroundColor: opcao.valor }}
            >
              {escolhida ? <Check className="size-4" strokeWidth={3} /> : null}
            </span>
          </label>
        )
      })}
    </div>
  )
}
