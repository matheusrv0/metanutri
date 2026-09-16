// Lista de trocas: o paciente troca sozinho, dentro do grupo, sem ligar para a nutricionista.
import { medidaEquivalente, type MedidaEquivalente } from './busca.ts'
import { ehDeUsoComum, ehSugerivel } from './cobrir.ts'
import { casaRestricao } from './restricoes.ts'
import type { Alimento, BuscarAlimento, Plano } from './tipos.ts'

export interface Troca {
  readonly alimentoId: number
  readonly descricao: string
  readonly gramas: number
  readonly medida: MedidaEquivalente | null
}

export interface GrupoDeTrocas {
  /** O alimento do plano que pode ser trocado. */
  readonly alimentoId: number
  readonly descricao: string
  readonly gramas: number
  readonly medida: MedidaEquivalente | null
  readonly categoria: string
  readonly trocas: readonly Troca[]
}

export interface OpcoesTrocas {
  /** Quantas trocas por alimento; o papel não aguenta mais do que três. */
  readonly porAlimento?: number
  /** Restrições do paciente, uma por linha ou já em lista. */
  readonly restricoes?: readonly string[]
  /** A lista inteira, para procurar os pares do mesmo grupo. */
  readonly alimentos: readonly Alimento[]
}

const kcalPorCem = (a: Alimento): number | null => {
  const v = a.nutrientes.energia_kcal
  return v === null || v <= 0 ? null : v
}

/**
 * A categoria da TACO é grossa: "Cereais e derivados" junta arroz e biscoito recheado.
 * Numa folha entregue ao paciente, isso é conselho ruim, então esses saem da lista.
 */
const NAO_EQUIVALE =
  /(^|[\s,])(biscoito|bolo|torta|chocolate|bombom|brigadeiro|doce|docinho|goiabada|geleia|sorvete|picol(é|e)|pudim|mousse|refrigerante|suco em p(ó|o)|achocolatado|salgadinho|pizza|hamb(ú|u)rguer|nuggets|empanado|salsicha|lingui(ç|c)a|mortadela|salame|presunto|bacon|toucinho|maionese|catchup|ketchup|mostarda|leite condensado|creme de leite|a(ç|c)(ú|u)car)/i

const ehTrocaRazoavel = (a: Alimento): boolean => !NAO_EQUIVALE.test(a.descricao)

type Macro = 'proteina_g' | 'carboidrato_g' | 'lipideos_g'
const KCAL_POR_GRAMA: Readonly<Record<Macro, number>> = { proteina_g: 4, carboidrato_g: 4, lipideos_g: 9 }

/** Qual macronutriente carrega a energia do alimento; `null` quando a tabela não sabe. */
function macroDominante(a: Alimento): Macro | null {
  const energias = (Object.keys(KCAL_POR_GRAMA) as Macro[]).map((m) => ({ m, kcal: (a.nutrientes[m] ?? 0) * KCAL_POR_GRAMA[m] }))
  const maior = energias.reduce((x, y) => (y.kcal > x.kcal ? y : x))
  return maior.kcal <= 0 ? null : maior.m
}

/** "Arroz, tipo 1, cozido" → "arroz": o que vem antes da primeira vírgula. */
const nomeBase = (descricao: string): string => (descricao.split(',')[0] ?? descricao).trim().toLowerCase()

/**
 * Trocar arroz tipo 1 por arroz tipo 2 não é troca. Deixa passar uma variação do
 * mesmo alimento (arroz branco por integral, que muda de verdade) e corta o resto.
 */
function variedade(baseDoOriginal: string) {
  const vistos = new Map<string, number>()
  return ({ a }: { readonly a: Alimento }): boolean => {
    const nome = nomeBase(a.descricao)
    const limite = nome === baseDoOriginal ? 1 : 2
    const quantos = vistos.get(nome) ?? 0
    if (quantos >= limite) return false
    vistos.set(nome, quantos + 1)
    return true
  }
}

