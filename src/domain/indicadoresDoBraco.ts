// Braço: CB, DCT, CMB, AMB (corrigida de 18 anos em diante), AGB e adequação (spec antropometria-completa, D-1024 a
// D-1026). CB em cm, DCT em mm, áreas em cm². Percentis de Frisancho (src/data/frisancho.json), cada valor com a tabela
// da sua família: CB, DCT, AMB corrigida e AGB com a de 1990; CMB e a AMB sem correção com a de 1981.
import frisancho from '../data/frisancho.json'
import { FONTES, type Fonte } from './fontesAntropometria.ts'
import { ladoMedido } from './indicadoresCorporais.ts'
import { idadeValida, linhaSemValor, medidaValida, naPrecisao, situacaoNaFaixa, type CampoQueFalta, type Detalhe, type FaixaRotulada, type LinhaDoResultado } from './linhaDoResultado.ts'
import type { Caso, Sexo } from './tipos.ts'

export interface MedidasDoBraco {
  readonly cbCm: number
  readonly dctMm: number
  /** CMB = CB − π · DCT/10 (Frisancho 1981). */
  readonly cmbCm: number
  /** Área total do braço = CB²/4π. */
  readonly areaTotalCm2: number
  /** AMB sem correção = CMB²/4π (Frisancho 1981). */
  readonly ambCm2: number
  /** Heymsfield 1982: AMB − 10 (homem) ou − 6,5 (mulher), só de 18 anos em diante; abaixo disso, `null`. */
  readonly ambCorrigidaCm2: number | null
  /** AGB = área total − AMB **sem** correção (Frisancho 1981). */
  readonly agbCm2: number
}

/** As fórmulas do braço, com π exato (pesquisa 3.10). CMB de 0 ou menos não é medida possível: `null` (CB-1006). */
export function medidasDoBraco(cbCm: number, dctMm: number, sexo: Sexo | null, idadeAnos: number | null): MedidasDoBraco | null {
  const cmbCm = cbCm - (Math.PI * dctMm) / 10
  if (!(cmbCm > 0)) return null
  const areaTotalCm2 = (cbCm * cbCm) / (4 * Math.PI)
  const ambCm2 = (cmbCm * cmbCm) / (4 * Math.PI)
  const adulto = (idadeValida(idadeAnos) ?? -1) >= 18
  const ambCorrigidaCm2 = adulto && sexo !== null ? ambCm2 - (sexo === 'M' ? 10 : 6.5) : null
  return { cbCm, dctMm, cmbCm, areaTotalCm2, ambCm2, ambCorrigidaCm2, agbCm2: areaTotalCm2 - ambCm2 }
}

// --- Tabelas de Frisancho ------------------------------------------------------------------------------------------

interface LinhaDaTabela {
  readonly de: number
  readonly ate: number
  readonly valores: readonly number[]
}
interface Referencia {
  readonly percentis: readonly number[]
  readonly tabela: Readonly<Record<Sexo, readonly LinhaDaTabela[]>>
  /** Para chegar à unidade da linha: 1981 está em mm (÷ 10 → cm) e mm² (÷ 100 → cm²). */
  readonly divisor: number
  readonly fonte: Fonte
}
const F1990 = frisancho.frisancho1990
const F1981 = frisancho.frisancho1981
const REFERENCIAS = {
  cb: { percentis: F1990.percentis, tabela: F1990.cb, divisor: 1, fonte: FONTES.frisancho1990 },
  dct: { percentis: F1990.percentis, tabela: F1990.dct, divisor: 1, fonte: FONTES.frisancho1990 },
  ambCorrigida: { percentis: F1990.percentis, tabela: F1990.ambCorrigida, divisor: 1, fonte: FONTES.frisancho1990 },
  agb: { percentis: F1990.percentis, tabela: F1990.agb, divisor: 1, fonte: FONTES.frisancho1990 },
  cmb: { percentis: F1981.percentis, tabela: F1981.cmb, divisor: 10, fonte: FONTES.frisancho1981 },
  amb1981: { percentis: F1981.percentis, tabela: F1981.amb, divisor: 100, fonte: FONTES.frisancho1981 },
} as const satisfies Readonly<Record<string, Referencia>>

