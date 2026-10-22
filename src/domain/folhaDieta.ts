// O que a folha da dieta mostra e como ela lembra as escolhas de impressão
// (spec pdf-e-telas-limpas, US-B1).
import { nutricionistaDoWord, type AssinaturaDoPlano } from './assinaturaDoPlano.ts'
import { aguaDoCaso } from './agua.ts'
import { quantosLitros } from './missoes.ts'
import { PACIENTE_SEM_NOME } from './nomeDoPaciente.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import type { Armazenamento } from './persistencia.ts'
import { quantidadeNaFolha, type QuantidadeNaFolha } from './quantidadeNaFolha.ts'
import { ehItemDeReceita, ingredientesNaQuantidade, nomeDaReceita, receitaComOQueComer, receitaDoItem, receitasDoPlano, textoDaPorcao, textoDoRendimento } from './receitaNoPlano.ts'
import { medidasDoAlimento } from './busca.ts'
import { unidadeDo } from './liquido.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import { OPCOES, type Alimento, type BuscarAlimento, type Caso, type ItemPlano, type ModoQuantidade, type Plano, type Refeicao } from './tipos.ts'
import type { GrupoDeTrocas, Troca } from './trocas.ts'

export type AssinaturaDaFolha =
  | { readonly tipo: 'nutricionista'; readonly linha: string }
  | { readonly tipo: 'estagio'; readonly estagiario: string; readonly preceptor: string }
  | { readonly tipo: 'vazia' }

/** CA-313: as mesmas regras do Word (spec ajustes-de-uso, CA-252 e CB-51). */
export function assinaturaDaFolha(assinatura: AssinaturaDoPlano | null, caso: Caso): AssinaturaDaFolha {
  const nutricionista = nutricionistaDoWord(assinatura, caso)
  if (nutricionista !== null) return { tipo: 'nutricionista', linha: nutricionista }
  const estagiario = caso.estagiario.trim()
  const preceptor = caso.preceptor.trim()
  if (estagiario || preceptor) return { tipo: 'estagio', estagiario, preceptor }
  return { tipo: 'vazia' }
}

/**
 * As opções de uma refeição que têm alimento, na ordem principal, substituto 1, substituto 2 (spec
 * impressao-do-plano, CA-631 e CA-632): na folha, a primeira vem sem "ou" e as outras depois de "ou". O item cujo
 * alimento não existe mais (produto apagado em "Meus produtos") fica de fora, inteiro: o paciente não recebe uma
 * linha que não diz o que comer (spec revisao-geral-trabalho, D-248). A receita fica: ela não está na base, e o nome
 * dela vem da cópia guardada no item (spec receitas-com-calculo, CA-879), quando tem o que comer (CB-317 da
 * integracao-rodada-1910): a cópia estragada e a receita sem ingrediente que exista ficam de fora, como o item apagado.
 */
export function opcoesDaRefeicao(refeicao: Refeicao, buscar: BuscarAlimento = buscarAlimento): readonly (readonly ItemPlano[])[] {
  return OPCOES.map((opcao) =>
    refeicao.opcoes[opcao].filter((i) => i.gramas > 0 && (ehItemDeReceita(i) ? receitaComOQueComer(receitaDoItem(i), buscar) : buscar(i.alimentoId) !== undefined)),
  ).filter(
    (itens) => itens.length > 0,
  )
}

export interface CompraDaFolha {
  readonly nome: string
  readonly gramas: number
  /** O primeiro alimento do plano com esse nome: dá a medida caseira da linha (CA-643). */
  readonly alimentoId: number
}

/**
 * A lista de compras da folha: a principal do dia, somada pelo nome que o paciente lê, em ordem alfabética (spec
 * impressao-do-plano, CA-628 e CB-181). Dois alimentos com o mesmo nome viram uma linha só.
 */
