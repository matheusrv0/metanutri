// Protocolos de dobras cutâneas da antropometria completa (spec antropometria-completa, D-1006 a D-1015).
// Coeficientes da pesquisa de 03/11/2026, seção 2: só os [V2] do lançamento (2.5.2), com todos os dígitos publicados.
// Dobras em mm, idade em anos completos, densidade (D) em g/ml, massa em kg, estatura em cm.
import { FONTES, type Fonte } from './fontesAntropometria.ts'
import { idadeValida, medidaValida, naPrecisao } from './linhaDoResultado.ts'
import type { ComposicaoCorporal, Sexo } from './tipos.ts'

export type Dobras = ComposicaoCorporal['dobras']
export type DobraCutanea = keyof Dobras

export type IdProtocolo =
  | 'jackson-pollock-3'
  | 'jackson-pollock-7'
  | 'durnin-womersley'
  | 'petroski'
  | 'guedes'
  | 'faulkner-4'
  | 'slaughter-triceps-subescapular'
  | 'slaughter-triceps-panturrilha'

/** O que a equação pede além das dobras. */
export type EntradaDaEquacao = 'sexo' | 'idade' | 'peso' | 'estatura' | 'maturacao' | 'grupo'

export type FormaDaEquacao = 'quadratica' | 'log10' | 'linear' | 'quadratica-ate-35-linear-acima'

/** D-1009: automática = Lohman de 7 a 19 anos, Siri de 20 em diante. */
export type Conversao = 'automatica' | 'siri' | 'brozek'

/** Estágios de Tanner do Slaughter: 1–2, 3 e 4–5 (D-1012). */
export type MaturacaoSexual = 'pre-pubere' | 'pubere' | 'pos-pubere'

/** A classificação do estudo de Slaughter; não validada para a população brasileira (D-1012). */
export type GrupoDoEstudo = 'branco' | 'negro'

export interface VarianteDoProtocolo {
  readonly populacao: string
  /** Faixa de idade da amostra, em anos completos, inclusiva; `null` = desconhecida. */
  readonly idade: { readonly min: number; readonly max: number } | null
  readonly dobras: readonly DobraCutanea[]
  /** As entradas fixas da equação; maturação e grupo do Slaughter dependem da soma (`aplicacaoDoProtocolo`). */
  readonly entradas: readonly EntradaDaEquacao[]
  readonly forma: FormaDaEquacao
  readonly saida: 'densidade' | 'gordura'
  readonly fonte: Fonte
  /** Faixa da soma das dobras exigidas na amostra, em mm; `inferida` quando sai da faixa de cada dobra; `null` = não publicada (D-1038). */
  readonly somaNaAmostra: { readonly min: number; readonly max: number; readonly inferida: boolean } | null
  /** Nas quadráticas, a soma (mm) em que a densidade para de cair; acima dela a equação inverte e não calcula (D-1038). */
  readonly picoDaSomaMm: number | null
}

export interface Protocolo {
  readonly id: IdProtocolo
  readonly nome: string
  readonly porSexo: Readonly<Record<Sexo, VarianteDoProtocolo>>
  /** Aviso que sai sempre com o resultado. */
  readonly aviso: string | null
}

export interface PacienteDoProtocolo {
  readonly sexo: Sexo | null
  readonly idadeAnos: number | null
  readonly pesoKg: number | null
  readonly estaturaCm: number | null
  readonly gestante: boolean
}

export interface OpcoesDoProtocolo {
  readonly conversao?: Conversao
  readonly maturacao?: MaturacaoSexual | null
  readonly grupo?: GrupoDoEstudo | null
  /** Durnin & Womersley: usar a equação "todas as idades" (D-1011). */
  readonly durninTodasAsIdades?: boolean
}

/** Densidade = a − b·Σ + c·Σ² − idade·anos (pesquisa 2.2); o pico da parábola é Σ = b ÷ 2c (D-1038). */
interface Quadratica {
  readonly a: number
  readonly b: number
  readonly c: number
  readonly idade: number
}

/** Coeficientes das quadráticas, com todos os dígitos publicados (pesquisa 2.2.1, 2.2.2 e 2.2.5). */
const QUADRATICAS = {
  // JP78 Eq5 (homem, 3 dobras) [V2, original] e JPW80 3 dobras (mulher) [V2].
  jp3M: { a: 1.10938, b: 0.0008267, c: 0.0000016, idade: 0.0002574 },
  jp3F: { a: 1.0994921, b: 0.0009929, c: 0.0000023, idade: 0.0001392 },
  // JP78 Eq1 (homem, 7 dobras) [V2, original] e JPW80 7 dobras (mulher) [V2].
  jp7M: { a: 1.112, b: 0.00043499, c: 0.00000055, idade: 0.00028826 },
  jp7F: { a: 1.097, b: 0.00046971, c: 0.00000056, idade: 0.00012828 },
  // Petroski: homem 4 dobras [V2]; mulher 3 dobras, mais − 0,00059076·massa (kg) + 0,0005105·estatura (cm) [V2].
  petroskiM: { a: 1.10726863, b: 0.00081201, c: 0.00000212, idade: 0.00041761 },
  petroskiF: { a: 1.04127059, b: 0.00087756, c: 0.0000038, idade: 0.00025821 },
} as const satisfies Readonly<Record<string, Quadratica>>