/** Os percentis da linha da idade (anos completos), já na unidade da linha; fora de 1 a 74,9 anos, `null`. */
export function percentisDaIdade(referencia: Referencia, sexo: Sexo, idadeAnos: number): ReadonlyMap<number, number> | null {
  const linha = referencia.tabela[sexo].find((l) => idadeAnos >= l.de && idadeAnos <= l.ate)
  if (!linha) return null
  return new Map(referencia.percentis.map((p, i) => [p, (linha.valores[i] ?? Number.NaN) / referencia.divisor]))
}

const p = (percentis: ReadonlyMap<number, number>, n: number) => percentis.get(n) ?? Number.NaN

export type EsquemaDoBraco = 'gordura' | 'musculo'

/**
 * D-1025, critério do São Camilo 2025 (Frisancho 1990). Gordura e tamanho: < P5, P5 a < P15, P15 a P85, > P85.
 * Músculo: < P5, P5 a < P10, P10 a P90, > P90.
 */
export function faixasDoBraco(esquema: EsquemaDoBraco, percentis: ReadonlyMap<number, number>): FaixaRotulada[] {
  const [risco, teto] = esquema === 'gordura' ? [15, 85] : [10, 90]
  const p5 = p(percentis, 5)
  const pRisco = p(percentis, risco)
  const pTeto = p(percentis, teto)
  const [baixo, limite, alto] =
    esquema === 'gordura'
      ? (['Desnutrição', 'Risco para desnutrição', 'Obesidade'] as const)
      : (['Deficiência de massa magra', 'Baixa massa magra', 'Musculatura desenvolvida'] as const)
  return [
    { min: null, minInclusivo: false, max: p5, maxInclusivo: false, rotulo: baixo, nivel: 'alterado' },
    { min: p5, minInclusivo: true, max: pRisco, maxInclusivo: false, rotulo: limite, nivel: 'atencao' },
    { min: pRisco, minInclusivo: true, max: pTeto, maxInclusivo: true, rotulo: 'Eutrofia', nivel: 'adequado' },
    { min: pTeto, minInclusivo: false, max: null, maxInclusivo: false, rotulo: alto, nivel: esquema === 'gordura' ? 'alterado' : 'informativo' },
  ]
}

/** Entre quais percentis o valor exibido caiu: "< P5", "P75–P85", "P50", "> P95". */
export function posicaoNosPercentis(exibido: number, percentis: ReadonlyMap<number, number>): string {
  const pares = [...percentis.entries()]
  const igual = pares.find(([, v]) => v === exibido)
  if (igual) return `P${igual[0]}`
  const primeiro = pares[0]
  const ultimo = pares[pares.length - 1]
  if (primeiro && exibido < primeiro[1]) return `< P${primeiro[0]}`
  if (ultimo && exibido > ultimo[1]) return `> P${ultimo[0]}`
  const acima = pares.findIndex(([, v]) => v > exibido)
  const de = pares[acima - 1]
  const ate = pares[acima]
  return de && ate ? `P${de[0]}–P${ate[0]}` : ''
}

const formatador = new Map<number, Intl.NumberFormat>()
/** O número da tabela de referência como a tela escreve (pt-BR); é texto de referência, não resultado do paciente. */
function naTela(valor: number, casas: number): string {
  let f = formatador.get(casas)
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    formatador.set(casas, f)
  }
  return f.format(valor)
}

const juntar = (...fontes: readonly Fonte[]): Fonte => ({ curta: fontes.map((f) => f.curta).join('; '), citacao: fontes.map((f) => f.citacao).join(' ') })

// --- Linhas ------------------------------------------------------------------------------------------------------

const CAMPOS = {
  sexo: { campo: 'sexo', nome: 'o sexo' },
  idade: { campo: 'idadeAnos', nome: 'a idade' },
  braco: { campo: 'medidasCorporais.bracoRelaxadoDireitoCm', nome: 'o braço relaxado' },
  tricipital: { campo: 'composicao.dobras.tricipital', nome: 'a dobra tricipital' },
} as const satisfies Readonly<Record<string, CampoQueFalta>>

type IdDoBraco = 'cb' | 'dct' | 'cmb' | 'amb' | 'agb'

interface Entrada {
  readonly id: IdDoBraco
  readonly nome: string
  readonly unidade: string
  readonly casas: number
}

const AVISO_75 = 'Frisancho vai até 74,9 anos: sem referência para a idade.'
const AVISO_GESTACAO = 'As referências de Frisancho não são de gestantes.'
/** D-1025 revista: o critério do São Camilo é de adultos; a pesquisa não traz critério pediátrico com fonte. */
const IDADE_DO_CRITERIO = 18
const AVISO_MENOR = 'Abaixo de 18 anos, o percentil sai sem classificação: o critério do São Camilo 2025 é de adultos.'

