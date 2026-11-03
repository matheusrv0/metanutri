// Protocolos de dobras cutâneas da antropometria completa (spec antropometria-completa, D-1006 a D-1015).
// Coeficientes da pesquisa de 03/11/2026, seção 2: só os [V2] do lançamento (2.5.2), com todos os dígitos publicados.
// Dobras em mm, idade em anos completos, densidade (D) em g/ml, massa em kg, estatura em cm.
import { FONTES, type Fonte } from './fontesAntropometria.ts'
import { medidaValida } from './linhaDoResultado.ts'
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

const JP_DOBRAS_7: readonly DobraCutanea[] = ['peitoral', 'axilarMedia', 'tricipital', 'subescapular', 'abdominal', 'suprailiaca', 'coxa']
const JP78 = 'homens dos EUA (Jackson e Pollock, 1978)'
const JPW80 = 'mulheres dos EUA (Jackson, Pollock e Ward, 1980)'
const SLAUGHTER = 'crianças e adolescentes (Slaughter et al., 1988)'

export const PROTOCOLOS_DE_DOBRAS: readonly Protocolo[] = [
  {
    id: 'jackson-pollock-3',
    nome: 'Jackson & Pollock, 3 dobras',
    porSexo: {
      M: { populacao: JP78, idade: { min: 18, max: 61 }, dobras: ['peitoral', 'abdominal', 'coxa'], entradas: ['idade'], forma: 'quadratica', saida: 'densidade', fonte: FONTES.jacksonPollock1978 },
      F: { populacao: JPW80, idade: { min: 18, max: 55 }, dobras: ['tricipital', 'suprailiaca', 'coxa'], entradas: ['idade'], forma: 'quadratica', saida: 'densidade', fonte: FONTES.jacksonPollockWard1980 },
    },
    aviso: null,
  },
  {
    id: 'jackson-pollock-7',
    nome: 'Jackson & Pollock, 7 dobras',
    porSexo: {
      M: { populacao: JP78, idade: { min: 18, max: 61 }, dobras: JP_DOBRAS_7, entradas: ['idade'], forma: 'quadratica', saida: 'densidade', fonte: FONTES.jacksonPollock1978 },
      F: { populacao: JPW80, idade: { min: 18, max: 55 }, dobras: JP_DOBRAS_7, entradas: ['idade'], forma: 'quadratica', saida: 'densidade', fonte: FONTES.jacksonPollockWard1980 },
    },
    aviso: null,
  },
  {
    id: 'durnin-womersley',
    nome: 'Durnin & Womersley, 4 dobras',
    porSexo: {
      M: { populacao: 'homens de Glasgow, Escócia', idade: { min: 17, max: 72 }, dobras: ['bicipital', 'tricipital', 'subescapular', 'suprailiaca'], entradas: ['idade'], forma: 'log10', saida: 'densidade', fonte: FONTES.durninWomersley1974 },
      F: { populacao: 'mulheres de Glasgow, Escócia', idade: { min: 16, max: 68 }, dobras: ['bicipital', 'tricipital', 'subescapular', 'suprailiaca'], entradas: ['idade'], forma: 'log10', saida: 'densidade', fonte: FONTES.durninWomersley1974 },
    },
    aviso: null,
  },
  {
    id: 'petroski',
    nome: 'Petroski',
    porSexo: {
      M: { populacao: 'homens do sul do Brasil', idade: { min: 18, max: 61 }, dobras: ['subescapular', 'tricipital', 'suprailiaca', 'panturrilhaMedial'], entradas: ['idade'], forma: 'quadratica', saida: 'densidade', fonte: FONTES.petroski1995 },
      F: { populacao: 'mulheres do Rio Grande do Sul e de Santa Catarina', idade: { min: 18, max: 51 }, dobras: ['subescapular', 'suprailiaca', 'coxa'], entradas: ['idade', 'peso', 'estatura'], forma: 'quadratica', saida: 'densidade', fonte: FONTES.petroski1995 },
    },
    aviso: null,
  },
  {
    id: 'guedes',
    nome: 'Guedes',
    porSexo: {
      M: { populacao: 'universitários de Santa Maria (RS)', idade: { min: 17, max: 27 }, dobras: ['tricipital', 'suprailiaca', 'abdominal'], entradas: [], forma: 'log10', saida: 'densidade', fonte: FONTES.guedes1985 },
      F: { populacao: 'universitárias de Santa Maria (RS)', idade: { min: 18, max: 29 }, dobras: ['subescapular', 'suprailiaca', 'coxa'], entradas: [], forma: 'log10', saida: 'densidade', fonte: FONTES.guedes1985 },
    },
    aviso: null,
  },
  {
    id: 'faulkner-4',
    nome: 'Faulkner (Yuhasz), 4 dobras',
    porSexo: {
      M: { populacao: 'amostra de origem desconhecida', idade: null, dobras: ['tricipital', 'subescapular', 'suprailiaca', 'abdominal'], entradas: [], forma: 'linear', saida: 'gordura', fonte: FONTES.faulknerYuhasz },
      F: { populacao: 'amostra de origem desconhecida', idade: null, dobras: ['tricipital', 'subescapular', 'suprailiaca', 'abdominal'], entradas: [], forma: 'linear', saida: 'gordura', fonte: FONTES.faulknerYuhasz },
    },
    // D-1014: Pires Neto e Glaner (2007).
    aviso: 'Amostra de origem desconhecida; só há indicação para homens jovens treinados. A 4ª dobra é a abdominal ("umbilical" no original).',
  },
  {
    id: 'slaughter-triceps-subescapular',
    nome: 'Slaughter, tríceps e subescapular',
    porSexo: {
      M: { populacao: SLAUGHTER, idade: { min: 8, max: 18 }, dobras: ['tricipital', 'subescapular'], entradas: [], forma: 'quadratica-ate-35-linear-acima', saida: 'gordura', fonte: FONTES.slaughter1988 },
      F: { populacao: SLAUGHTER, idade: { min: 8, max: 18 }, dobras: ['tricipital', 'subescapular'], entradas: [], forma: 'quadratica-ate-35-linear-acima', saida: 'gordura', fonte: FONTES.slaughter1988 },
    },
    aviso: null,
  },
  {
    id: 'slaughter-triceps-panturrilha',
    nome: 'Slaughter, tríceps e panturrilha medial',
    porSexo: {
      M: { populacao: SLAUGHTER, idade: { min: 8, max: 18 }, dobras: ['tricipital', 'panturrilhaMedial'], entradas: [], forma: 'linear', saida: 'gordura', fonte: FONTES.slaughter1988 },
      F: { populacao: SLAUGHTER, idade: { min: 8, max: 18 }, dobras: ['tricipital', 'panturrilhaMedial'], entradas: [], forma: 'linear', saida: 'gordura', fonte: FONTES.slaughter1988 },
    },
    aviso: null,
  },
]