const densidadeQuadratica = (q: Quadratica, soma: number, idade: number) => q.a - q.b * soma + q.c * soma ** 2 - q.idade * idade
const pico = (q: Quadratica) => q.b / (2 * q.c)

const JP_DOBRAS_7: readonly DobraCutanea[] = ['peitoral', 'axilarMedia', 'tricipital', 'subescapular', 'abdominal', 'suprailiacaAnt', 'coxa']
const JP78 = 'homens dos EUA (Jackson e Pollock, 1978)'
const JPW80 = 'mulheres dos EUA (Jackson, Pollock e Ward, 1980)'
const SLAUGHTER = 'crianças e adolescentes (Slaughter et al., 1988)'
// D-1039: a suprailíaca de cada protocolo vem pela linha: `suprailiacaAnt` (JP, ACSM), `suprailiacaMed` (D&W; Petroski,
// que seguiu Harrison 1991) e `suprailiaca` quando a pesquisa não registra a linha (Guedes, Faulkner; rodada 2: a média
// antes da anterior, como Petroski).
/** D-1038: as faixas da soma publicadas (JP78, Tabela 1; Durnin & Womersley, Tabela 9) e a inferida de Petroski. */
const publicada = (min: number, max: number) => ({ min, max, inferida: false })

export const PROTOCOLOS_DE_DOBRAS: readonly Protocolo[] = [
  {
    id: 'jackson-pollock-3',
    nome: 'Jackson & Pollock, 3 dobras',
    porSexo: {
      M: { populacao: JP78, idade: { min: 18, max: 61 }, dobras: ['peitoral', 'abdominal', 'coxa'], entradas: ['idade'], forma: 'quadratica', saida: 'densidade', fonte: FONTES.jacksonPollock1978, somaNaAmostra: publicada(14, 118), picoDaSomaMm: pico(QUADRATICAS.jp3M) },
      F: { populacao: JPW80, idade: { min: 18, max: 55 }, dobras: ['tricipital', 'suprailiacaAnt', 'coxa'], entradas: ['idade'], forma: 'quadratica', saida: 'densidade', fonte: FONTES.jacksonPollockWard1980, somaNaAmostra: null, picoDaSomaMm: pico(QUADRATICAS.jp3F) },
    },
    aviso: null,
  },
  {
    id: 'jackson-pollock-7',
    nome: 'Jackson & Pollock, 7 dobras',
    porSexo: {
      M: { populacao: JP78, idade: { min: 18, max: 61 }, dobras: JP_DOBRAS_7, entradas: ['idade'], forma: 'quadratica', saida: 'densidade', fonte: FONTES.jacksonPollock1978, somaNaAmostra: publicada(32, 272), picoDaSomaMm: pico(QUADRATICAS.jp7M) },
      F: { populacao: JPW80, idade: { min: 18, max: 55 }, dobras: JP_DOBRAS_7, entradas: ['idade'], forma: 'quadratica', saida: 'densidade', fonte: FONTES.jacksonPollockWard1980, somaNaAmostra: null, picoDaSomaMm: pico(QUADRATICAS.jp7F) },
    },
    aviso: null,
  },
  {
    id: 'durnin-womersley',
    nome: 'Durnin & Womersley, 4 dobras',
    porSexo: {
      M: { populacao: 'homens de Glasgow, Escócia', idade: { min: 17, max: 72 }, dobras: ['bicipital', 'tricipital', 'subescapular', 'suprailiacaMed'], entradas: ['idade'], forma: 'log10', saida: 'densidade', fonte: FONTES.durninWomersley1974, somaNaAmostra: publicada(15, 210), picoDaSomaMm: null },
      F: { populacao: 'mulheres de Glasgow, Escócia', idade: { min: 16, max: 68 }, dobras: ['bicipital', 'tricipital', 'subescapular', 'suprailiacaMed'], entradas: ['idade'], forma: 'log10', saida: 'densidade', fonte: FONTES.durninWomersley1974, somaNaAmostra: publicada(15, 210), picoDaSomaMm: null },
    },
    aviso: null,
  },
  {
    id: 'petroski',
    nome: 'Petroski',
    porSexo: {
      M: { populacao: 'homens do sul do Brasil', idade: { min: 18, max: 61 }, dobras: ['subescapular', 'tricipital', 'suprailiacaMed', 'panturrilhaMedial'], entradas: ['idade'], forma: 'quadratica', saida: 'densidade', fonte: FONTES.petroski1995, somaNaAmostra: null, picoDaSomaMm: pico(QUADRATICAS.petroskiM) },
      // Faixa inferida: a soma dos mínimos e dos máximos de cada dobra na amostra feminina (Petroski e Pires-Neto 1995, Tab. 1).
      F: { populacao: 'mulheres do Rio Grande do Sul e de Santa Catarina', idade: { min: 18, max: 51 }, dobras: ['subescapular', 'suprailiacaMed', 'coxa'], entradas: ['idade', 'peso', 'estatura'], forma: 'quadratica', saida: 'densidade', fonte: FONTES.petroski1995, somaNaAmostra: { min: 21, max: 118, inferida: true }, picoDaSomaMm: pico(QUADRATICAS.petroskiF) },
    },
    aviso: null,
  },
  {
    id: 'guedes',
    nome: 'Guedes',
    porSexo: {
      M: { populacao: 'universitários de Santa Maria (RS)', idade: { min: 17, max: 27 }, dobras: ['tricipital', 'suprailiaca', 'abdominal'], entradas: [], forma: 'log10', saida: 'densidade', fonte: FONTES.guedes1985, somaNaAmostra: null, picoDaSomaMm: null },
      F: { populacao: 'universitárias de Santa Maria (RS)', idade: { min: 18, max: 29 }, dobras: ['subescapular', 'suprailiaca', 'coxa'], entradas: [], forma: 'log10', saida: 'densidade', fonte: FONTES.guedes1985, somaNaAmostra: null, picoDaSomaMm: null },
    },
    aviso: null,
  },
  {
    id: 'faulkner-4',
    nome: 'Faulkner (Yuhasz), 4 dobras',
    porSexo: {
      M: { populacao: 'amostra de origem desconhecida', idade: null, dobras: ['tricipital', 'subescapular', 'suprailiaca', 'abdominal'], entradas: [], forma: 'linear', saida: 'gordura', fonte: FONTES.faulknerYuhasz, somaNaAmostra: null, picoDaSomaMm: null },
      F: { populacao: 'amostra de origem desconhecida', idade: null, dobras: ['tricipital', 'subescapular', 'suprailiaca', 'abdominal'], entradas: [], forma: 'linear', saida: 'gordura', fonte: FONTES.faulknerYuhasz, somaNaAmostra: null, picoDaSomaMm: null },
    },
    // D-1014: Pires Neto e Glaner (2007).
    aviso: 'Amostra de origem desconhecida; só há indicação para homens jovens treinados. A 4ª dobra é a abdominal ("umbilical" no original).',
  },
  {
    id: 'slaughter-triceps-subescapular',
    nome: 'Slaughter, tríceps e subescapular',
    // A quadrática só vale até 35 mm, longe do pico dela (51 mm nas meninas; 76 nos meninos): sem pico a vigiar.
    porSexo: {
      M: { populacao: SLAUGHTER, idade: { min: 8, max: 18 }, dobras: ['tricipital', 'subescapular'], entradas: [], forma: 'quadratica-ate-35-linear-acima', saida: 'gordura', fonte: FONTES.slaughter1988, somaNaAmostra: null, picoDaSomaMm: null },
      F: { populacao: SLAUGHTER, idade: { min: 8, max: 18 }, dobras: ['tricipital', 'subescapular'], entradas: [], forma: 'quadratica-ate-35-linear-acima', saida: 'gordura', fonte: FONTES.slaughter1988, somaNaAmostra: null, picoDaSomaMm: null },
    },
    aviso: null,
  },
  {
    id: 'slaughter-triceps-panturrilha',
    nome: 'Slaughter, tríceps e panturrilha medial',
    porSexo: {
      M: { populacao: SLAUGHTER, idade: { min: 8, max: 18 }, dobras: ['tricipital', 'panturrilhaMedial'], entradas: [], forma: 'linear', saida: 'gordura', fonte: FONTES.slaughter1988, somaNaAmostra: null, picoDaSomaMm: null },
      F: { populacao: SLAUGHTER, idade: { min: 8, max: 18 }, dobras: ['tricipital', 'panturrilhaMedial'], entradas: [], forma: 'linear', saida: 'gordura', fonte: FONTES.slaughter1988, somaNaAmostra: null, picoDaSomaMm: null },
    },
    aviso: null,
  },
]