/** A linha com a situação pelos percentis da idade, ou sem situação com o motivo (75 anos ou mais, gestação). */
function linhaPorPercentis(
  caso: Caso,
  entrada: Entrada,
  valor: number,
  referencia: Referencia,
  esquema: EsquemaDoBraco,
  extra: { readonly detalhes?: readonly Detalhe[]; readonly fonte?: Fonte; readonly avisos?: readonly string[] } = {},
): LinhaDoResultado {
  const detalhes = extra.detalhes ?? []
  const avisos = extra.avisos ?? []
  const semSituacao = (motivo: string | null, falta: readonly CampoQueFalta[] = []): LinhaDoResultado => ({
    ...linhaSemValor(entrada, falta, motivo ? [...avisos, motivo] : avisos),
    valor,
    detalhes,
  })
  if (caso.condicao.tipo === 'gestante') return semSituacao(AVISO_GESTACAO)
  const { sexo } = caso
  const idadeAnos = idadeValida(caso.idadeAnos)
  if (sexo === null || idadeAnos === null) return semSituacao(null, [...(sexo === null ? [CAMPOS.sexo] : []), ...(idadeAnos === null ? [CAMPOS.idade] : [])])
  const percentis = percentisDaIdade(referencia, sexo, idadeAnos)
  if (!percentis) return semSituacao(idadeAnos >= 75 ? AVISO_75 : 'Sem referência de Frisancho para a idade.')
  if (idadeAnos < IDADE_DO_CRITERIO) {
    const percentil: Detalhe = { tipo: 'texto', rotulo: 'Percentil', texto: posicaoNosPercentis(naPrecisao(valor, entrada.casas), percentis) }
    return { ...semSituacao(AVISO_MENOR), fonte: extra.fonte ?? referencia.fonte, detalhes: [...detalhes, percentil] }
  }
  const [min, max] = esquema === 'gordura' ? [p(percentis, 15), p(percentis, 85)] : [p(percentis, 10), p(percentis, 90)]
  const casasDaTabela = referencia.divisor === 100 ? 2 : 1
  const unidade = entrada.unidade === '' ? '' : ` ${entrada.unidade}`
  return {
    ...entrada,
    valor,
    recomendacao: { texto: `${naTela(min, casasDaTabela)} – ${naTela(max, casasDaTabela)}${unidade}`, faixa: { min, minInclusivo: true, max, maxInclusivo: true } },
    situacao: situacaoNaFaixa(valor, entrada.casas, faixasDoBraco(esquema, percentis)),
    fonte: extra.fonte ?? referencia.fonte,
    detalhes: [...detalhes, { tipo: 'texto', rotulo: 'Percentil', texto: posicaoNosPercentis(naPrecisao(valor, entrada.casas), percentis) }],
    falta: [],
    avisos,
  }
}

/** CB do braço relaxado: o direito; sem ele, o esquerdo (D-1003). */
const cbDoCaso = (caso: Caso) => ladoMedido(caso.medidasCorporais.bracoRelaxadoDireitoCm, caso.medidasCorporais.bracoRelaxadoEsquerdoCm)

/** O braço do caso: CB e DCT medidos e a CMB possível; senão, o que falta ou o aviso. */
function bracoDoCaso(caso: Caso): { readonly medidas: MedidasDoBraco; readonly lado: Detalhe | null } | { readonly falta: readonly CampoQueFalta[]; readonly aviso: string | null } {
  const cb = cbDoCaso(caso)
  const dct = medidaValida(caso.composicao.dobras.tricipital)
  if (cb === null || dct === null) return { falta: [...(cb === null ? [CAMPOS.braco] : []), ...(dct === null ? [CAMPOS.tricipital] : [])], aviso: null }
  const medidas = medidasDoBraco(cb.valor, dct, caso.sexo, caso.idadeAnos)
  return medidas ? { medidas, lado: cb.detalhe } : { falta: [], aviso: 'A dobra tricipital é grande demais para a circunferência do braço. Confira as medidas.' }
}

