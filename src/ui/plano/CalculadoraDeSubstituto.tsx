import { ArrowLeftRight } from 'lucide-react'
import { useState } from 'react'
import { textoDaPorcao, type PorcaoDoSubstituto } from '@/domain/buscaDeSubstitutos.ts'
import { medidaNaLinha } from '@/domain/medidaDoItem.ts'
import { vagaParaOpcao } from '@/domain/opcoesDoItem.ts'
import { calcularSubstituto, type CriterioEquivalencia } from '@/domain/substitutos.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import type { Alimento, ChaveNutrienteAlimento, ItemPlano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { EntradaRapida } from './EntradaRapida.tsx'
import { JanelaComparar } from './JanelaComparar.tsx'
import { rotuloDaOpcao } from './rotuloDaOpcao.ts'

interface CalculadoraDeSubstitutoProps {
  readonly item: ItemPlano
  readonly alimento: Alimento
  readonly aoAdicionarOpcao: (escolha: PorcaoDoSubstituto) => void
  readonly aoSubstituir: (escolha: PorcaoDoSubstituto) => void
}

const DIFERENCAS = [
  { chave: 'energia_kcal', rotulo: 'Energia', unidade: 'kcal', casas: 0 },
  { chave: 'proteina_g', rotulo: 'Proteína', unidade: 'g', casas: 1 },
  { chave: 'carboidrato_g', rotulo: 'Carboidrato', unidade: 'g', casas: 1 },
  { chave: 'lipideos_g', rotulo: 'Gordura', unidade: 'g', casas: 1 },
] as const

const CHAVE_DO_CRITERIO: Readonly<Record<CriterioEquivalencia, ChaveNutrienteAlimento>> = {
  kcal: 'energia_kcal',
  proteina: 'proteina_g',
  carboidrato: 'carboidrato_g',
}

/**
 * "Adicionar manualmente" (spec busca-substitutos, D-1101): a calculadora de hoje (CA-41, CA-42, D-486). A nutricionista
 * escolhe o critério e o alimento; a porção sai na meia medida caseira, com as diferenças. As ações são as da busca.
 */
export function CalculadoraDeSubstituto({ item, alimento, aoAdicionarOpcao, aoSubstituir }: CalculadoraDeSubstitutoProps) {
  const [criterio, setCriterio] = useState<CriterioEquivalencia>('kcal')
  const [substitutoId, setSubstitutoId] = useState<number | null>(null)
  const [comparando, setComparando] = useState(false)

  const substituto = substitutoId === null ? undefined : buscarAlimento(substitutoId)
  const resultado = substitutoId !== null ? calcularSubstituto(item, substitutoId, criterio, buscarAlimento) : null
  const escolha: PorcaoDoSubstituto | null =
    substituto && resultado && resultado.gramas !== null && resultado.motivoSemCalculo === null
      ? {
          alimento: substituto,
          gramas: resultado.gramas,
          medida: resultado.medidaDoItem,
          textoDaMedida: resultado.medidaDoItem ? (resultado.medida?.texto ?? null) : null,
        }
      : null
  const vaga = substituto ? vagaParaOpcao(item, substituto.id) : 'livre'

  return (
    <div className="flex flex-col gap-4">
      <GrupoOpcoes<CriterioEquivalencia>
        rotulo="Equivalente por"
        opcoes={[
          { valor: 'kcal', rotulo: 'Energia (kcal)' },
          { valor: 'proteina', rotulo: 'Proteína' },
          { valor: 'carboidrato', rotulo: 'Carboidrato' },
        ]}
        valor={criterio}
        aoEscolher={setCriterio}
      />

      <EntradaRapida
        rotulo="Escolher alimento substituto"
        aoAdicionar={(id) => setSubstitutoId(id)}
        // D-486 (correção C): a lista mostra já a porção equivalente, pelo critério escolhido, não os 100 g padrão.
        porcaoDoResultado={(id) => {
          const r = calcularSubstituto(item, id, criterio, buscarAlimento)
          return r.gramas === null ? null : { gramas: r.gramas, medida: r.medidaDoItem }
        }}
      />

      {resultado && substituto ? (
        resultado.motivoSemCalculo ? (
          <Alert variant="warning">
            <ArrowLeftRight aria-hidden="true" />
            <p>{resultado.motivoSemCalculo}</p>
          </Alert>
        ) : escolha ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-4">
            <p className="break-words text-sm font-semibold text-heading">{substituto.descricao}</p>
            {/* G8: a porção em meia medida caseira, com o peso. */}
            <p className="numeros text-lg font-bold text-primary">{textoDaPorcao(escolha)}</p>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              {DIFERENCAS.map((d) => {
                const valor = resultado.diferencas[d.chave]
                return (
                  <div key={d.chave} className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{d.rotulo}</dt>
                    <dd className="numeros whitespace-nowrap font-medium text-heading">{`${valor > 0 ? '+' : ''}${formatarNumero(valor, d.casas)} ${d.unidade}`}</dd>
                  </div>
                )
              })}
            </dl>
            <p className="text-xs text-muted-foreground">Diferença em relação ao alimento original, na porção calculada.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 underline underline-offset-4 max-sm:min-h-11 max-sm:basis-full max-sm:justify-start sm:mr-auto"
                onClick={() => setComparando(true)}
              >
                Comparar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="max-sm:flex-1 aria-disabled:pointer-events-none aria-disabled:opacity-50"
                aria-disabled={vaga !== 'livre' || undefined}
                onClick={() => vaga === 'livre' && aoAdicionarOpcao(escolha)}
              >
                {rotuloDaOpcao(vaga)}
              </Button>
              <Button variant="outline" size="sm" className="max-sm:flex-1" disabled={vaga === 'e-o-item'} onClick={() => aoSubstituir(escolha)}>
                Substituir
              </Button>
            </div>
          </div>
        ) : null
      ) : null}

      <JanelaComparar
        original={{ alimento, gramas: item.gramas, textoDaMedida: medidaNaLinha(item)?.texto ?? null }}
        substituto={comparando ? escolha : null}
        escolhidos={[CHAVE_DO_CRITERIO[criterio]]}
        vaga={vaga}
        aoAdicionarOpcao={() => {
          if (escolha) aoAdicionarOpcao(escolha)
          setComparando(false)
        }}
        aoSubstituir={() => {
          if (escolha) aoSubstituir(escolha)
          setComparando(false)
        }}
        aoFechar={() => setComparando(false)}
      />
    </div>
  )
}