export const NOME_DA_DOBRA: Readonly<Record<DobraCutanea, string>> = {
  tricipital: 'tricipital',
  subescapular: 'subescapular',
  suprailiaca: 'suprailíaca (linha não informada)',
  abdominal: 'abdominal',
  peitoral: 'peitoral',
  coxa: 'coxa',
  bicipital: 'bicipital',
  supraespinal: 'supraespinal',
  axilarMedia: 'axilar média',
  panturrilhaMedial: 'panturrilha medial',
  suprailiacaAnt: 'suprailíaca (linha axilar anterior)',
  suprailiacaMed: 'suprailíaca (linha axilar média)',
}

const NOME_DA_ENTRADA: Readonly<Record<EntradaDaEquacao, string>> = {
  sexo: 'o sexo',
  idade: 'a idade',
  peso: 'o peso',
  estatura: 'a estatura',
  maturacao: 'a maturação sexual (estágio de Tanner)',
  grupo: 'o grupo do estudo (branco ou negro)',
}

// --- Conversão da densidade em % de gordura (pesquisa 2.3) -------------------------------------------------------

/** Siri (1961): %G = 495/D − 450 [V2]. */
export const siri = (densidade: number): number => 495 / densidade - 450

/** Brozek et al. (1963): %G = (4,57/D − 4,142) × 100 [V1]. */
export const brozek = (densidade: number): number => (4.57 / densidade - 4.142) * 100