export function linhaCb(caso: Caso): LinhaDoResultado {
  const entrada: Entrada = { id: 'cb', nome: 'Circunferência do braço (CB)', unidade: 'cm', casas: 1 }
  const cb = cbDoCaso(caso)
  if (cb === null) return linhaSemValor(entrada, [CAMPOS.braco])
  return linhaPorPercentis(caso, entrada, cb.valor, REFERENCIAS.cb, 'gordura', { detalhes: cb.detalhe ? [cb.detalhe] : [] })
}

export function linhaDct(caso: Caso): LinhaDoResultado {
  const entrada: Entrada = { id: 'dct', nome: 'Dobra tricipital (DCT)', unidade: 'mm', casas: 1 }
  const dct = medidaValida(caso.composicao.dobras.tricipital)
  if (dct === null) return linhaSemValor(entrada, [CAMPOS.tricipital])
  return linhaPorPercentis(caso, entrada, dct, REFERENCIAS.dct, 'gordura')
}

function linhaDaMedidaDoBraco(caso: Caso, entrada: Entrada, montar: (m: MedidasDoBraco, lado: readonly Detalhe[]) => LinhaDoResultado): LinhaDoResultado {
  const braco = bracoDoCaso(caso)
  if ('falta' in braco) return linhaSemValor(entrada, braco.falta, braco.aviso ? [braco.aviso] : [])
  return montar(braco.medidas, braco.lado ? [braco.lado] : [])
}

export function linhaCmb(caso: Caso): LinhaDoResultado {
  const entrada: Entrada = { id: 'cmb', nome: 'Circunferência muscular do braço (CMB)', unidade: 'cm', casas: 1 }
  return linhaDaMedidaDoBraco(caso, entrada, (m, lado) => linhaPorPercentis(caso, entrada, m.cmbCm, REFERENCIAS.cmb, 'musculo', { detalhes: lado }))
}

export function linhaAmb(caso: Caso): LinhaDoResultado {
  const adulto = (idadeValida(caso.idadeAnos) ?? -1) >= 18
  const entrada: Entrada = adulto
    ? { id: 'amb', nome: 'Área muscular do braço corrigida (AMBc)', unidade: 'cm²', casas: 2 }
    : { id: 'amb', nome: 'Área muscular do braço (AMB)', unidade: 'cm²', casas: 2 }
  if (adulto && caso.sexo === null) return linhaSemValor(entrada, [CAMPOS.sexo])
  return linhaDaMedidaDoBraco(caso, entrada, (m, lado) => {
    if (m.ambCorrigidaCm2 === null) return linhaPorPercentis(caso, entrada, m.ambCm2, REFERENCIAS.amb1981, 'musculo', { detalhes: lado })
    const avisos = m.ambCorrigidaCm2 < 11 ? ['Abaixo de 9 a 11 cm², o mínimo compatível com a vida (Heymsfield et al., 1982): provável erro de medida.'] : []
    return linhaPorPercentis(caso, entrada, m.ambCorrigidaCm2, REFERENCIAS.ambCorrigida, 'musculo', {
      detalhes: [...lado, { tipo: 'numero', rotulo: 'AMB sem correção', valor: m.ambCm2, unidade: 'cm²', casas: 2 }],
      fonte: juntar(FONTES.frisancho1990, FONTES.heymsfield1982),
      avisos,
    })
  })
}

export function linhaAgb(caso: Caso): LinhaDoResultado {
  const entrada: Entrada = { id: 'agb', nome: 'Área de gordura do braço (AGB)', unidade: 'cm²', casas: 2 }
  return linhaDaMedidaDoBraco(caso, entrada, (m, lado) => linhaPorPercentis(caso, entrada, m.agbCm2, REFERENCIAS.agb, 'gordura', { detalhes: lado }))
}

/** Blackburn & Thornton 1979, segundo CEPRAN 2014 e UFMA 2022 (sinais do UFMA, Quadro 7); a CMB não tem excesso (D-1026). */
const ADEQUACAO: readonly FaixaRotulada[] = [
  { min: null, minInclusivo: false, max: 70, maxInclusivo: true, rotulo: 'Desnutrição grave', nivel: 'grave' },
  { min: 70, minInclusivo: false, max: 80, maxInclusivo: true, rotulo: 'Desnutrição moderada', nivel: 'alterado' },
  { min: 80, minInclusivo: false, max: 90, maxInclusivo: true, rotulo: 'Desnutrição leve', nivel: 'atencao' },
  { min: 90, minInclusivo: false, max: 110, maxInclusivo: true, rotulo: 'Eutrofia', nivel: 'adequado' },
  { min: 110, minInclusivo: false, max: 120, maxInclusivo: true, rotulo: 'Sobrepeso', nivel: 'atencao' },
  { min: 120, minInclusivo: false, max: null, maxInclusivo: false, rotulo: 'Obesidade', nivel: 'alterado' },
]
const ADEQUACAO_CMB: readonly FaixaRotulada[] = [...ADEQUACAO.slice(0, 3), { min: 90, minInclusivo: false, max: null, maxInclusivo: false, rotulo: 'Eutrofia', nivel: 'adequado' }]

