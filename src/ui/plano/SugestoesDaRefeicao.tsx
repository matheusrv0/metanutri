import { Pencil, Plus } from 'lucide-react'
import { NOME_DO_TIPO, sugestoesProntas, type SugestaoAlimento, type TipoRefeicao } from '@/domain/sugestoes.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'

interface SugestoesDaRefeicaoProps {
  readonly tipo: TipoRefeicao
  readonly sugestoes: readonly SugestaoAlimento[]
  readonly aoEscolher: (alimentoId: number, gramas: number) => void
  /** Abre a edição da lista (CA-241). */
  readonly aoEditar?: (() => void) | undefined
}

/** CA-237, CA-238 e CA-306: os alimentos de sempre daquele tipo de refeição, a um clique. */
export function SugestoesDaRefeicao({ tipo, sugestoes, aoEscolher, aoEditar }: SugestoesDaRefeicaoProps) {
  const prontas = sugestoesProntas(sugestoes, buscarAlimento)
  const titulo = `Sugestões para ${NOME_DO_TIPO[tipo]}`

  const editar = aoEditar ? (
    <button
      type="button"
      onClick={aoEditar}
      aria-label={`Editar sugestões para ${NOME_DO_TIPO[tipo]}`}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Pencil className="size-3.5" aria-hidden="true" />
      {prontas.length === 0 ? 'Editar sugestões' : 'Editar'}
    </button>
  ) : null

  // CA-306: lista vazia deixa só a busca, e o caminho para montar a lista de novo.
  if (prontas.length === 0) return editar

  return (
    <section aria-label={titulo} className="flex min-w-0 items-center gap-2">
      <p className="rotulo hidden shrink-0 sm:block">Sugestões</p>
      {/* Uma faixa só, que rola para o lado em qualquer largura (CA-336): quebrar linha empurrava o plano para baixo. */}
      <div className="-my-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1">
        {prontas.map((s, i) => (
          <button
            key={`${s.alimentoId}-${i}`}
            type="button"
            onClick={() => aoEscolher(s.alimentoId, s.gramas)}
            aria-label={`Adicionar ${s.alimento.descricao}, ${formatarNumero(s.gramas, 0)} g`}
            className="inline-flex min-h-11 max-w-64 shrink-0 items-center gap-1 rounded-full border border-border px-3 text-xs transition-colors hover:border-borderdefault hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-3 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 truncate">{s.alimento.descricao}</span>
            <span className="numeros shrink-0 text-muted-foreground">{`${formatarNumero(s.gramas, 0)} g`}</span>
          </button>
        ))}
      </div>
      {editar ? <div className="shrink-0">{editar}</div> : null}
    </section>
  )
}