/** Lohman (1986), constantes a/D − b por idade e sexo, de 7 a 19 anos [V2] (pesquisa 2.3.2). */
const LOHMAN: Readonly<Record<Sexo, readonly { readonly ate: number; readonly a: number; readonly b: number }[]>> = {
  M: [
    { ate: 8, a: 538, b: 497 },
    { ate: 10, a: 530, b: 489 },
    { ate: 12, a: 523, b: 481 },
    { ate: 14, a: 507, b: 464 },
    { ate: 16, a: 503, b: 459 },
    { ate: 19, a: 498, b: 453 },
  ],
  F: [
    { ate: 8, a: 543, b: 503 },
    { ate: 10, a: 535, b: 495 },
    { ate: 12, a: 525, b: 484 },
    { ate: 14, a: 512, b: 469 },
    { ate: 16, a: 507, b: 464 },
    { ate: 19, a: 505, b: 462 },
  ],
}

/** % de gordura pelas constantes de Lohman; fora de 7 a 19 anos, `null`. */
export function lohman(densidade: number, sexo: Sexo, idadeAnos: number): number | null {
  if (idadeAnos < 7 || idadeAnos > 19) return null
  const linha = LOHMAN[sexo].find((l) => idadeAnos <= l.ate)
  return linha ? linha.a / densidade - linha.b : null
}

export interface DensidadeConvertida {
  readonly gorduraPct: number
  readonly conversao: 'siri' | 'brozek' | 'lohman'
}

/** D-1009. A automática abaixo de 7 anos não tem constante: `null`. */
export function converterDensidade(densidade: number, conversao: Conversao, sexo: Sexo, idadeInformada: number | null): DensidadeConvertida | null {
  if (conversao === 'siri') return { gorduraPct: siri(densidade), conversao: 'siri' }
  if (conversao === 'brozek') return { gorduraPct: brozek(densidade), conversao: 'brozek' }
  const idadeAnos = idadeValida(idadeInformada)
  if (idadeAnos === null) return null
  if (idadeAnos >= 20) return { gorduraPct: siri(densidade), conversao: 'siri' }
  const pct = lohman(densidade, sexo, idadeAnos)
  return pct === null ? null : { gorduraPct: pct, conversao: 'lohman' }
}

// --- Equações (pesquisa 2.2) --------------------------------------------------------------------------------------

/** Durnin & Womersley (1974), Tabela 5, linha "All four skinfolds": D = c − m · log10(Σ4) [V2, conferido no original]. */
const DURNIN: Readonly<Record<Sexo, { readonly faixas: readonly { readonly de: number; readonly c: number; readonly m: number }[]; readonly todas: { readonly c: number; readonly m: number } }>> = {
  M: {
    faixas: [
      { de: 17, c: 1.162, m: 0.063 },
      { de: 20, c: 1.1631, m: 0.0632 },
      { de: 30, c: 1.1422, m: 0.0544 },
      { de: 40, c: 1.162, m: 0.07 },
      { de: 50, c: 1.1715, m: 0.0779 },
    ],
    todas: { c: 1.1765, m: 0.0744 },
  },
  F: {
    faixas: [
      { de: 16, c: 1.1549, m: 0.0678 },
      { de: 20, c: 1.1599, m: 0.0717 },
      { de: 30, c: 1.1423, m: 0.0632 },
      { de: 40, c: 1.1333, m: 0.0612 },
      { de: 50, c: 1.1339, m: 0.0645 },
    ],
    todas: { c: 1.1567, m: 0.0717 },
  },
}

/** A linha de Durnin & Womersley: a faixa da idade; abaixo da primeira ou a pedido, "todas as idades" (D-1011). */
function coeficientesDurnin(sexo: Sexo, idadeAnos: number | null, todas: boolean) {
  const tabela = DURNIN[sexo]
  if (todas || idadeAnos === null) return tabela.todas
  const faixa = [...tabela.faixas].reverse().find((f) => idadeAnos >= f.de)
  return faixa ?? tabela.todas
}

/** Intercepto do Slaughter para meninos com tríceps + subescapular até 35 mm [V2] (pesquisa 2.2.8). */
const INTERCEPTO_SLAUGHTER: Readonly<Record<GrupoDoEstudo, Readonly<Record<MaturacaoSexual, number>>>> = {
  branco: { 'pre-pubere': -1.7, pubere: -3.4, 'pos-pubere': -5.5 },
  negro: { 'pre-pubere': -3.2, pubere: -5.2, 'pos-pubere': -6.8 },
}

interface Entradas {
  readonly sexo: Sexo
  readonly soma: number
  readonly idade: number | null
  readonly peso: number | null
  readonly estatura: number | null
  readonly opcoes: OpcoesDoProtocolo
}

