import { PRIMEIRO_ID_PROPRIO } from '@/domain/busca.ts'
import { textoDaPorcao, type Candidato } from '@/domain/buscaDeSubstitutos.ts'
import type { VagaParaOpcao } from '@/domain/opcoesDoItem.ts'
import { cn } from '@/lib/utils'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { rotuloDaOpcao } from './rotuloDaOpcao.ts'

interface CartaoCandidatoProps {
  readonly candidato: Candidato
  readonly vaga: VagaParaOpcao
  readonly aoComparar: () => void
  readonly aoAdicionarOpcao: () => void
  readonly aoSubstituir: () => void
}

/**
 * Um candidato da busca (spec busca-substitutos, CA-2103): o nome, a porção em medida caseira e gramas, a diferença de
 * cada nutriente buscado e as ações. A diferença que zera fica verde: é o estado "dentro" do sistema.
 */
export function CartaoCandidato({ candidato, vaga, aoComparar, aoAdicionarOpcao, aoSubstituir }: CartaoCandidatoProps) {
  const { alimento, diferencas } = candidato
  return (
    <li className="flex flex-col gap-2 border-t border-border py-3 first:border-0 first:pt-1">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {/* D-801: o nome identifica; quebra em até 2 linhas, e o resto fica no title. */}
        <span className="line-clamp-2 min-w-0 break-words font-semibold text-heading" title={alimento.descricao}>
          {alimento.descricao}
        </span>
        {alimento.id >= PRIMEIRO_ID_PROPRIO ? <span className="rotulo text-muted-foreground">meu</span> : null}
        <span className="numeros text-sm text-muted-foreground">{textoDaPorcao(candidato)}</span>
      </p>
      <p className="flex flex-wrap gap-1.5">
        {diferencas.map((d) => (
          <Badge key={d.chave} variant={d.igual ? 'lightSuccess' : 'muted'} className="numeros whitespace-normal">
            {d.texto}
          </Badge>
        ))}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="link"
          size="sm"
          className={cn('h-auto px-0 underline underline-offset-4 max-sm:min-h-11 max-sm:basis-full max-sm:justify-start sm:mr-auto')}
          onClick={aoComparar}
          aria-label={`Comparar ${alimento.descricao}`}
        >
          Comparar
        </Button>
        <Button
          variant="outline"
          size="sm"
          // CA-2132 (revisão, leve 2): desligado continua focável, para o foco não cair no corpo da página depois do clique.
          className="max-sm:flex-1 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          aria-disabled={vaga !== 'livre' || undefined}
          onClick={() => vaga === 'livre' && aoAdicionarOpcao()}
          aria-label={vaga === 'livre' ? `Adicionar como opção: ${alimento.descricao}` : undefined}
        >
          {rotuloDaOpcao(vaga)}
        </Button>
        <Button variant="outline" size="sm" className="max-sm:flex-1" onClick={aoSubstituir} aria-label={`Substituir por ${alimento.descricao}`}>
          Substituir
        </Button>
      </div>
    </li>
  )
}