const NOME_DA_ADEQUACAO = { cb: 'Adequação da CB', dct: 'Adequação da DCT', cmb: 'Adequação da CMB' } as const

/** Adequação = valor ÷ P50 × 100: CB e DCT com o P50 de Frisancho 1990; CMB com o de 1981 (D-1026). */
export function linhaAdequacao(caso: Caso, medida: 'cb' | 'dct' | 'cmb'): LinhaDoResultado | null {
  // D-1026 revista: Blackburn e Thornton avaliam o adulto; abaixo de 18 anos, a linha não vem.
  const idade = idadeValida(caso.idadeAnos)
  if (idade !== null && idade < IDADE_DO_CRITERIO) return null
  const entrada = { id: `adequacao-${medida}`, nome: NOME_DA_ADEQUACAO[medida], unidade: '%', casas: 1 } as const
  const braco = bracoDoCaso(caso)
  const cb = cbDoCaso(caso)
  const dct = medidaValida(caso.composicao.dobras.tricipital)
  const valorDaMedida = medida === 'cb' ? (cb?.valor ?? null) : medida === 'dct' ? dct : 'medidas' in braco ? braco.medidas.cmbCm : null
  if (valorDaMedida === null) {
    const falta = medida === 'cb' ? [CAMPOS.braco] : medida === 'dct' ? [CAMPOS.tricipital] : 'falta' in braco ? braco.falta : []
    return linhaSemValor(entrada, falta, 'falta' in braco && braco.aviso && medida === 'cmb' ? [braco.aviso] : [])
  }
  const semReferencia = (aviso: string | null, falta: readonly CampoQueFalta[] = []) => linhaSemValor(entrada, falta, aviso ? [aviso] : [])
  if (caso.condicao.tipo === 'gestante') return semReferencia(AVISO_GESTACAO)
  const { sexo } = caso
  const idadeAnos = idadeValida(caso.idadeAnos)
  if (sexo === null || idadeAnos === null) return semReferencia(null, [...(sexo === null ? [CAMPOS.sexo] : []), ...(idadeAnos === null ? [CAMPOS.idade] : [])])
  const referencia = medida === 'cmb' ? REFERENCIAS.cmb : REFERENCIAS[medida]
  const percentis = percentisDaIdade(referencia, sexo, idadeAnos)
  if (!percentis) return semReferencia(idadeAnos >= 75 ? AVISO_75 : 'Sem referência de Frisancho para a idade.')
  const p50 = p(percentis, 50)
  const valor = (valorDaMedida / p50) * 100
  const unidadeDaMedida = medida === 'dct' ? 'mm' : 'cm'
  return {
    ...entrada,
    valor,
    recomendacao: medida === 'cmb' ? { texto: 'Acima de 90%', faixa: { min: 90, minInclusivo: false, max: null, maxInclusivo: false } } : { texto: '90 – 110%', faixa: { min: 90, minInclusivo: false, max: 110, maxInclusivo: true } },
    situacao: situacaoNaFaixa(valor, entrada.casas, medida === 'cmb' ? ADEQUACAO_CMB : ADEQUACAO),
    fonte: juntar(FONTES.blackburnThornton1979, referencia.fonte),
    detalhes: [{ tipo: 'numero', rotulo: 'P50 de referência', valor: p50, unidade: unidadeDaMedida, casas: 1 }],
    falta: [],
    avisos: [],
  }
}

/** As linhas do braço na ordem da tela. */
export const linhasDoBraco = (caso: Caso): LinhaDoResultado[] =>
  [linhaCb(caso), linhaDct(caso), linhaCmb(caso), linhaAmb(caso), linhaAgb(caso), linhaAdequacao(caso, 'cb'), linhaAdequacao(caso, 'dct'), linhaAdequacao(caso, 'cmb')].filter(
    (l): l is LinhaDoResultado => l !== null,
  )