/** O valor da equação: densidade (g/ml) ou % de gordura, conforme a `saida` da variante. */
function equacao(id: IdProtocolo, e: Entradas): number | null {
  const { sexo, soma: s, idade, peso, estatura, opcoes } = e
  const i = idade ?? 0
  switch (id) {
    case 'jackson-pollock-3':
      return densidadeQuadratica(sexo === 'M' ? QUADRATICAS.jp3M : QUADRATICAS.jp3F, s, i)
    case 'jackson-pollock-7':
      return densidadeQuadratica(sexo === 'M' ? QUADRATICAS.jp7M : QUADRATICAS.jp7F, s, i)
    case 'durnin-womersley': {
      const { c, m } = coeficientesDurnin(sexo, idade, opcoes.durninTodasAsIdades === true)
      return c - m * Math.log10(s)
    }
    case 'petroski':
      if (sexo === 'M') return densidadeQuadratica(QUADRATICAS.petroskiM, s, i)
      if (peso === null || estatura === null) return null
      return densidadeQuadratica(QUADRATICAS.petroskiF, s, i) - 0.00059076 * peso + 0.0005105 * estatura
    case 'guedes':
      // D-1013: coeficientes de 5 casas (as versões de 4 casas, [V2], são o arredondamento delas).
      return sexo === 'M' ? 1.17136 - 0.06706 * Math.log10(s) : 1.1665 - 0.07063 * Math.log10(s)
    case 'faulkner-4':
      // %G direto: 0,153 · Σ4 + 5,783 [V2] (Pires Neto e Glaner, 2007).
      return 0.153 * s + 5.783
    case 'slaughter-triceps-subescapular': {
      // Acima de 35 mm, a linear; até 35 mm (inclusive, D-1012), a quadrática [V2].
      if (s > 35) return sexo === 'M' ? 0.783 * s + 1.6 : 0.546 * s + 9.7
      if (sexo === 'F') return 1.33 * s - 0.013 * s ** 2 - 2.5
      if (!opcoes.maturacao || !opcoes.grupo) return null
      return 1.21 * s - 0.008 * s ** 2 + INTERCEPTO_SLAUGHTER[opcoes.grupo][opcoes.maturacao]
    }
    case 'slaughter-triceps-panturrilha':
      return sexo === 'M' ? 0.735 * s + 1.0 : 0.61 * s + 5.1
  }
}

// --- Aplicação e cálculo ------------------------------------------------------------------------------------------

export interface AplicacaoDoProtocolo {
  /** Pelo sexo; vazio sem sexo. */
  readonly dobrasExigidas: readonly DobraCutanea[]
  /** Na ordem do protocolo; 0, negativo e vazio contam como faltando (CB-1000). */
  readonly dobrasQueFaltam: readonly DobraCutanea[]
  readonly entradasQueFaltam: readonly EntradaDaEquacao[]
  /** `null` sem sexo. */
  readonly aplicaPeloSexo: boolean | null
  /** `null` sem idade ou com a faixa da amostra desconhecida. */
  readonly aplicaPelaIdade: boolean | null
  /** Os avisos das dobras: a suprailíaca de outra linha ou de linha não informada (D-1039). */
  readonly avisos: readonly string[]
}

export const protocoloPorId = (id: IdProtocolo): Protocolo | null => PROTOCOLOS_DE_DOBRAS.find((p) => p.id === id) ?? null

/** Os dois ids de `composicao.ts`: Siri em qualquer idade, para nenhum número já mostrado mudar (D-1007 revista). */
const IDS_DE_HOJE: ReadonlySet<IdProtocolo> = new Set<IdProtocolo>(['jackson-pollock-3', 'faulkner-4'])

/** A conversão escolhida; sem escolha, Siri nos dois ids de hoje e a automática nos novos (D-1007 e D-1009 revistas). */
export const conversaoDoProtocolo = (protocolo: Protocolo, opcoes: OpcoesDoProtocolo): Conversao => opcoes.conversao ?? (IDS_DE_HOJE.has(protocolo.id) ? 'siri' : 'automatica')

const AVISO_DE_LOHMAN = 'Conversão de Lohman (abaixo de 20 anos): aos 20 anos a conta passa para Siri, e o % muda de degrau sem a dobra mudar.'

const LINHA = { suprailiacaAnt: 'axilar anterior', suprailiacaMed: 'axilar média' } as const

interface DobraResolvida {
  readonly valor: number | null
  readonly aviso: string | null
}

/**
 * O valor da dobra pedida pelo protocolo (D-1039). A suprailíaca vem pela linha do protocolo; sem ela, a de linha não
 * informada (plano de antes); sem as duas, a da outra linha. Sem linha registrada, a de linha não informada, depois a
 * média, depois a anterior (rodada 2). As outras dobras vêm como estão.
 */