export function comprasDaFolha(plano: Plano, buscar: BuscarAlimento): readonly CompraDaFolha[] {
  const porNome = new Map<string, CompraDaFolha>()
  const somar = (alimentoId: number, gramas: number) => {
    if (!(gramas > 0)) return
    const nome = nomeParaPaciente(buscar(alimentoId))
    const antes = porNome.get(nome)
    porNome.set(nome, { nome, gramas: (antes?.gramas ?? 0) + gramas, alimentoId: antes?.alimentoId ?? alimentoId })
  }
  for (const refeicao of plano.refeicoes) {
    for (const item of refeicao.opcoes.principal) {
      if (item.gramas <= 0) continue
      // Spec receitas-com-calculo, CA-881: a receita entra pelos ingredientes, na quantidade do dia. O ingrediente que
      // não existe mais não vira linha: não há o que comprar (CB-271).
      if (ehItemDeReceita(item)) {
        const receita = receitaDoItem(item)
        for (const i of receita ? ingredientesNaQuantidade(receita, item.gramas) : []) if (buscar(i.alimentoId)) somar(i.alimentoId, i.gramas)
        continue
      }
      // D-248 (spec revisao-geral-trabalho): o produto apagado não entra na lista de compras do paciente.
      if (buscar(item.alimentoId)) somar(item.alimentoId, item.gramas)
    }
  }
  return [...porNome.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

// ---------- Lista de compras da semana (spec impressao-do-plano, correção A, D-445) ----------

export interface CompraDaSemana {
  /** O nome do que se compra: o alimento cru quando se come cozido ("Arroz branco"), sem "(peso cru)". */
  readonly nome: string
  /** "400 g", "1,2 kg", "14 unidades", "1,4 litro", "700 ml". */
  readonly texto: string
}

export const DIAS_DA_LISTA = 7

/** O que se compra cru e se come cozido, grelhado ou assado: o peso de compra sai da energia da TACO. */
const CATEGORIAS_DO_PESO_CRU: ReadonlySet<string> = new Set(['Cereais e derivados', 'Leguminosas e derivados', 'Carnes e derivados', 'Pescados e frutos do mar'])
/** O que se compra contado, pela unidade (ovo, fruta, pão). */
const contado = (a: Alimento): boolean => a.categoria.startsWith('Frutas') || a.categoria === 'Ovos e derivados' || /^Pão,/.test(a.descricao.trim())

const semAcentoMinusculo = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
const partes = (descricao: string): string[] => semAcentoMinusculo(descricao).split(',').map((p) => p.trim())
const PRONTO = /^(cozid|grelhad|assad)/
const CRU = /^cru[ao]?s?$/

/** O alimento cru da base com o mesmo nome do pronto ("Arroz, tipo 1, cozido" → "Arroz, tipo 1, cru"), por raiz do nome. */
let crusPorRaiz: ReadonlyMap<string, Alimento> | null = null
function parCru(alimento: Alimento): Alimento | null {
  const p = partes(alimento.descricao)
  if (!PRONTO.test(p.at(-1) ?? '')) return null
  crusPorRaiz ??= new Map(
    ALIMENTOS.filter((a) => CRU.test(partes(a.descricao).at(-1) ?? '')).map((a) => [partes(a.descricao).slice(0, -1).join(','), a] as const),
  )
  return crusPorRaiz.get(p.slice(0, -1).join(',')) ?? null
}

const pesoDaUnidade = (alimentoId: number): number | null => medidasDoAlimento(alimentoId).find((m) => m.nome === 'unidade')?.gramas ?? null
const umaCasaDecimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const arredondarPara = (valor: number, passo: number): number => Math.ceil(valor / passo - 1e-9) * passo

/** "350 g", "1,2 kg" (de 50 em 50 g; acima de 1 kg, de 100 em 100 g); em ml, "700 ml", "1,4 litro", "2,8 litros". */
function textoDoPesoDeCompra(total: number, unidade: 'g' | 'ml'): string {
  if (total < 1000) return `${arredondarPara(total, 50)} ${unidade}`
  const milhares = arredondarPara(total, 100) / 1000
  if (unidade === 'g') return `${umaCasaDecimal.format(milhares)} kg`
  return `${umaCasaDecimal.format(milhares)} ${milhares < 2 ? 'litro' : 'litros'}`
}

/**
 * D-445: a lista de compras da semana, no peso de compra. A principal do dia vezes 7; o que a base tem cru e se come
 * pronto (arroz, feijão, lentilha, massa fresca, carne, ave e peixe) vai para o peso cru pela energia (a energia se
 * conserva no preparo: só entra ou sai água); ovo, fruta e pão com "unidade" saem em unidades; líquido em ml ou litros;
 * o resto em gramas. A receita entra pelos ingredientes. Ordem alfabética.
 */
export function comprasDaSemana(plano: Plano, buscar: BuscarAlimento): readonly CompraDaSemana[] {
  const somas = new Map<number, { compra: Alimento; gramas: number; unidades: number }>()
  const somar = (alimentoId: number, gramasDoDia: number) => {
    const comido = buscar(alimentoId)
    if (!comido || !(gramasDoDia > 0)) return
    const semana = gramasDoDia * DIAS_DA_LISTA
    const cru = parCru(comido)
    const compra = cru ?? comido
    const soma = somas.get(compra.id) ?? { compra, gramas: 0, unidades: 0 }
    const unidade = contado(comido) ? pesoDaUnidade(comido.id) : null
    const kcalComido = comido.nutrientes.energia_kcal
    const kcalCru = cru?.nutrientes.energia_kcal ?? null
    if (unidade) soma.unidades += semana / unidade
    else if (cru && CATEGORIAS_DO_PESO_CRU.has(comido.categoria) && kcalComido && kcalCru) soma.gramas += (semana * kcalComido) / kcalCru
    else soma.gramas += semana
    somas.set(compra.id, soma)
  }
  for (const refeicao of plano.refeicoes) {
    for (const item of refeicao.opcoes.principal) {
      if (item.gramas <= 0) continue
      if (ehItemDeReceita(item)) {
        const receita = receitaDoItem(item)
        for (const i of receita ? ingredientesNaQuantidade(receita, item.gramas) : []) somar(i.alimentoId, i.gramas)
        continue
      }
      somar(item.alimentoId, item.gramas)
    }
  }
  const linhas = [...somas.values()].map(({ compra, gramas, unidades }): CompraDaSemana => {
    const nome = nomeParaPaciente(compra).replace(/\s*\(peso cru\)$/, '')
    const unidadeDaCompra = pesoDaUnidade(compra.id)
    if (unidades > 0) {
      const total = Math.max(1, Math.ceil(unidades + (unidadeDaCompra ? gramas / unidadeDaCompra : 0) - 1e-9))
      return { nome, texto: `${total} ${total === 1 ? 'unidade' : 'unidades'}` }
    }
    return { nome, texto: textoDoPesoDeCompra(gramas, unidadeDo(compra)) }
  })
  return linhas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Uma linha de alimento na folha: o nome que o paciente lê e a quantidade (spec impressao-do-plano). */
export interface LinhaDaFolha {
  readonly nome: string
  readonly quantidade: QuantidadeNaFolha
}

/**
 * A linha da refeição na folha. Alimento: o nome para o paciente e a quantidade na escolha do plano (D-181; D-297 da
 * conduta-da-nutricionista). Receita (spec receitas-com-calculo, CA-879): o nome como foi escrito e a porção ("1
 * unidade"); sem meia porção que feche, ou em "Gramas", o peso.
 */
export function linhaDaFolha(item: ItemPlano, buscar: BuscarAlimento, modo: ModoQuantidade = 'medida-caseira'): LinhaDaFolha {
  // G1 (spec alimentos-e-gramaturas): a medida escolhida no item vem antes da automática.
  if (!ehItemDeReceita(item)) return { nome: nomeParaPaciente(buscar(item.alimentoId)), quantidade: quantidadeNaFolha(item.alimentoId, item.gramas, modo, item.medida) }
  const receita = receitaDoItem(item)
  const medida = modo === 'gramas' || !receita ? null : textoDaPorcao(receita, item.gramas)
  return { nome: nomeDaReceita(receita), quantidade: quantidadeDaReceita(medida, item.gramas, modo) }
}

/** A porção da receita como quantidade da folha: em "Medida e gramas", o peso ao lado (D-376). */
export function quantidadeDaReceita(porcao: string | null, gramas: number, modo: ModoQuantidade): QuantidadeNaFolha {
  return { medida: porcao, gramas, unidade: 'g', aproximada: false, comPeso: modo === 'medida-e-gramas' }
}

/** Uma receita na seção "Receitas" da folha (CA-880). */
export interface ReceitaDaFolha {
  readonly nome: string
  /** "Rende 2 unidades (120 g cada)". */
  readonly rendimento: string
  /** Os ingredientes da receita inteira, com o nome para o paciente e a quantidade da folha. */
  readonly ingredientes: readonly LinhaDaFolha[]
  readonly preparo: string
}

/**
 * CA-880 e CB-278: cada receita do plano uma vez, na ordem das refeições, com os ingredientes da receita inteira. O
 * ingrediente apagado fica de fora, como o item apagado da refeição (D-248 da revisao-geral-trabalho; D-317 da
 * integracao-rodada-1910).
 */
export function receitasDaFolha(plano: Plano, buscar: BuscarAlimento, modo: ModoQuantidade = 'medida-caseira'): readonly ReceitaDaFolha[] {
  return receitasDoPlano(plano)
    .filter((r) => receitaComOQueComer(r, buscar))
    .map((r) => ({
      nome: nomeDaReceita(r),
      rendimento: textoDoRendimento(r),
      ingredientes: r.ingredientes
        .filter((i) => i.gramas > 0 && buscar(i.alimentoId) !== undefined)
        .map((i) => ({ nome: nomeParaPaciente(buscar(i.alimentoId)), quantidade: quantidadeNaFolha(i.alimentoId, i.gramas, modo) })),
      preparo: r.preparo.trim(),
    }))
}

/** A linha da água para uma meta em litros: "Beba cerca de 2,5 litros de água por dia." */
export const linhaDaAguaPara = (litros: number): string => `Beba cerca de ${quantosLitros(litros)} de água por dia.`

/**
 * A linha da água no começo de "Orientações" (spec conduta-da-nutricionista, D-298): o que a nutricionista escreveu, ou
 * a automática quando ela não mexeu. Escrito vazio tira a linha. Plano antigo, sem o campo, usa a automática (CB-290).
 */
export function linhaDaAguaNaFolha(caso: Caso): string | null {
  // A linha escrita à mão antes da meta pelo peso continua até "Usar a calculada" (CA-1095); vazia, sai (D-298).
  if (typeof caso.linhaDaAgua === 'string') return caso.linhaDaAgua.trim() || null
  const { litros } = aguaDoCaso(caso)
  return litros === null ? null : linhaDaAguaPara(litros)
}

/** Quem assina numa linha só, para a linha fina (CA-316; também nas folhas do paciente, spec anamnese-e-prescricoes). */
export function assinaturaEmTexto(assinatura: AssinaturaDaFolha): string {
  return assinatura.tipo === 'nutricionista'
    ? assinatura.linha
    : assinatura.tipo === 'estagio'
      ? [assinatura.estagiario, assinatura.preceptor].filter(Boolean).join(' · ')
      : ''
}

/**
 * CA-316: o texto da linha fina do topo, da segunda página em diante. O nome é o do paciente, resolvido por quem chama
 * (`nomeDoPacienteDoPlano`, spec textos-e-promessas, D-409).
 */
export function linhaFinaDaFolha(paciente: string, assinatura: AssinaturaDaFolha): { readonly esquerda: string; readonly direita: string } {
  return { esquerda: `Plano alimentar · ${paciente.trim() || PACIENTE_SEM_NOME}`, direita: assinaturaEmTexto(assinatura) }
}

export interface TrocasDaFolha {
  /** O alimento do plano. */
  readonly alimentoId: number
  readonly nome: string
  readonly trocas: readonly (Troca & { readonly nome: string })[]
}

/** No máximo 2 trocas por alimento na folha (spec pdf-e-telas-limpas, CA-319). */
export const TROCAS_NA_FOLHA = 2

/**
 * Quantas trocas a folha pede a `trocas.ts`: mais do que mostra, porque o corte por nome (CB-188) pode tirar uma, e a
 * vaga não deve ficar vazia (revisão final da integração: o arroz branco do exemplo imprimia só a polenta).
 */
export const TROCAS_PEDIDAS_PELA_FOLHA = 4

/**
 * As trocas como a folha mostra, pelo nome que o paciente lê (spec impressao-do-plano, CB-188): sai a troca com o mesmo
 * nome do alimento do plano (arroz tipo 1 por tipo 2 seria "Arroz branco cozido" por "Arroz branco cozido"), a troca
 * repetida pelo nome, o alimento do plano que fica sem troca e o alimento do plano repetido pelo nome. Das que sobram,
 * ficam as `TROCAS_NA_FOLHA` primeiras.
 */
export function trocasDaFolha(grupos: readonly GrupoDeTrocas[], buscar: BuscarAlimento): readonly TrocasDaFolha[] {
  const vistos = new Set<string>()
  const folha: TrocasDaFolha[] = []
  for (const grupo of grupos) {
    const nome = nomeParaPaciente(buscar(grupo.alimentoId))
    if (vistos.has(nome)) continue
    const nomes = new Set([nome])
    const trocas = grupo.trocas
      .map((t) => ({ ...t, nome: nomeParaPaciente(buscar(t.alimentoId)) }))
      .filter((t) => {
        if (nomes.has(t.nome)) return false
        nomes.add(t.nome)
        return true
      })
      .slice(0, TROCAS_NA_FOLHA)
    if (trocas.length === 0) continue
    vistos.add(nome)
    folha.push({ alimentoId: grupo.alimentoId, nome, trocas })
  }
  return folha
}

export interface OpcoesImpressao {
  readonly listaDeCompras: boolean
  readonly trocas: boolean
}

export const OPCOES_IMPRESSAO_PADRAO: OpcoesImpressao = { listaDeCompras: false, trocas: false }

const CHAVE = 'metanutri:impressao'

/** CA-320: o que foi marcado na última impressão. Dado estragado volta ao padrão. */
export function lerOpcoesImpressao(armazenamento: Armazenamento | null): OpcoesImpressao {
  if (!armazenamento) return OPCOES_IMPRESSAO_PADRAO
  try {
    const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE) ?? 'null')
    if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return OPCOES_IMPRESSAO_PADRAO
    const { listaDeCompras, trocas } = bruto as { listaDeCompras?: unknown; trocas?: unknown }
    return { listaDeCompras: listaDeCompras === true, trocas: trocas === true }
  } catch {
    return OPCOES_IMPRESSAO_PADRAO
  }
}

/** `false` quando o aparelho não guardou: as opções valem só para esta impressão (CB-72). */
export function gravarOpcoesImpressao(armazenamento: Armazenamento | null, opcoes: OpcoesImpressao): boolean {
  if (!armazenamento) return false
  try {
    armazenamento.setItem(CHAVE, JSON.stringify({ listaDeCompras: opcoes.listaDeCompras, trocas: opcoes.trocas }))
    return true
  } catch {
    return false
  }
}
