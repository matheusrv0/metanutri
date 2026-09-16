// Sugestões de alimentos para cobrir um micronutriente abaixo da meta (SPEC CA-34 a CA-40, D-5, CB-06).
import type { ResultadoAdequacao } from './adequacao.ts'
import type { Totais } from './totais.ts'
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'

/** Porção máxima padrão de uma sugestão, editável pelo usuário (D-5). */
export const PORCAO_MAXIMA_PADRAO_G = 200

/** Porções são arredondadas para cima em múltiplos deste passo. */
export const PASSO_PORCAO_G = 5

/** Abaixo desta cobertura da falta, a sugestão não ajuda de forma perceptível e é descartada. */
export const COBERTURA_MINIMA_PCT = 10

export const MAXIMO_SUGESTOES = 5

export type AvisoSugestao =
  | { readonly tipo: 'excede-gasto'; readonly kcalAcima: number }
  | { readonly tipo: 'excede-limite'; readonly chave: ChaveNutrienteAlimento; readonly rotulo: string }

export interface Sugestao {
  readonly alimentoId: number
  readonly descricao: string
  readonly gramas: number
  /** Parte da falta coberta pela porção, de 0 a 100. */
  readonly coberturaPct: number
  /** Verdadeiro quando a porção máxima não basta para cobrir toda a falta. */
  readonly parcial: boolean
  readonly kcalAdicionadas: number
  readonly avisos: readonly AvisoSugestao[]
}

export interface ResultadoCobrir {
  readonly chave: ChaveNutrienteAlimento
  readonly unidade: string
  /** Quanto falta para a meta mínima, na unidade do nutriente. 0 quando já atingiu. */
  readonly falta: number
  /** kcal que ainda cabem até o gasto energético; `null` sem gasto informado. */
  readonly kcalDisponiveis: number | null
  readonly sugestoes: readonly Sugestao[]
  readonly motivoSemSugestao: string | null
}

const CATEGORIAS_SEM_VERSAO_CRUA = new Set([
  'Carnes e derivados',
  'Pescados e frutos do mar',
  'Ovos e derivados',
  'Leguminosas e derivados',
  'Cereais e derivados',
])
const CRUS_CONSUMIDOS = /^Aveia\b/
const FARINHAS_CONSUMIDAS = new Set(['Farinha, de mandioca, torrada', 'Farinha, láctea, de cereais'])

/**
 * Indica se o alimento faz sentido como sugestão para comer (CA-36a).
 * Exclui itens que a tabela lista como ingrediente ou em forma não consumível.
 */
export function ehSugerivel(alimento: Alimento): boolean {
  const { descricao, categoria, preparo } = alimento
  if (categoria === 'Miscelâneas') return false
  if (/(^|[\s,])pó($|[\s,])|desidratad/i.test(descricao)) return false
  // Sem \b: em JavaScript ele não reconhece letras acentuadas como parte da palavra ("fubá").
  const ehFarinhaOuAmido =
    /(^|[\s,])(farinha|amido|fubá)($|[\s,])/i.test(descricao) && !/(^|[\s,])com farinha($|[\s,])/i.test(descricao)
  if (ehFarinhaOuAmido && !FARINHAS_CONSUMIDAS.has(descricao)) return false
  if (preparo === 'cru' && CATEGORIAS_SEM_VERSAO_CRUA.has(categoria) && !CRUS_CONSUMIDOS.test(descricao)) return false
  return true
}

export interface OpcoesCobrir {
  readonly alimentos: readonly Alimento[]
  /** Inclui ingredientes e formas não consumíveis nas sugestões (desliga o filtro do CA-36a). */
  readonly incluirIngredientes?: boolean
  /** GET do caso em kcal; `null` quando ainda não calculado. */
  readonly gastoEnergetico: number | null
  readonly porcaoMaximaG?: number
  /** Ids de alimentos que o usuário ocultou para este caso (CA-40). */
  readonly ocultos?: ReadonlySet<number>
}

/**
 * Escolhe a melhor sugestão de cada grupo alimentar (categoria da TACO), na ordem de prioridade,
 * e completa com as seguintes se houver menos grupos que o máximo de sugestões.
 */