function resolverDobra(pedida: DobraCutanea, dobras: Dobras): DobraResolvida {
  if (pedida === 'suprailiacaAnt' || pedida === 'suprailiacaMed') {
    const certa = medidaValida(dobras[pedida])
    if (certa !== null) return { valor: certa, aviso: null }
    const semLinha = medidaValida(dobras.suprailiaca)
    if (semLinha !== null) return { valor: semLinha, aviso: `Suprailíaca sem a linha informada (plano de antes da antropometria completa): o protocolo pede a da linha ${LINHA[pedida]}.` }
    const outra = pedida === 'suprailiacaAnt' ? 'suprailiacaMed' : 'suprailiacaAnt'
    const daOutra = medidaValida(dobras[outra])
    if (daOutra !== null) {
      return { valor: daOutra, aviso: `Só há a suprailíaca da linha ${LINHA[outra]}; o protocolo pede a da linha ${LINHA[pedida]}: o resultado pode estar deslocado.` }
    }
    return { valor: null, aviso: null }
  }
  if (pedida === 'suprailiaca') {
    const semRegistro = 'A pesquisa não registra a linha da suprailíaca deste protocolo'
    const semLinha = medidaValida(dobras.suprailiaca)
    if (semLinha !== null) return { valor: semLinha, aviso: `${semRegistro}.` }
    for (const linha of ['suprailiacaMed', 'suprailiacaAnt'] as const) {
      const v = medidaValida(dobras[linha])
      if (v !== null) return { valor: v, aviso: `${semRegistro}: usada a da linha ${LINHA[linha]}.` }
    }
    return { valor: null, aviso: null }
  }
  return { valor: medidaValida(dobras[pedida]), aviso: null }
}

/** Os valores das dobras exigidas, na ordem do protocolo, e os avisos da escolha da linha (D-1039). */
export function valoresDasDobras(exigidas: readonly DobraCutanea[], dobras: Dobras): { readonly valores: readonly (number | null)[]; readonly avisos: readonly string[] } {
  const resolvidas = exigidas.map((d) => resolverDobra(d, dobras))
  return { valores: resolvidas.map((r) => r.valor), avisos: resolvidas.flatMap((r) => (r.aviso === null ? [] : [r.aviso])) }
}

const somaDas = (exigidas: readonly DobraCutanea[], dobras: Dobras): number => valoresDasDobras(exigidas, dobras).valores.reduce<number>((total, v) => total + (v ?? 0), 0)

/** As entradas de que a conta precisa: as fixas, a idade da conversão automática e as do Slaughter até 35 mm. */
function entradasPedidas(protocolo: Protocolo, variante: VarianteDoProtocolo, sexo: Sexo, soma: number | null, opcoes: OpcoesDoProtocolo): EntradaDaEquacao[] {
  const pedidas = [...variante.entradas]
  const automatica = conversaoDoProtocolo(protocolo, opcoes) === 'automatica'
  if (variante.saida === 'densidade' && automatica && !pedidas.includes('idade')) pedidas.push('idade')
  if (protocolo.id === 'slaughter-triceps-subescapular' && sexo === 'M' && soma !== null && soma <= 35) pedidas.push('maturacao', 'grupo')
  return pedidas
}

function aplicacao(protocolo: Protocolo, paciente: PacienteDoProtocolo, dobras: Dobras, opcoes: OpcoesDoProtocolo): AplicacaoDoProtocolo {
  const { sexo, idadeAnos } = paciente
  if (sexo === null) return { dobrasExigidas: [], dobrasQueFaltam: [], entradasQueFaltam: ['sexo'], aplicaPeloSexo: null, aplicaPelaIdade: null, avisos: [] }
  const variante = protocolo.porSexo[sexo]
  const { valores, avisos } = valoresDasDobras(variante.dobras, dobras)
  const dobrasQueFaltam = variante.dobras.filter((_, i) => valores[i] === null)
  const soma = dobrasQueFaltam.length === 0 ? somaDas(variante.dobras, dobras) : null
  const temos: Readonly<Record<EntradaDaEquacao, boolean>> = {
    sexo: true,
    idade: idadeAnos !== null,
    peso: medidaValida(paciente.pesoKg) !== null,
    estatura: medidaValida(paciente.estaturaCm) !== null,
    maturacao: Boolean(opcoes.maturacao),
    grupo: Boolean(opcoes.grupo),
  }
  const entradasQueFaltam = entradasPedidas(protocolo, variante, sexo, soma, opcoes).filter((e) => !temos[e])
  const { idade } = variante
  const aplicaPelaIdade = idadeAnos === null || idade === null ? null : idadeAnos >= idade.min && idadeAnos <= idade.max
  return { dobrasExigidas: variante.dobras, dobrasQueFaltam, entradasQueFaltam, aplicaPeloSexo: true, aplicaPelaIdade, avisos }
}

/** D-1040: idade `NaN`, `Infinity` ou negativa é idade não informada; o motor nunca a compara com um corte. */
const comIdadeValida = (paciente: PacienteDoProtocolo): PacienteDoProtocolo => ({ ...paciente, idadeAnos: idadeValida(paciente.idadeAnos) })