/**
 * Trocas equivalentes em energia, dentro da mesma categoria da tabela.
 * Alimento sem energia na tabela fica de fora: não dá para dizer o que equivale.
 */
export function trocasDoAlimento(
  original: { readonly alimentoId: number; readonly gramas: number },
  opcoes: OpcoesTrocas,
): readonly Troca[] {
  const limite = opcoes.porAlimento ?? 3
  const restricoes = opcoes.restricoes ?? []
  const base = opcoes.alimentos.find((a) => a.id === original.alimentoId)
  const kcalBase = base ? kcalPorCem(base) : null
  if (!base || kcalBase === null || original.gramas <= 0) return []

  return opcoes.alimentos
    .filter((a) => a.id !== base.id && a.categoria === base.categoria && ehSugerivel(a) && ehTrocaRazoavel(a))
    // Trocar arroz por azeite tem a mesma energia e não é troca: o macro que sustenta precisa ser o mesmo.
    .filter((a) => macroDominante(a) === macroDominante(base))
    .filter((a) => !casaRestricao(a.descricao, restricoes))
    .map((a) => ({ a, kcal: kcalPorCem(a) }))
    .filter((x): x is { a: Alimento; kcal: number } => x.kcal !== null)
    .map(({ a, kcal }) => {
      const gramas = Math.round((kcalBase * original.gramas) / kcal)
      return { a, gramas }
    })
    // Porção que ninguém come na vida real não ajuda o paciente.
    .filter(({ gramas }) => gramas >= 5 && gramas <= 600)
    .sort((x, y) => {
      const comum = Number(ehDeUsoComum(y.a)) - Number(ehDeUsoComum(x.a))
      if (comum !== 0) return comum
      // Depois do uso comum, quem tem medida caseira ganha: é o que o paciente entende.
      const medida = Number(medidaEquivalente(y.a.id, y.gramas) !== null) - Number(medidaEquivalente(x.a.id, x.gramas) !== null)
      if (medida !== 0) return medida
      // Porção parecida com a original faz a troca parecer natural no prato.
      const perto = Math.abs(x.gramas - original.gramas) - Math.abs(y.gramas - original.gramas)
      if (perto !== 0) return perto
      return x.a.descricao.localeCompare(y.a.descricao, 'pt-BR')
    })
    .filter(variedade(nomeBase(base.descricao)))
    .slice(0, limite)
    .map(({ a, gramas }) => ({ alimentoId: a.id, descricao: a.descricao, gramas, medida: medidaEquivalente(a.id, gramas) }))
}

/**
 * Uma entrada por alimento distinto usado na opção principal do plano.
 * Repetido no dia (arroz no almoço e no jantar) aparece uma vez só, na maior porção.
 */
export function trocasDoPlano(plano: Plano, buscar: BuscarAlimento, opcoes: OpcoesTrocas): readonly GrupoDeTrocas[] {
  const maiorPorcao = new Map<number, number>()
  for (const refeicao of plano.refeicoes) {
    for (const item of refeicao.opcoes.principal) {
      maiorPorcao.set(item.alimentoId, Math.max(maiorPorcao.get(item.alimentoId) ?? 0, item.gramas))
    }
  }

  const grupos: GrupoDeTrocas[] = []
  for (const [alimentoId, gramas] of maiorPorcao) {
    const alimento = buscar(alimentoId)
    if (!alimento) continue
    const trocas = trocasDoAlimento({ alimentoId, gramas }, opcoes)
    if (trocas.length === 0) continue
    grupos.push({
      alimentoId,
      descricao: alimento.descricao,
      gramas,
      medida: medidaEquivalente(alimentoId, gramas),
      categoria: alimento.categoria,
      trocas,
    })
  }
  return grupos.sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR') || a.descricao.localeCompare(b.descricao, 'pt-BR'))
}
