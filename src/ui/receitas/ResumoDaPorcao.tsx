import { pesoDaPorcao } from '@/domain/receitaNoPlano.ts'
import { totaisDaPorcao } from '@/domain/receitas.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import type { ChaveNutrienteAlimento, ReceitaDoPlano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'

interface ResumoDaPorcaoProps {
  readonly receita: ReceitaDoPlano
}

/** O que a porção mostra: energia e os macros, como o painel do dia. */
const LINHAS: readonly { readonly chave: ChaveNutrienteAlimento; readonly rotulo: string; readonly unidade: string; readonly casas: number }[] = [
  { chave: 'energia_kcal', rotulo: 'Energia', unidade: 'kcal', casas: 0 },
  { chave: 'proteina_g', rotulo: 'Proteína', unidade: 'g', casas: 1 },
  { chave: 'carboidrato_g', rotulo: 'Carboidrato', unidade: 'g', casas: 1 },
  { chave: 'lipideos_g', rotulo: 'Gordura', unidade: 'g', casas: 1 },
  { chave: 'fibra_g', rotulo: 'Fibra', unidade: 'g', casas: 1 },
]

/**
 * CA-862: o valor de uma porção enquanto a receita é montada. Falta de dado num ingrediente leva a marca †, nunca vira
 * zero (D-275). Os 16 nutrientes da adequação também somam, no plano; aqui fica o que decide a porção.
 */
export function ResumoDaPorcao({ receita }: ResumoDaPorcaoProps) {
  const totais = totaisDaPorcao(receita, buscarAlimento)
  const nome = receita.nomeDaPorcao.trim() || 'porção'
  const temMarca = LINHAS.some((l) => totais.nutrientes[l.chave].semDado > 0)
  return (
    <section aria-label="Valor de uma porção" className="flex flex-col gap-3 rounded-xl bg-surfacerow p-4">
      <h3 className="numeros text-sm font-semibold text-heading">{`Por ${nome} · ${formatarNumero(pesoDaPorcao(receita), 0)} g`}</h3>
      <dl className="numeros grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-5">
        {LINHAS.map((l) => {
          const { total, semDado } = totais.nutrientes[l.chave]
          return (
            <div key={l.chave} className="flex flex-col">
              <dt className="text-xs text-muted-foreground">{l.rotulo}</dt>
              <dd className="font-semibold text-heading">
                {`${formatarNumero(total, l.casas)} ${l.unidade}`}
                {semDado > 0 ? (
                  <span className="ml-0.5 align-super text-2xs font-semibold text-warningtext" title="Um ingrediente não tem este dado na tabela: valor possivelmente subestimado.">
                    †
                  </span>
                ) : null}
              </dd>
            </div>
          )
        })}
      </dl>
      <p className="text-xs text-muted-foreground">
        {temMarca ? <span className="mr-1 font-semibold text-warningtext">†</span> : null}
        {temMarca ? 'Valor possivelmente subestimado: um ingrediente não tem o dado. ' : null}
        Soma dos ingredientes, TACO 2011.
      </p>
    </section>
  )
}