/** Quais dobras e entradas faltam, e se o protocolo vale para o paciente pelo sexo e pela idade (CA-2011). */
export function aplicacaoDoProtocolo(id: IdProtocolo, paciente: PacienteDoProtocolo, dobras: Dobras, opcoes: OpcoesDoProtocolo = {}): AplicacaoDoProtocolo {
  const protocolo = protocoloPorId(id)
  if (!protocolo) return { dobrasExigidas: [], dobrasQueFaltam: [], entradasQueFaltam: [], aplicaPeloSexo: null, aplicaPelaIdade: null, avisos: [] }
  return aplicacao(protocolo, comIdadeValida(paciente), dobras, opcoes)
}

/** Por que o protocolo, com tudo o que pede, não deu número (D-1042). O motivo é a causa e o que fazer, juntos. */
export interface RecusaDoProtocolo {
  /** Cabe no meio da frase: "Petroski só vale até 115,5 mm de soma, o pico da equação". */
  readonly causa: string
  /** "escolha outro protocolo ou informe o % da bioimpedância". */
  readonly oQueFazer: string
}

export type ResultadoDoProtocolo =
  | {
      readonly calculou: true
      readonly protocolo: Protocolo
      readonly somaMm: number
      /** `null` nas equações que já dão o % (Faulkner, Slaughter). */
      readonly densidade: number | null
      readonly conversao: DensidadeConvertida['conversao'] | null
      /** Sem arredondar (D-1001). */
      readonly gorduraPct: number
      readonly massaGordaKg: number | null
      readonly massaMagraKg: number | null
      /** A da equação e, quando houve, a da conversão. */
      readonly fontes: readonly Fonte[]
      readonly avisos: readonly string[]
    }
  | {
      readonly calculou: false
      readonly protocolo: Protocolo | null
      readonly motivo: string
      readonly aplicacao: AplicacaoDoProtocolo | null
      /** `null` quando falta dado ou o protocolo não vale para o caso (sexo, gestação): o motivo diz o quê. */
      readonly recusa: RecusaDoProtocolo | null
    }

const INFORME_A_BIOIMPEDANCIA = 'informe o % da bioimpedância'
const OUTRO_PROTOCOLO = `escolha outro protocolo ou ${INFORME_A_BIOIMPEDANCIA}`
const CONFIRA_AS_MEDIDAS = `confira as medidas ou ${INFORME_A_BIOIMPEDANCIA}`

const comMaiuscula = (texto: string) => texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1)

/** D-1042: a recusa com a causa e o que fazer; o motivo é a frase inteira. */
function recusado(protocolo: Protocolo | null, aplicacao: AplicacaoDoProtocolo | null, causa: string, oQueFazer: string): ResultadoDoProtocolo {
  return { calculou: false, protocolo, motivo: `${comMaiuscula(causa)}: ${oQueFazer}.`, aplicacao, recusa: { causa, oQueFazer } }
}

const FONTE_DA_CONVERSAO: Readonly<Record<DensidadeConvertida['conversao'], Fonte>> = { siri: FONTES.siri1961, brozek: FONTES.brozek1963, lohman: FONTES.lohman1986 }

const formatadores = new Map<number, Intl.NumberFormat>()
/** Um limite de referência (não um valor do paciente), como a tela escreve. */
function emMm(valor: number, casas: number): string {
  let f = formatadores.get(casas)
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    formatadores.set(casas, f)
  }
  return f.format(valor)
}

/** Rodada 2: de 90% do pico em diante, a inclinação da parábola já caiu a 10% da inicial. */
const FRACAO_DO_PICO_QUE_SATURA = 0.9

/** D-1038: a soma fora da faixa da amostra calcula, com o aviso e a faixa; perto do pico, avisa que satura (rodada 2). */
function avisosDaSoma(variante: VarianteDoProtocolo, soma: number): string[] {
  const avisos: string[] = []
  const exibida = naPrecisao(soma, 1)
  const faixa = variante.somaNaAmostra
  if (faixa && (exibida < faixa.min || exibida > faixa.max)) {
    const origem = faixa.inferida ? ', inferida pela faixa de cada dobra' : ''
    avisos.push(`A soma das dobras está fora da faixa da amostra da equação (${emMm(faixa.min, 0)} a ${emMm(faixa.max, 0)} mm${origem}).`)
  }
  const pico = variante.picoDaSomaMm
  if (pico !== null && exibida > FRACAO_DO_PICO_QUE_SATURA * pico) {
    avisos.push(`Soma perto do pico da equação (${emMm(pico, 1)} mm): o resultado satura, e o % quase não sobe com mais dobra. Compare com outro protocolo.`)
  }
  return avisos
}

