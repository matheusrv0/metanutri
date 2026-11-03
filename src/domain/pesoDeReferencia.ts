// Compleição (Grant), peso ideal, peso ajustado e peso de referência (spec antropometria-completa, D-1027 e D-1028).
// Estatura em cm (as contas usam metros), peso em kg.
import { IDADE_ADULTO, IDADE_IDOSO, calcularImc } from './antropometria.ts'
import { FONTES, type Fonte } from './fontesAntropometria.ts'
import { CAMPOS } from './indicadoresCorporais.ts'
import { gorduraDoCaso, type OpcoesDaGordura } from './indicadoresDeGordura.ts'
import { dentroDoIntervalo, linhaSemValor, medidaValida, naPrecisao, situacaoNaFaixa, type CampoQueFalta, type FaixaRotulada, type Intervalo, type LinhaDoResultado } from './linhaDoResultado.ts'
import type { Caso, Sexo } from './tipos.ts'

const adultoForaDaGestacao = (caso: Caso) => caso.idadeAnos !== null && caso.idadeAnos >= IDADE_ADULTO && caso.condicao.tipo !== 'gestante'
const PUNHO: CampoQueFalta = { campo: 'medidasCorporais.punhoCm', nome: 'o punho' }

export type Compleicao = 'pequena' | 'media' | 'grande'

/** Grant, versão A (São Camilo 2025 + CEPRAN 2014): r = estatura ÷ punho, com 1 casa (D-1028). */
const GRANT: Readonly<Record<Sexo, readonly (FaixaRotulada & { readonly compleicao: Compleicao })[]>> = {
  M: [
    { min: 10.4, minInclusivo: false, max: null, maxInclusivo: false, rotulo: 'Pequena', nivel: 'informativo', compleicao: 'pequena' },
    { min: 9.6, minInclusivo: true, max: 10.4, maxInclusivo: true, rotulo: 'Média', nivel: 'informativo', compleicao: 'media' },
    { min: null, minInclusivo: false, max: 9.6, maxInclusivo: false, rotulo: 'Grande', nivel: 'informativo', compleicao: 'grande' },
  ],
  F: [
    { min: 11, minInclusivo: false, max: null, maxInclusivo: false, rotulo: 'Pequena', nivel: 'informativo', compleicao: 'pequena' },
    { min: 10.1, minInclusivo: true, max: 11, maxInclusivo: true, rotulo: 'Média', nivel: 'informativo', compleicao: 'media' },
    { min: null, minInclusivo: false, max: 10.1, maxInclusivo: false, rotulo: 'Grande', nivel: 'informativo', compleicao: 'grande' },
  ],
}

/** A razão estatura ÷ punho do caso (adulto, fora da gestação) ou o que falta. */
function razaoDeGrant(caso: Caso): { readonly r: number; readonly sexo: Sexo } | { readonly falta: CampoQueFalta[] } {
  const estatura = medidaValida(caso.estaturaCm)
  const punho = medidaValida(caso.medidasCorporais.punhoCm)
  const { sexo } = caso
  if (estatura === null || punho === null || sexo === null) {
    return { falta: [...(sexo === null ? [CAMPOS.sexo] : []), ...(estatura === null ? [CAMPOS.estatura] : []), ...(punho === null ? [PUNHO] : [])] }
  }
  return { r: estatura / punho, sexo }
}

export function linhaCompleicao(caso: Caso): LinhaDoResultado | null {
  if (!adultoForaDaGestacao(caso)) return null
  const linha = { id: 'compleicao', nome: 'Compleição (estatura ÷ punho)', unidade: '', casas: 1 } as const
  const g = razaoDeGrant(caso)
  if ('falta' in g) return linhaSemValor(linha, g.falta)
  return { ...linhaSemValor(linha, []), valor: g.r, situacao: situacaoNaFaixa(g.r, linha.casas, GRANT[g.sexo]), fonte: FONTES.grant1981 }
}

/** A compleição do caso, para o IMC-alvo do peso ideal; sem punho ou estatura, `null`. */
export function compleicaoDoCaso(caso: Caso): Compleicao | null {
  if (!adultoForaDaGestacao(caso)) return null
  const g = razaoDeGrant(caso)
  if ('falta' in g) return null
  const exibido = naPrecisao(g.r, 1)
  return GRANT[g.sexo].find((f) => dentroDoIntervalo(exibido, f))?.compleicao ?? null
}

/** São Camilo 2025 (item 3.1): pequena 18,50; média 21,75; grande 24,99 [V1] (D-1027). */
const IMC_ALVO_POR_COMPLEICAO: Readonly<Record<Compleicao, number>> = { pequena: 18.5, media: 21.75, grande: 24.99 }
/** Idoso: 24,5, o meio da eutrofia do SISVAN (22 a 27) e a opção de IMC 24,5 da pesquisa (3.15) (D-1027). */
const IMC_ALVO_DO_IDOSO = 24.5

export interface PesoIdeal {
  readonly calculou: true
  /** kg/m² usado na conta. */
  readonly imcAlvo: number
  readonly origemDoImcAlvo: 'digitado' | 'compleicao' | 'padrao-do-adulto' | 'padrao-do-idoso'
  readonly pesoKg: number
  /** A faixa de eutrofia da fase da vida × estatura². */
  readonly faixaKg: Intervalo
  readonly fonte: Fonte
}
export type ResultadoDoPesoIdeal = PesoIdeal | { readonly calculou: false; readonly falta: readonly CampoQueFalta[] }