function variarPorGrupo(ordenadas: readonly Sugestao[], alimentos: readonly Alimento[]): Sugestao[] {
  const categoria = new Map(alimentos.map((a) => [a.id, a.categoria]))
  const escolhidas: Sugestao[] = []
  const grupos = new Set<string>()
  for (const s of ordenadas) {
    const g = categoria.get(s.alimentoId) ?? ''
    if (grupos.has(g)) continue
    grupos.add(g)
    escolhidas.push(s)
    if (escolhidas.length === MAXIMO_SUGESTOES) return escolhidas
  }
  for (const s of ordenadas) {
    if (escolhidas.length === MAXIMO_SUGESTOES) break
    if (!escolhidas.includes(s)) escolhidas.push(s)
  }
  // Mantém a ordem de prioridade original entre as escolhidas.
  return escolhidas.sort((a, b) => ordenadas.indexOf(a) - ordenadas.indexOf(b))
}

export function sugerirParaCobrir(
  chave: ChaveNutrienteAlimento,
  totais: Totais,
  adequacao: ResultadoAdequacao,
  opcoes: OpcoesCobrir,
): ResultadoCobrir {
  const kcalPlano = totais.nutrientes.energia_kcal.total
  const kcalDisponiveis = opcoes.gastoEnergetico === null ? null : opcoes.gastoEnergetico - kcalPlano
  const linha = adequacao.linhas.find((l) => l.chave === chave)
  const vazio = (unidade: string, falta: number, motivo: string): ResultadoCobrir => ({
    chave,
    unidade,
    falta,
    kcalDisponiveis,
    sugestoes: [],
    motivoSemSugestao: motivo,
  })

  if (!linha) return vazio('', 0, 'Sem referências para este caso: complete sexo, idade e condição.')

  const meta = (linha.referencia.valor * linha.metaPct) / 100
  const falta = Math.max(0, meta - linha.total)
  if (falta === 0) return vazio(linha.unidade, 0, `${linha.rotulo} já atingiu a meta.`)

  const porcaoMaxima = opcoes.porcaoMaximaG ?? PORCAO_MAXIMA_PADRAO_G
  if (!(porcaoMaxima > 0)) throw new RangeError(`Porção máxima inválida: ${porcaoMaxima} g.`)

  const limites = adequacao.linhas.filter((l) => l.limite !== null && l.chave !== chave)

  const candidatas: Sugestao[] = []
  for (const alimento of opcoes.alimentos) {
    if (opcoes.ocultos?.has(alimento.id)) continue
    if (!opcoes.incluirIngredientes && !ehSugerivel(alimento)) continue
    const porCem = alimento.nutrientes[chave]
    const kcalPorCem = alimento.nutrientes.energia_kcal
    if (porCem === null || porCem <= 0 || kcalPorCem === null) continue

    const necessario = Math.ceil(((falta / porCem) * 100) / PASSO_PORCAO_G) * PASSO_PORCAO_G
    const gramas = Math.min(necessario, porcaoMaxima)
    const coberturaPct = Math.min(100, ((porCem * gramas) / 100 / falta) * 100)
    if (coberturaPct < COBERTURA_MINIMA_PCT) continue

    const kcalAdicionadas = (kcalPorCem * gramas) / 100
    const avisos: AvisoSugestao[] = []
    if (kcalDisponiveis !== null && kcalAdicionadas > kcalDisponiveis) {
      avisos.push({ tipo: 'excede-gasto', kcalAcima: kcalAdicionadas - kcalDisponiveis })
    }
    for (const l of limites) {
      const extra = ((alimento.nutrientes[l.chave] ?? 0) * gramas) / 100
      if (l.limite && l.total + extra > l.limite.valor) {
        avisos.push({ tipo: 'excede-limite', chave: l.chave, rotulo: l.rotulo })
      }
    }

    candidatas.push({
      alimentoId: alimento.id,
      descricao: alimento.descricao,
      gramas,
      coberturaPct,
      parcial: necessario > porcaoMaxima,
      kcalAdicionadas,
      avisos,
    })
  }

  // Menor acréscimo de kcal por parte da falta coberta (densidade do nutriente por kcal);
  // no empate, a que cobre mais. Assim uma verdura rica vem antes de um doce que cobre tudo de uma vez.
  const kcalPorFaltaInteira = (s: Sugestao) => s.kcalAdicionadas / (s.coberturaPct / 100)
  candidatas.sort((a, b) => kcalPorFaltaInteira(a) - kcalPorFaltaInteira(b) || b.coberturaPct - a.coberturaPct)

  const sugestoes = variarPorGrupo(candidatas, opcoes.alimentos)
  return {
    chave,
    unidade: linha.unidade,
    falta,
    kcalDisponiveis,
    sugestoes,
    motivoSemSugestao:
      sugestoes.length === 0
        ? `Nenhum alimento da base cobre ao menos ${COBERTURA_MINIMA_PCT}% da falta em até ${porcaoMaxima} g.`
        : null,
  }
}
