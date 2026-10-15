// Sugestões de alimentos para cobrir um micronutriente abaixo da meta (SPEC CA-34 a CA-40, D-5, CB-06).
// O que pode ser sugerido é decidido pela regra prescritível (spec sugestoes-com-criterio).
import type { ResultadoAdequacao } from './adequacao.ts'
import { ehCorteGordo, ehDeUsoComum, ehPrescritivel } from './prescritivel.ts'
import { casaRestricao } from './restricoes.ts'
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

/**
 * Café e chá são prescritíveis, mas não são fonte (spec sugestoes-com-criterio, D-193): infusão quase sem caloria
 * passa na frente de qualquer alimento pelo critério de kcal, e a TACO traz para chá B1 e B2 que não se sustentam.
 * Vale em qualquer forma: o café em pó também não entra, nem com a chave ligada (revisão I1).
 */
const CAFE_OU_CHA = /^(Café|Chá),/i

export const SODIO_NAO_SE_COBRE = 'O sódio não se cobre com alimento: o sal de cozinha e os temperos já completam o dia.'

const nomeLimpo = (a: Alimento): string => a.descricao.trim().replace(/\s+/g, ' ')

const OLEAGINOSA = /^(Castanha|Amêndoa|Noz|Amendoim|Gergelim|Linhaça|Coco, cru|Pistache|Avelã|Macadâmia)/i
const PAO_OU_BISCOITO = /^(Pão|Biscoito|Torrada)/i

export interface PorcaoDoGrupo {
  readonly grupo: string
  readonly gramas: number
  readonly casa: (alimento: Alimento) => boolean
}

/**
 * Porção máxima realista para grupos calóricos (spec sugestoes-com-criterio, D-199b e seção 7.1). Os números vêm das
 * medidas caseiras da POF: 200 g de castanha não é porção, como cerveja não é prescrição.
 */
export const PORCOES_POR_GRUPO: readonly PorcaoDoGrupo[] = [
  { grupo: 'Oleaginosas e sementes', gramas: 30, casa: (a) => OLEAGINOSA.test(nomeLimpo(a)) },
  { grupo: 'Queijos (menos a ricota)', gramas: 50, casa: (a) => /^Queijo,/i.test(nomeLimpo(a)) && !/ricota/i.test(a.descricao) },
  { grupo: 'Pães, biscoitos e torradas', gramas: 50, casa: (a) => PAO_OU_BISCOITO.test(nomeLimpo(a)) },
  {
    grupo: 'Frutas secas e muito calóricas',
    gramas: 30,
    casa: (a) => a.categoria.startsWith('Frutas') && (a.nutrientes.energia_kcal ?? 0) > 200,
  },
  { grupo: 'Cortes gordos e aves com pele', gramas: 100, casa: ehCorteGordo },
]

/** A porção máxima do grupo do alimento; `null` quando ele não está em nenhum grupo da tabela. */
export function porcaoMaximaDoGrupo(alimento: Alimento): number | null {
  return PORCOES_POR_GRUPO.find((g) => g.casa(alimento))?.gramas ?? null
}

export interface OpcoesCobrir {
  readonly alimentos: readonly Alimento[]
  /** A chave "Incluir ingredientes e alimentos crus": libera só a forma de ingrediente (D-191). */
  readonly incluirIngredientes?: boolean
  /** GET do caso em kcal; `null` quando ainda não calculado. */
  readonly gastoEnergetico: number | null
  readonly porcaoMaximaG?: number
  /** Ids de alimentos que o usuário ocultou para este caso (CA-40). */
  readonly ocultos?: ReadonlySet<number>
  /** O que o paciente não come; filtra antes da escolha das 5, para não deixar a gaveta vazia (CA-675). */
  readonly restricoes?: readonly string[]
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
  // Subir sódio com alimento não é conduta: o sal de cozinha não entra no plano (spec sugestoes-com-criterio, D-199d).
  if (chave === 'sodio_mg') return vazio(linha.unidade, falta, SODIO_NAO_SE_COBRE)
  if (falta === 0) return vazio(linha.unidade, 0, `${linha.rotulo} já atingiu a meta.`)

  const porcaoMaxima = opcoes.porcaoMaximaG ?? PORCAO_MAXIMA_PADRAO_G
  if (!(porcaoMaxima > 0)) throw new RangeError(`Porção máxima inválida: ${porcaoMaxima} g.`)

  const limites = adequacao.linhas.filter((l) => l.limite !== null && l.chave !== chave)
  const restricoes = opcoes.restricoes ?? []

  const candidatas: (Sugestao & { readonly comum: boolean; readonly magro: boolean })[] = []
  for (const alimento of opcoes.alimentos) {
    if (opcoes.ocultos?.has(alimento.id)) continue
    if (!ehPrescritivel(alimento, { incluirIngredientes: opcoes.incluirIngredientes === true })) continue
    if (CAFE_OU_CHA.test(alimento.descricao.trim())) continue
    if (casaRestricao(alimento.descricao, restricoes)) continue
    const porCem = alimento.nutrientes[chave]
    const kcalPorCem = alimento.nutrientes.energia_kcal
    if (porCem === null || porCem <= 0 || kcalPorCem === null) continue

    // Vale a menor entre a porção do grupo calórico e a que a pessoa escolheu (CB-197).
    const porcaoDoAlimento = Math.min(porcaoMaxima, porcaoMaximaDoGrupo(alimento) ?? porcaoMaxima)
    const necessario = Math.ceil(((falta / porCem) * 100) / PASSO_PORCAO_G) * PASSO_PORCAO_G
    const gramas = Math.min(necessario, porcaoDoAlimento)
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
      comum: ehDeUsoComum(alimento),
      magro: !ehCorteGordo(alimento),
      alimentoId: alimento.id,
      descricao: alimento.descricao,
      gramas,
      coberturaPct,
      parcial: necessario > porcaoDoAlimento,
      kcalAdicionadas,
      avisos,
    })
  }

  // Menor acréscimo de kcal por parte da falta coberta (densidade do nutriente por kcal);
  // no empate, a que cobre mais. Assim uma verdura rica vem antes de um doce que cobre tudo de uma vez.
  const kcalPorFaltaInteira = (s: Sugestao) => s.kcalAdicionadas / (s.coberturaPct / 100)
  // Alimento de uso comum vem primeiro: víscera e fruto do mar de exceção só aparecem se sobrar espaço.
  // Depois, corte magro e ave sem pele antes de corte gordo e ave com pele (D-199b).
  candidatas.sort(
    (a, b) =>
      Number(b.comum) - Number(a.comum) ||
      Number(b.magro) - Number(a.magro) ||
      kcalPorFaltaInteira(a) - kcalPorFaltaInteira(b) ||
      b.coberturaPct - a.coberturaPct,
  )

  const sugestoes = variarPorGrupo(candidatas, opcoes.alimentos)
  return {
    chave,
    unidade: linha.unidade,
    falta,
    kcalDisponiveis,
    sugestoes,
    // "De rotina": o que passa na regra prescritível. O resto da base continua a uma busca de distância (D-195).
    motivoSemSugestao:
      sugestoes.length === 0
        ? `Nenhum alimento de rotina${restricoes.length > 0 ? ', dentro das restrições do paciente,' : ''} cobre ao menos ${COBERTURA_MINIMA_PCT}% da falta em até ${porcaoMaxima} g. Pela busca do plano, qualquer alimento entra.`
        : null,
  }
}