const frase = (itens: readonly string[]) => (itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1] ?? ''}`)

function avisosDoResultado(protocolo: Protocolo, variante: VarianteDoProtocolo, paciente: PacienteDoProtocolo, opcoes: OpcoesDoProtocolo, entradas: readonly EntradaDaEquacao[]): string[] {
  const avisos: string[] = []
  const { idade } = variante
  const { idadeAnos, sexo } = paciente
  if (idade !== null && idadeAnos !== null && (idadeAnos < idade.min || idadeAnos > idade.max)) {
    avisos.push(`Fora da população de origem da equação (${variante.populacao}, de ${idade.min} a ${idade.max} anos).`)
  }
  if (protocolo.id === 'durnin-womersley' && opcoes.durninTodasAsIdades !== true && idadeAnos !== null && idade !== null && idadeAnos < idade.min) {
    avisos.push('Abaixo da primeira faixa de idade: usada a equação "todas as idades".')
  }
  if ((protocolo.id === 'jackson-pollock-3' || protocolo.id === 'jackson-pollock-7') && sexo === 'F' && idadeAnos !== null && idadeAnos > 40) {
    avisos.push('Os autores pedem cautela acima de 40 anos.')
  }
  if (entradas.includes('grupo')) avisos.push('O grupo (branco ou negro) é a classificação do estudo original e não foi validado para a população brasileira.')
  if (protocolo.aviso) avisos.push(protocolo.aviso)
  return avisos
}

/** O % de gordura do protocolo, com a densidade, a conversão, as massas e os avisos (D-1006 a D-1015). */
export function calcularProtocolo(id: IdProtocolo, pacienteInformado: PacienteDoProtocolo, dobras: Dobras, opcoes: OpcoesDoProtocolo = {}): ResultadoDoProtocolo {
  const paciente = comIdadeValida(pacienteInformado)
  const protocolo = protocoloPorId(id)
  // CB-1009 revisto: o id de uma versão mais nova também diz o que fazer (D-1042).
  if (!protocolo) return recusado(null, null, 'protocolo desconhecido nesta versão do app', OUTRO_PROTOCOLO)
  const falha = (motivo: string, ap: AplicacaoDoProtocolo | null = null): ResultadoDoProtocolo => ({ calculou: false, protocolo, motivo, aplicacao: ap, recusa: null })
  if (paciente.gestante) return falha('As equações de dobras não valem na gestação.')
  const ap = aplicacao(protocolo, paciente, dobras, opcoes)
  const { sexo } = paciente
  if (sexo === null) return falha('Informe o sexo para escolher a equação.', ap)
  if (ap.dobrasQueFaltam.length > 0) return falha(`Faltam as dobras: ${ap.dobrasQueFaltam.map((d) => NOME_DA_DOBRA[d]).join(', ')}.`, ap)
  if (ap.entradasQueFaltam.length > 0) return falha(`Informe ${frase(ap.entradasQueFaltam.map((e) => NOME_DA_ENTRADA[e]))}.`, ap)

  const variante = protocolo.porSexo[sexo]
  const soma = somaDas(variante.dobras, dobras)
  // D-1038: acima do pico da parábola, mais dobra daria menos gordura.
  if (variante.picoDaSomaMm !== null && soma > variante.picoDaSomaMm) {
    return recusado(protocolo, ap, `${protocolo.nome} só vale até ${emMm(variante.picoDaSomaMm, 1)} mm de soma, o pico da equação`, OUTRO_PROTOCOLO)
  }
  const peso = medidaValida(paciente.pesoKg)
  const valor = equacao(id, { sexo, soma, idade: paciente.idadeAnos, peso, estatura: medidaValida(paciente.estaturaCm), opcoes })
  if (valor === null || !Number.isFinite(valor)) return recusado(protocolo, ap, 'a equação não dá número com essas medidas', CONFIRA_AS_MEDIDAS)

  let gorduraPct = valor
  let densidade: number | null = null
  let conversao: DensidadeConvertida['conversao'] | null = null
  if (variante.saida === 'densidade') {
    const convertida = converterDensidade(valor, conversaoDoProtocolo(protocolo, opcoes), sexo, paciente.idadeAnos)
    if (!convertida) return recusado(protocolo, ap, 'a conversão de Lohman começa aos 7 anos', `escolha Siri ou Brozek, ou ${INFORME_A_BIOIMPEDANCIA}`)
    densidade = valor
    gorduraPct = convertida.gorduraPct
    conversao = convertida.conversao
  }
  // D-1015: a mesma regra de composicao.ts.
  if (!Number.isFinite(gorduraPct) || gorduraPct <= 0 || gorduraPct >= 70) {
    return recusado(protocolo, ap, 'o % calculado fica fora do plausível', CONFIRA_AS_MEDIDAS)
  }

  const massaGordaKg = peso === null ? null : (peso * gorduraPct) / 100
  return {
    calculou: true,
    protocolo,
    somaMm: soma,
    densidade,
    conversao,
    gorduraPct,
    massaGordaKg,
    massaMagraKg: peso === null || massaGordaKg === null ? null : peso - massaGordaKg,
    fontes: conversao === null ? [variante.fonte] : [variante.fonte, FONTE_DA_CONVERSAO[conversao]],
    avisos: [
      ...ap.avisos,
      ...avisosDaSoma(variante, soma),
      ...(conversao === 'lohman' ? [AVISO_DE_LOHMAN] : []),
      ...avisosDoResultado(protocolo, variante, paciente, opcoes, entradasPedidas(protocolo, variante, sexo, soma, opcoes)),
    ],
  }
}
