// A linha "Real | Recomendação | Situação" da antropometria (spec antropometria-completa, D-1001 e D-1016).
import type { Fonte } from './fontesAntropometria.ts'

/** O grau da situação; a tela escolhe a cor do selo. `informativo` não julga (compleição, valor sem referência). */
export type NivelDaSituacao = 'adequado' | 'atencao' | 'alterado' | 'grave' | 'informativo'

/** Uma faixa de valores; `null` é sem limite daquele lado. */
export interface Intervalo {
  readonly min: number | null
  readonly minInclusivo: boolean
  readonly max: number | null
  readonly maxInclusivo: boolean
}

export interface FaixaRotulada extends Intervalo {
  readonly rotulo: string
  readonly nivel: NivelDaSituacao
}

export interface Recomendacao {
  /** Como a tela escreve: "18,50 – 24,99 kg/m²", "Abaixo de 94 cm". */
  readonly texto: string
  readonly faixa: Intervalo
}

export interface Situacao {
  readonly rotulo: string
  readonly nivel: NivelDaSituacao
}

/** Valor de apoio da linha (o IMC da criança, o percentil, o lado medido). Números vão sem arredondar. */
export type Detalhe =
  | { readonly tipo: 'numero'; readonly rotulo: string; readonly valor: number; readonly unidade: string; readonly casas: number }
  | { readonly tipo: 'texto'; readonly rotulo: string; readonly texto: string }

/** O que falta para calcular: o caminho do campo no plano e o nome com artigo ("a estatura"), para a frase da tela. */
export interface CampoQueFalta {
  readonly campo: string
  readonly nome: string
}

export type IdDaLinha =
  | 'imc'
  | 'gordura'
  | 'massa-gorda'
  | 'massa-magra'
  | 'soma-de-dobras'
  | 'cintura'
  | 'rcq'
  | 'rce'
  | 'pescoco'
  | 'cb'
  | 'dct'
  | 'cmb'
  | 'amb'
  | 'agb'
  | 'adequacao-cb'
  | 'adequacao-dct'
  | 'adequacao-cmb'
  | 'panturrilha'
  | 'compleicao'

export interface LinhaDoResultado {
  readonly id: IdDaLinha
  readonly nome: string
  /** Sem arredondar; `null` quando falta dado (nunca 0). */
  readonly valor: number | null
  readonly unidade: string
  /** Casas da tela; a situação é decidida com o valor nessas casas (D-1001). */
  readonly casas: number
  readonly recomendacao: Recomendacao | null
  readonly situacao: Situacao | null
  readonly fonte: Fonte | null
  readonly detalhes: readonly Detalhe[]
  /** Vazio quando calculou. */
  readonly falta: readonly CampoQueFalta[]
  readonly avisos: readonly string[]
}

const formatadores = new Map<number, Intl.NumberFormat>()

/**
 * O valor como a tela mostra com `casas` casas. Usa o mesmo `Intl.NumberFormat` da tela (`formatarNumero`): o
 * `toFixed` discorda dele em valores como 1,005 (1,00 contra 1,01), e o rótulo tem de bater com o número mostrado.
 */
export function naPrecisao(valor: number, casas: number): number {
  let f = formatadores.get(casas)
  if (!f) {
    f = new Intl.NumberFormat('en-US', { minimumFractionDigits: casas, maximumFractionDigits: casas, useGrouping: false })
    formatadores.set(casas, f)
  }
  return Number(f.format(valor))
}

export function dentroDoIntervalo(valor: number, intervalo: Intervalo): boolean {
  const { min, minInclusivo, max, maxInclusivo } = intervalo
  const acimaDoMin = min === null || (minInclusivo ? valor >= min : valor > min)
  const abaixoDoMax = max === null || (maxInclusivo ? valor <= max : valor < max)
  return acimaDoMin && abaixoDoMax
}

/** A situação do valor nas casas da tela; fora de todas as faixas, `null` (não lança). */
export function situacaoNaFaixa(valor: number, casas: number, faixas: readonly FaixaRotulada[]): Situacao | null {
  const exibido = naPrecisao(valor, casas)
  const faixa = faixas.find((f) => dentroDoIntervalo(exibido, f))
  return faixa ? { rotulo: faixa.rotulo, nivel: faixa.nivel } : null
}

/** Medida digitada que vale para conta: finita e maior que zero. O resto conta como não medido (CB-1000). */
export function medidaValida(valor: number | null | undefined): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : null
}

/** Idade em anos: número finito de 0 em diante; vazia, `NaN`, `Infinity` ou negativa é idade não informada (D-1040). */
export function idadeValida(idade: number | null | undefined): number | null {
  return typeof idade === 'number' && Number.isFinite(idade) && idade >= 0 ? idade : null
}

/** Intervalo fechado embaixo e aberto em cima: [min, max). */
export const deAte = (min: number | null, max: number | null): Intervalo => ({ min, minInclusivo: true, max, maxInclusivo: false })

/** A linha que vale para a pessoa e não tem o dado: valor `null` e o que falta. */
export function linhaSemValor(
  base: Pick<LinhaDoResultado, 'id' | 'nome' | 'unidade' | 'casas'>,
  falta: readonly CampoQueFalta[],
  avisos: readonly string[] = [],
): LinhaDoResultado {
  return { ...base, valor: null, recomendacao: null, situacao: null, fonte: null, detalhes: [], falta, avisos }
}