export const NOME_DA_DOBRA: Readonly<Record<DobraCutanea, string>> = {
  tricipital: 'tricipital',
  subescapular: 'subescapular',
  suprailiaca: 'suprailíaca',
  abdominal: 'abdominal',
  peitoral: 'peitoral',
  coxa: 'coxa',
  bicipital: 'bicipital',
  supraespinal: 'supraespinal',
  axilarMedia: 'axilar média',
  panturrilhaMedial: 'panturrilha medial',
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
export function converterDensidade(densidade: number, conversao: Conversao, sexo: Sexo, idadeAnos: number | null): DensidadeConvertida | null {
  if (conversao === 'siri') return { gorduraPct: siri(densidade), conversao: 'siri' }
  if (conversao === 'brozek') return { gorduraPct: brozek(densidade), conversao: 'brozek' }
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
      // JP78 Eq5 (homem) [V2, original] e JPW80 3 dobras quadrática (mulher) [V2].
      return sexo === 'M' ? 1.10938 - 0.0008267 * s + 0.0000016 * s ** 2 - 0.0002574 * i : 1.0994921 - 0.0009929 * s + 0.0000023 * s ** 2 - 0.0001392 * i
    case 'jackson-pollock-7':
      // JP78 Eq1 (homem) [V2, original] e JPW80 7 dobras quadrática (mulher) [V2].
      return sexo === 'M' ? 1.112 - 0.00043499 * s + 0.00000055 * s ** 2 - 0.00028826 * i : 1.097 - 0.00046971 * s + 0.00000056 * s ** 2 - 0.00012828 * i
    case 'durnin-womersley': {
      const { c, m } = coeficientesDurnin(sexo, idade, opcoes.durninTodasAsIdades === true)
      return c - m * Math.log10(s)
    }
    case 'petroski':
      // Homem 4 dobras (SE+TR+SI+PM) [V2]; mulher 3 dobras (SE+SI+CX) com massa (kg) e estatura (cm) [V2].
      if (sexo === 'M') return 1.10726863 - 0.00081201 * s + 0.00000212 * s ** 2 - 0.00041761 * i
      if (peso === null || estatura === null) return null
      return 1.04127059 - 0.00087756 * s + 0.0000038 * s ** 2 - 0.00025821 * i - 0.00059076 * peso + 0.0005105 * estatura
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
}

export const protocoloPorId = (id: IdProtocolo): Protocolo | null => PROTOCOLOS_DE_DOBRAS.find((p) => p.id === id) ?? null

const somaDas = (exigidas: readonly DobraCutanea[], dobras: Dobras): number => exigidas.reduce((total, d) => total + (medidaValida(dobras[d]) ?? 0), 0)

/** As entradas de que a conta precisa: as fixas, a idade da conversão automática e as do Slaughter até 35 mm. */
function entradasPedidas(protocolo: Protocolo, variante: VarianteDoProtocolo, sexo: Sexo, soma: number | null, opcoes: OpcoesDoProtocolo): EntradaDaEquacao[] {
  const pedidas = [...variante.entradas]
  const automatica = (opcoes.conversao ?? 'automatica') === 'automatica'
  if (variante.saida === 'densidade' && automatica && !pedidas.includes('idade')) pedidas.push('idade')
  if (protocolo.id === 'slaughter-triceps-subescapular' && sexo === 'M' && soma !== null && soma <= 35) pedidas.push('maturacao', 'grupo')
  return pedidas
}

function aplicacao(protocolo: Protocolo, paciente: PacienteDoProtocolo, dobras: Dobras, opcoes: OpcoesDoProtocolo): AplicacaoDoProtocolo {
  const { sexo, idadeAnos } = paciente
  if (sexo === null) return { dobrasExigidas: [], dobrasQueFaltam: [], entradasQueFaltam: ['sexo'], aplicaPeloSexo: null, aplicaPelaIdade: null }
  const variante = protocolo.porSexo[sexo]
  const dobrasQueFaltam = variante.dobras.filter((d) => medidaValida(dobras[d]) === null)
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
  return { dobrasExigidas: variante.dobras, dobrasQueFaltam, entradasQueFaltam, aplicaPeloSexo: true, aplicaPelaIdade }
}

/** Quais dobras e entradas faltam, e se o protocolo vale para o paciente pelo sexo e pela idade (CA-2011). */
export function aplicacaoDoProtocolo(id: IdProtocolo, paciente: PacienteDoProtocolo, dobras: Dobras, opcoes: OpcoesDoProtocolo = {}): AplicacaoDoProtocolo {
  const protocolo = protocoloPorId(id)
  if (!protocolo) return { dobrasExigidas: [], dobrasQueFaltam: [], entradasQueFaltam: [], aplicaPeloSexo: null, aplicaPelaIdade: null }
  return aplicacao(protocolo, paciente, dobras, opcoes)
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
  | { readonly calculou: false; readonly protocolo: Protocolo | null; readonly motivo: string; readonly aplicacao: AplicacaoDoProtocolo | null }

const FONTE_DA_CONVERSAO: Readonly<Record<DensidadeConvertida['conversao'], Fonte>> = { siri: FONTES.siri1961, brozek: FONTES.brozek1963, lohman: FONTES.lohman1986 }

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
export function calcularProtocolo(id: IdProtocolo, paciente: PacienteDoProtocolo, dobras: Dobras, opcoes: OpcoesDoProtocolo = {}): ResultadoDoProtocolo {
  const protocolo = protocoloPorId(id)
  if (!protocolo) return { calculou: false, protocolo: null, motivo: 'Protocolo desconhecido.', aplicacao: null }
  const falha = (motivo: string, ap: AplicacaoDoProtocolo | null = null): ResultadoDoProtocolo => ({ calculou: false, protocolo, motivo, aplicacao: ap })
  if (paciente.gestante) return falha('As equações de dobras não valem na gestação.')
  const ap = aplicacao(protocolo, paciente, dobras, opcoes)
  const { sexo } = paciente
  if (sexo === null) return falha('Informe o sexo para escolher a equação.', ap)
  if (ap.dobrasQueFaltam.length > 0) return falha(`Faltam as dobras: ${ap.dobrasQueFaltam.map((d) => NOME_DA_DOBRA[d]).join(', ')}.`, ap)
  if (ap.entradasQueFaltam.length > 0) return falha(`Informe ${frase(ap.entradasQueFaltam.map((e) => NOME_DA_ENTRADA[e]))}.`, ap)

  const variante = protocolo.porSexo[sexo]
  const soma = somaDas(variante.dobras, dobras)
  const peso = medidaValida(paciente.pesoKg)
  const valor = equacao(id, { sexo, soma, idade: paciente.idadeAnos, peso, estatura: medidaValida(paciente.estaturaCm), opcoes })
  if (valor === null || !Number.isFinite(valor)) return falha('As dobras informadas não permitem a conta. Confira as medidas.', ap)

  let gorduraPct = valor
  let densidade: number | null = null
  let conversao: DensidadeConvertida['conversao'] | null = null
  if (variante.saida === 'densidade') {
    const convertida = converterDensidade(valor, opcoes.conversao ?? 'automatica', sexo, paciente.idadeAnos)
    if (!convertida) return falha('A conversão de Lohman começa aos 7 anos: escolha Siri ou Brozek.', ap)
    densidade = valor
    gorduraPct = convertida.gorduraPct
    conversao = convertida.conversao
  }
  // D-1015: a mesma regra de composicao.ts.
  if (!Number.isFinite(gorduraPct) || gorduraPct <= 0 || gorduraPct >= 70) {
    return falha('As dobras informadas levam a um resultado fora do plausível. Confira as medidas.', ap)
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
    avisos: avisosDoResultado(protocolo, variante, paciente, opcoes, entradasPedidas(protocolo, variante, sexo, soma, opcoes)),
  }
}
