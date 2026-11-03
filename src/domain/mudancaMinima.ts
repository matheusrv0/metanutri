// Mudança mínima detectável entre duas avaliações (spec antropometria-completa, D-1035; pesquisa 4.7, R4.7a–f).
// Na unidade da própria medida: mm nas dobras e na soma de dobras, cm nas circunferências.
import { FONTES, PROPOSTA_DO_APP, type Fonte } from './fontesAntropometria.ts'
import { medidaValida } from './linhaDoResultado.ts'

/** 1,96 × √2 ≈ 2,77: 95% de confiança, e a diferença carrega o erro das duas medidas (Weir 2005). */
export const FATOR_DA_MMD = 1.96 * Math.SQRT2

/** ETM padrão quando o avaliador não tem o seu: as metas da ISAK nível 1 (pesquisa 4.10, D13). */
export const ETM_PADRAO_PCT = { dobra: 7.5, outra: 1.5 } as const

export type TipoDeMedida = keyof typeof ETM_PADRAO_PCT

export interface MudancaMinima {
  /** ETM na unidade da medida. */
  readonly etm: number
  readonly mmd: number
  readonly etmPadrao: boolean
}

/** MMD95 = 1,96 × √2 × ETM; sem o ETM do avaliador, o padrão ISAK sobre o valor de referência (R4.7b; D-1035). */
export function mudancaMinimaDetectavel(valorDeReferencia: number, tipo: TipoDeMedida, etmDoAvaliador: number | null = null): MudancaMinima {
  const proprio = medidaValida(etmDoAvaliador)
  const etm = proprio ?? (valorDeReferencia * ETM_PADRAO_PCT[tipo]) / 100
  return { etm, mmd: FATOR_DA_MMD * etm, etmPadrao: proprio === null }
}

export interface ComparacaoDeAvaliacoes extends MudancaMinima {
  readonly diferenca: number
  readonly interpretacao: 'dentro-do-erro' | 'provavelmente-real'
  readonly texto: string
  readonly fonte: Fonte
  readonly avisos: readonly string[]
}

/**
 * A variação de uma medida só (uma dobra, a cintura) entre a avaliação anterior e a atual contra a MMD, com o ETM
 * padrão sobre a média das duas medidas (conta nossa). |Δ| ≥ MMD: mudança provavelmente real; menor: dentro do erro de
 * medida (R4.7d). Medida vazia: `null` (CB-1014). A soma de dobras vai por `compararSomasDeDobras`.
 */
export function compararAvaliacoes(
  anterior: number | null,
  atual: number | null,
  tipo: TipoDeMedida,
  opcoes: { readonly etmDoAvaliador?: number | null; readonly avaliadoresDiferentes?: boolean } = {},
): ComparacaoDeAvaliacoes | null {
  const a = medidaValida(anterior)
  const b = medidaValida(atual)
  if (a === null || b === null) return null
  const minima = mudancaMinimaDetectavel((a + b) / 2, tipo, opcoes.etmDoAvaliador ?? null)
  const diferenca = b - a
  // Igual à MMD conta como real (pesquisa 4.7); a folga de 1e-9 absorve o erro de ponto flutuante da subtração.
  const real = Math.abs(diferenca) + 1e-9 >= minima.mmd
  const avisos: string[] = []
  if (minima.etmPadrao) {
    avisos.push('Sem o ETM do avaliador: usado o limite da ISAK nível 1 (7,5% nas dobras; 1,5% nas outras medidas).')
    avisos.push(`${PROPOSTA_DO_APP}: o limite é aplicado sobre a média das duas medidas.`)
  }
  if (opcoes.avaliadoresDiferentes) avisos.push('Medido por outro avaliador: a comparação tem erro maior que o habitual.')
  return {
    ...minima,
    diferenca,
    interpretacao: real ? 'provavelmente-real' : 'dentro-do-erro',
    texto: real ? 'Mudança provavelmente real.' : 'Dentro do erro de medida: não interpretar como mudança.',
    fonte: FONTES.mudancaMinima,
    avisos,
  }
}

/**
 * A variação da soma de dobras entre duas avaliações (D-1035 revista; R4.7c): o ETM da soma é √Σ ETM² das dobras, com o
 * ETM de cada dobra do avaliador ou 7,5% da média dela nas duas avaliações. As listas trazem as dobras na mesma ordem;
 * dobra vazia, listas vazias ou de tamanhos diferentes: `null`.
 */
export function compararSomasDeDobras(
  anteriores: readonly (number | null)[],
  atuais: readonly (number | null)[],
  opcoes: { readonly etmPorDobra?: readonly number[] | null; readonly avaliadoresDiferentes?: boolean } = {},
): ComparacaoDeAvaliacoes | null {
  if (anteriores.length === 0 || anteriores.length !== atuais.length) return null
  const a = anteriores.map(medidaValida)
  const b = atuais.map(medidaValida)
  if (a.some((v) => v === null) || b.some((v) => v === null)) return null
  const proprios = opcoes.etmPorDobra?.length === a.length ? opcoes.etmPorDobra.map(medidaValida) : null
  const etmPadrao = proprios === null || proprios.some((v) => v === null)
  const etms = a.map((v, i) => (etmPadrao ? (((v ?? 0) + (b[i] ?? 0)) / 2) * (ETM_PADRAO_PCT.dobra / 100) : (proprios?.[i] ?? 0)))
  const etm = Math.sqrt(etms.reduce((total, e) => total + e * e, 0))
  const mmd = FATOR_DA_MMD * etm
  const diferenca = b.reduce<number>((t, v) => t + (v ?? 0), 0) - a.reduce<number>((t, v) => t + (v ?? 0), 0)
  // Igual à MMD conta como real; a folga de 1e-9 absorve o ponto flutuante (como em `compararAvaliacoes`).
  const real = Math.abs(diferenca) + 1e-9 >= mmd
  const avisos = [`${PROPOSTA_DO_APP}: o ETM da soma é a raiz da soma dos quadrados dos ETM das dobras, supondo erros independentes.`]
  if (etmPadrao) avisos.push('Sem o ETM do avaliador: usado o limite da ISAK nível 1 (7,5% de cada dobra).')
  if (opcoes.avaliadoresDiferentes) avisos.push('Medido por outro avaliador: a comparação tem erro maior que o habitual.')
  return {
    etm,
    mmd,
    etmPadrao,
    diferenca,
    interpretacao: real ? 'provavelmente-real' : 'dentro-do-erro',
    texto: real ? 'Mudança provavelmente real.' : 'Dentro do erro de medida: não interpretar como mudança.',
    fonte: FONTES.mudancaMinima,
    avisos,
  }
}