/** Peso ideal = IMC-alvo × estatura² (m), de 20 anos em diante e fora da gestação; senão, `null` (D-1027). */
export function pesoIdeal(caso: Caso, imcAlvoDigitado: number | null = null): ResultadoDoPesoIdeal | null {
  if (!adultoForaDaGestacao(caso)) return null
  const estatura = medidaValida(caso.estaturaCm)
  if (estatura === null) return { calculou: false, falta: [CAMPOS.estatura] }
  const m2 = (estatura / 100) ** 2
  const idoso = caso.idadeAnos !== null && caso.idadeAnos >= IDADE_IDOSO
  const compleicao = idoso ? null : compleicaoDoCaso(caso)
  const digitado = medidaValida(imcAlvoDigitado)
  const imcAlvo = digitado ?? (idoso ? IMC_ALVO_DO_IDOSO : compleicao ? IMC_ALVO_POR_COMPLEICAO[compleicao] : IMC_ALVO_POR_COMPLEICAO.media)
  const origemDoImcAlvo = digitado !== null ? 'digitado' : idoso ? 'padrao-do-idoso' : compleicao ? 'compleicao' : 'padrao-do-adulto'
  const faixaKg: Intervalo = idoso
    ? { min: 22 * m2, minInclusivo: false, max: 27 * m2, maxInclusivo: false }
    : { min: 18.5 * m2, minInclusivo: true, max: 24.99 * m2, maxInclusivo: true }
  return { calculou: true, imcAlvo, origemDoImcAlvo, pesoKg: imcAlvo * m2, faixaKg, fonte: FONTES.saoCamilo2025 }
}

export interface PesoAjustado {
  readonly calculou: true
  readonly pesoKg: number
  /** O peso no IMC 25, a mesma conta da meta de água (`agua.ts`). */
  readonly pesoNoImc25Kg: number
  readonly fonte: Fonte
}
export type ResultadoDoPesoAjustado = PesoAjustado | { readonly calculou: false; readonly falta: readonly CampoQueFalta[] }

/**
 * Peso ajustado = (peso atual − PI₂₅) × 0,25 + PI₂₅, a partir de IMC 30 (opção: acima de 27). Abaixo do gatilho, ou
 * fora do adulto, `null` (D-1027).
 */
export function pesoAjustado(caso: Caso, gatilho: 30 | 27 = 30): ResultadoDoPesoAjustado | null {
  if (!adultoForaDaGestacao(caso)) return null
  const peso = medidaValida(caso.pesoKg)
  const estatura = medidaValida(caso.estaturaCm)
  if (peso === null || estatura === null) return { calculou: false, falta: [...(peso === null ? [CAMPOS.peso] : []), ...(estatura === null ? [CAMPOS.estatura] : [])] }
  const imc = naPrecisao(calcularImc(peso, estatura), 2)
  if (gatilho === 30 ? imc < 30 : imc <= 27) return null
  const pesoNoImc25Kg = 25 * (estatura / 100) ** 2
  return { calculou: true, pesoKg: (peso - pesoNoImc25Kg) * 0.25 + pesoNoImc25Kg, pesoNoImc25Kg, fonte: FONTES.pesoAjustado }
}

export type BaseDoPeso = 'peso-atual' | 'peso-ideal' | 'peso-ajustado' | 'massa-magra'

export interface OpcaoDePeso {
  readonly base: BaseDoPeso
  readonly pesoKg: number | null
  /** Por que não há peso nesta base. */
  readonly motivo: string | null
}

export interface PesoDeReferencia {
  /** IMC < 30: o peso atual; IMC ≥ 30: `null`, a nutricionista escolhe (R4.3a; D-1027). */
  readonly sugerido: BaseDoPeso | null
  readonly opcoes: readonly OpcaoDePeso[]
}

/** O peso de referência das contas (proteína): o atual abaixo de IMC 30; acima, peso ideal, ajustado ou massa magra. */
export function pesoDeReferencia(caso: Caso, opcoes: { readonly imcAlvo?: number | null; readonly gordura?: OpcoesDaGordura } = {}): PesoDeReferencia | null {
  const peso = medidaValida(caso.pesoKg)
  const estatura = medidaValida(caso.estaturaCm)
  if (peso === null || estatura === null) return null
  if (naPrecisao(calcularImc(peso, estatura), 2) < 30) return { sugerido: 'peso-atual', opcoes: [{ base: 'peso-atual', pesoKg: peso, motivo: null }] }
  const ideal = pesoIdeal(caso, opcoes.imcAlvo ?? null)
  const ajustado = pesoAjustado(caso)
  const massaMagra = gorduraDoCaso(caso, opcoes.gordura)?.massaMagraKg ?? null
  return {
    sugerido: null,
    opcoes: [
      { base: 'peso-ideal', pesoKg: ideal?.calculou ? ideal.pesoKg : null, motivo: ideal?.calculou ? null : 'O peso ideal vale de 20 anos em diante, com a estatura.' },
      { base: 'peso-ajustado', pesoKg: ajustado?.calculou ? ajustado.pesoKg : null, motivo: ajustado?.calculou ? null : 'O peso ajustado vale de 20 anos em diante, com IMC de 30 ou mais.' },
      { base: 'massa-magra', pesoKg: massaMagra, motivo: massaMagra === null ? 'Sem % de gordura das dobras ou da bioimpedância.' : null },
    ],
  }
}
