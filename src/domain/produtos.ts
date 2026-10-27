// "Meus alimentos": o que a nutricionista cadastra e a base não tem (revisão de produto, B-25; spec
// alimentos-e-gramaturas, D-383 a D-386). Começou como "Meus produtos", só pelo rótulo.
//
// Fica na chave `metanutri:produtos`, a mesma de antes, e entra nos cálculos como qualquer alimento. O item sempre tem
// `id`, `nome`, `porcaoG` e `porPorcao`, que é tudo o que a versão anterior lê: um alimento por 100 g é um item com
// porção de 100 g. Os campos novos (tipo, grupo, preparo, unidade, medidas, fonte…) são opcionais na leitura.
import { lerMedidaDaLista, lerMedidaDoRotulo, type MedidaLidaDoRotulo } from './medidaDoRotulo.ts'
import { MENSAGEM_ILEGIVEL } from './numeroDoRotulo.ts'
import type { Armazenamento } from './persistencia.ts'
import { ALIMENTOS } from './tabelas.ts'
import { CHAVES_NUTRIENTES } from './totais.ts'
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'

const CHAVE = 'metanutri:produtos'

/** Ids de produto começam acima da TACO, para nunca colidir com a tabela. */
export const PRIMEIRO_ID_PRODUTO = 900_000

/**
 * D-383 (publicação em duas vezes, decisão 4 do coordenador): o formulário novo de "Meus alimentos", "Copiar para Meus
 * alimentos" e "Salvar como alimento" ficaram desligados na publicação 1 (22/10/2026). A versão de antes dela refaz o
 * item só com os campos que conhece ao editar: uma aba antiga editando um item novo apagaria grupo, medidas e nome para o
 * paciente. Com a publicação 1 um dia no ar, todo aparelho já lê e preserva tudo; a publicação 2 liga (CA-1157).
 */
export const MEUS_ALIMENTOS_NOVOS: boolean = true

/** CB-371: com os 26 nutrientes, cada item tem cerca de 1,5 KB; a cópia da conta tem teto de 5 MB. */
export const LIMITE_ALIMENTOS_PROPRIOS = 1000

/** As marcas de mudança e as lápides da cópia na nuvem (a mesma chave de `copiaDaConta.ts`). */
const CHAVE_MARCAS = 'metanutri:mudancas'

/** Os ids de produto citados em referências de marca ou lápide (`produtos/<id>`). */
export function idsDeProdutoEm(referencias: Iterable<string>): number[] {
  const ids: number[] = []
  for (const ref of referencias) {
    const achado = /^produtos\/(\d+)$/.exec(ref)
    if (achado?.[1] !== undefined) ids.push(Number(achado[1]))
  }
  return ids
}

/**
 * Spec dados-na-nuvem, DP-21: um id de produto excluído (com lápide) ou marcado nunca é reaproveitado,
 * senão o produto novo herdaria a lápide do velho na próxima junção e sumiria.
 */
function idsMarcados(armazenamento: Armazenamento | null): number[] {
  try {
    const marcas: unknown = JSON.parse(armazenamento?.getItem(CHAVE_MARCAS) ?? 'null')
    if (typeof marcas !== 'object' || marcas === null) return []
    const { alterados, excluidos } = marcas as Record<string, unknown>
    const refs = [alterados, excluidos].flatMap((grupo) => (typeof grupo === 'object' && grupo !== null ? Object.keys(grupo) : []))
    return idsDeProdutoEm(refs)
  } catch {
    return []
  }
}

type CampoNutriente = { readonly chave: ChaveNutrienteAlimento; readonly rotulo: string; readonly unidade: string }

/** Campos que a rotulagem brasileira obriga (RDC 429/2020 e IN 75/2020). */
export const CAMPOS_ROTULO: readonly CampoNutriente[] = [
  { chave: 'energia_kcal', rotulo: 'Valor energético', unidade: 'kcal' },
  { chave: 'carboidrato_g', rotulo: 'Carboidratos', unidade: 'g' },
  { chave: 'acucares_g', rotulo: 'Açúcares totais', unidade: 'g' },
  { chave: 'proteina_g', rotulo: 'Proteínas', unidade: 'g' },
  { chave: 'lipideos_g', rotulo: 'Gorduras totais', unidade: 'g' },
  { chave: 'gordura_saturada_g', rotulo: 'Gorduras saturadas', unidade: 'g' },
  { chave: 'fibra_g', rotulo: 'Fibra alimentar', unidade: 'g' },
  { chave: 'sodio_mg', rotulo: 'Sódio', unidade: 'mg' },
]

/** Micronutrientes que o rótulo pode trazer, mas não é obrigado. */
export const CAMPOS_OPCIONAIS: readonly CampoNutriente[] = [
  { chave: 'calcio_mg', rotulo: 'Cálcio', unidade: 'mg' },
  { chave: 'ferro_mg', rotulo: 'Ferro', unidade: 'mg' },
  { chave: 'zinco_mg', rotulo: 'Zinco', unidade: 'mg' },
  { chave: 'potassio_mg', rotulo: 'Potássio', unidade: 'mg' },
  { chave: 'magnesio_mg', rotulo: 'Magnésio', unidade: 'mg' },
  { chave: 'vitamina_c_mg', rotulo: 'Vitamina C', unidade: 'mg' },
]

/** D-383: os 4 macros sem os quais o alimento não entra no plano. */
export const CAMPOS_MACROS: readonly CampoNutriente[] = [
  { chave: 'energia_kcal', rotulo: 'Energia', unidade: 'kcal' },
  { chave: 'proteina_g', rotulo: 'Proteína', unidade: 'g' },
  { chave: 'carboidrato_g', rotulo: 'Carboidrato', unidade: 'g' },
  { chave: 'lipideos_g', rotulo: 'Gordura total', unidade: 'g' },
]

/** D-383: opcionais gerais; vazio é "não informado", nunca zero. */
export const CAMPOS_GERAIS: readonly CampoNutriente[] = [
  { chave: 'fibra_g', rotulo: 'Fibra alimentar', unidade: 'g' },
  { chave: 'sodio_mg', rotulo: 'Sódio', unidade: 'mg' },
  { chave: 'acucares_g', rotulo: 'Açúcares totais', unidade: 'g' },
  { chave: 'gordura_saturada_g', rotulo: 'Gordura saturada', unidade: 'g' },
  { chave: 'gordura_trans_g', rotulo: 'Gordura trans', unidade: 'g' },
  { chave: 'colesterol_mg', rotulo: 'Colesterol', unidade: 'mg' },
]

/** D-383: os micronutrientes da adequação (o sódio está nos gerais), opcionais. */
export const CAMPOS_MICROS: readonly CampoNutriente[] = [
  { chave: 'calcio_mg', rotulo: 'Cálcio', unidade: 'mg' },
  { chave: 'ferro_mg', rotulo: 'Ferro', unidade: 'mg' },
  { chave: 'magnesio_mg', rotulo: 'Magnésio', unidade: 'mg' },
  { chave: 'zinco_mg', rotulo: 'Zinco', unidade: 'mg' },
  { chave: 'potassio_mg', rotulo: 'Potássio', unidade: 'mg' },
  { chave: 'fosforo_mg', rotulo: 'Fósforo', unidade: 'mg' },
  { chave: 'cobre_mg', rotulo: 'Cobre', unidade: 'mg' },
  { chave: 'manganes_mg', rotulo: 'Manganês', unidade: 'mg' },
  { chave: 'selenio_mcg', rotulo: 'Selênio', unidade: 'µg' },
  { chave: 'vitamina_a_rae_mcg', rotulo: 'Vitamina A (RAE)', unidade: 'µg' },
  { chave: 'vitamina_c_mg', rotulo: 'Vitamina C', unidade: 'mg' },
  { chave: 'vitamina_d_mcg', rotulo: 'Vitamina D', unidade: 'µg' },
  { chave: 'vitamina_e_mg', rotulo: 'Vitamina E', unidade: 'mg' },
  { chave: 'tiamina_mg', rotulo: 'Tiamina (B1)', unidade: 'mg' },
  { chave: 'riboflavina_mg', rotulo: 'Riboflavina (B2)', unidade: 'mg' },
  { chave: 'piridoxina_mg', rotulo: 'Vitamina B6', unidade: 'mg' },
  { chave: 'niacina_mg', rotulo: 'Niacina', unidade: 'mg' },
  { chave: 'folato_dfe_mcg', rotulo: 'Folato (DFE)', unidade: 'µg' },
  { chave: 'vitamina_b12_mcg', rotulo: 'Vitamina B12', unidade: 'µg' },
]

export type TipoAlimentoProprio = 'alimento' | 'preparacao' | 'rotulo'
export type PreparoProprio = 'cru' | 'cozido' | 'assado' | 'grelhado' | 'frito' | 'pronto para consumo'
export const PREPAROS_PROPRIOS: readonly PreparoProprio[] = ['cru', 'cozido', 'assado', 'grelhado', 'frito', 'pronto para consumo']

/** Os grupos da TACO e "Suplementos" (D-383): decidem a porção do grupo no Cobrir e as regras por categoria. */
export const GRUPO_SUPLEMENTOS = 'Suplementos'
export const GRUPOS_PROPRIOS: readonly string[] = [...new Set(ALIMENTOS.map((a) => a.categoria))].sort((a, b) => a.localeCompare(b, 'pt-BR')).concat(GRUPO_SUPLEMENTOS)

export type FonteAlimentoProprio =
  | { readonly tipo: 'rotulo' }
  | { readonly tipo: 'open-food-facts'; readonly codigo: string; readonly data: string }
  | { readonly tipo: 'laboratorio' }
  | { readonly tipo: 'copia-da-base'; readonly origemId: number }
  | { readonly tipo: 'outra'; readonly texto: string }

export interface MedidaDoProprio {
  readonly nome: string
  readonly gramas: number
}

export interface Produto {
  readonly id: number
  /** EAN lido do rótulo; vazio quando cadastrado à mão. */
  readonly codigoBarras: string
  readonly nome: string
  readonly marca: string
  /** A porção dos valores, em gramas ou mililitros; 100 quando os valores são por 100 g. */
  readonly porcaoG: number
  /** Como essa porção é servida: "1 pote", "2 fatias". Vazio quando o rótulo não diz. */
  readonly medidaCaseira: string
  /** Valores na porção `porcaoG`. `null` = não informado. */
  readonly porPorcao: Readonly<Partial<Record<ChaveNutrienteAlimento, number | null>>>
  readonly criadoEm: string
  // ---- Campos de "Meus alimentos" (D-383), opcionais na leitura: item antigo é um rótulo. ----
  readonly tipo?: TipoAlimentoProprio
  readonly nomeParaPaciente?: string
  readonly grupo?: string
  readonly preparo?: PreparoProprio
  readonly unidade?: 'g' | 'ml'
  /** "por100": os valores são por 100 g ou 100 ml; "porcao": na porção `porcaoG`, como o rótulo. */
  readonly base?: 'por100' | 'porcao'
  readonly medidas?: readonly MedidaDoProprio[]
  readonly fonte?: FonteAlimentoProprio
  readonly observacoes?: string
  /** "Pode aparecer no Cobrir e nas trocas" (D-386). Padrão desligado. */
  readonly sugerirAutomaticamente?: boolean
  readonly atualizadoEm?: string
}

export interface ProblemaProduto {
  readonly campo: string
  readonly mensagem: string
}

/** Converte o valor por porção para 100 g ou 100 ml, que é como o resto do sistema trabalha. */
export function porCem(valorNaPorcao: number, porcaoG: number): number {
  return Math.round(((valorNaPorcao * 100) / porcaoG) * 100) / 100
}

export type DadosProduto = Pick<Produto, 'nome' | 'marca' | 'porcaoG' | 'medidaCaseira' | 'porPorcao'>

/**
 * D-499 (I7 da revisão da publicação 2): as frases dos erros sem depender do gênero de cada nome. A mensagem vai
 * embaixo do próprio campo, então "O valor" basta; "Informe" leva o artigo e o pronome de cada macro.
 */
const NEGATIVO = 'O valor não pode ser negativo.'
const PORCAO_ACIMA = 'A porção não pode passar de 2.000 g ou ml.'
const ARTIGO_DO_MACRO: Readonly<Partial<Record<ChaveNutrienteAlimento, { readonly artigo: string; readonly pronome: string }>>> = {
  energia_kcal: { artigo: 'a', pronome: 'ela' },
  proteina_g: { artigo: 'a', pronome: 'ela' },
  carboidrato_g: { artigo: 'o', pronome: 'ele' },
  lipideos_g: { artigo: 'a', pronome: 'ela' },
}
function informe(chave: ChaveNutrienteAlimento, rotulo: string): string {
  const { artigo, pronome } = ARTIGO_DO_MACRO[chave] ?? { artigo: 'o', pronome: 'ele' }
  return `Informe ${artigo} ${rotulo.toLowerCase()}: sem ${pronome}, o alimento não entra nos cálculos.`
}

/** O cadastro pelo rótulo de antes (publicação 1): os campos obrigatórios do rótulo. */
export function validarProduto(p: DadosProduto): readonly ProblemaProduto[] {
  const problemas: ProblemaProduto[] = []
  if (p.nome.trim() === '') problemas.push({ campo: 'nome', mensagem: 'O produto precisa de um nome.' })
  if (!(p.porcaoG > 0)) problemas.push({ campo: 'porcaoG', mensagem: 'A porção precisa ser maior que zero.' })
  if (p.porcaoG > 2000) problemas.push({ campo: 'porcaoG', mensagem: PORCAO_ACIMA })

  for (const campo of CAMPOS_ROTULO) {
    const valor = p.porPorcao[campo.chave]
    if (valor === null || valor === undefined) {
      problemas.push({ campo: campo.chave, mensagem: 'Obrigatório no rótulo.' })
    } else if (valor < 0) {
      problemas.push({ campo: campo.chave, mensagem: NEGATIVO })
    }
  }
  problemas.push(...coerencia(p.porPorcao))
  return problemas
}

/** Açúcares dentro do carboidrato e saturada dentro da gordura (as duas regras de antes, D-384). */
function coerencia(v: Produto['porPorcao']): ProblemaProduto[] {
  const problemas: ProblemaProduto[] = []
  const { acucares_g: acucares, carboidrato_g: carboidrato, gordura_saturada_g: saturada, lipideos_g: lipideos } = v
  if (typeof acucares === 'number' && typeof carboidrato === 'number' && acucares > carboidrato) {
    problemas.push({ campo: 'acucares_g', mensagem: 'Açúcares não podem passar dos carboidratos totais. Confira os valores.' })
  }
  if (typeof saturada === 'number' && typeof lipideos === 'number' && saturada > lipideos) {
    problemas.push({ campo: 'gordura_saturada_g', mensagem: 'Gordura saturada não pode passar da gordura total. Confira os valores.' })
  }
  return problemas
}

/** Os dados do formulário de "Meus alimentos" (D-383). */
export interface DadosAlimentoProprio {
  readonly tipo: TipoAlimentoProprio
  readonly nome: string
  readonly nomeParaPaciente: string
  readonly marca: string
  readonly codigoBarras: string
  readonly grupo: string
  readonly preparo: PreparoProprio | null
  readonly unidade: 'g' | 'ml'
  readonly base: 'por100' | 'porcao'
  /** A porção dos valores quando `base` é "porcao"; 100 quando é "por100". */
  readonly porcaoG: number | null
  /** A medida caseira da porção como no rótulo ("1 pote", "4 colheres de sopa"): vira medida (A11, D-491). */
  readonly nomeDaPorcao: string
  readonly valores: Readonly<Partial<Record<ChaveNutrienteAlimento, number | null>>>
  readonly medidas: readonly MedidaDoProprio[]
  readonly fonte: FonteAlimentoProprio | null
  readonly observacoes: string
  readonly sugerirAutomaticamente: boolean
}

export interface AvisoAlimentoProprio {
  readonly campo: string
  readonly mensagem: string
}

/** O maior valor de cada nutriente na base: acima disso, o aviso de unidade (D-384). */
const MAIOR_NA_BASE: Readonly<Partial<Record<ChaveNutrienteAlimento, number>>> = Object.fromEntries(
  CHAVES_NUTRIENTES.map((chave) => [chave, Math.max(0, ...ALIMENTOS.map((a) => a.nutrientes[chave] ?? 0))]),
)

/** Os valores dos dados por 100 g (ou 100 ml); `null` sem porção válida. */
export function valoresPor100(d: Pick<DadosAlimentoProprio, 'base' | 'porcaoG' | 'valores'>): Partial<Record<ChaveNutrienteAlimento, number | null>> | null {
  const porcao = d.base === 'por100' ? 100 : d.porcaoG
  if (porcao === null || !(porcao > 0)) return null
  return Object.fromEntries(Object.entries(d.valores).map(([chave, v]) => [chave, typeof v === 'number' ? porCem(v, porcao) : null]))
}

/** "Pelos macros, dá 152 kcal": a energia pelos fatores de Atwater, por 100 g. `null` sem os três macros. */
export function energiaPelosMacros(v: Readonly<Partial<Record<ChaveNutrienteAlimento, number | null>>>): number | null {
  const { proteina_g: p, carboidrato_g: c, lipideos_g: g } = v
  if (typeof p !== 'number' || typeof c !== 'number' || typeof g !== 'number') return null
  return 4 * p + 4 * c + 9 * g
}

/** D-384: a energia digitada difere da dos macros em mais de 20% e de 15 kcal. */
export function energiaIncoerente(v: Readonly<Partial<Record<ChaveNutrienteAlimento, number | null>>>): boolean {
  const pelosMacros = energiaPelosMacros(v)
  const digitada = v.energia_kcal
  if (pelosMacros === null || typeof digitada !== 'number') return false
  const diferenca = Math.abs(digitada - pelosMacros)
  return diferenca > 15 && diferenca > 0.2 * Math.max(digitada, pelosMacros)
}

const inteiro = (n: number): string => String(Math.round(n))
const comDuasCasas = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
/** D-501: o óleo, o mais energético dos alimentos, tem 884 kcal em 100 g. */
const ENERGIA_MAXIMA_KCAL = 900

/**
 * D-384 e CA-1142 a CA-1144: o que impede salvar (problemas) e o que só pede conferência (avisos). Os valores são
 * conferidos como foram digitados e, nas somas, por 100 g. `ilegiveis` são os campos com texto que não é número
 * (D-497): o problema deles vem no lugar de "Informe…".
 */
export function validarAlimentoProprio(
  d: DadosAlimentoProprio,
  ilegiveis: readonly string[] = [],
): { readonly problemas: readonly ProblemaProduto[]; readonly avisos: readonly AvisoAlimentoProprio[] } {
  const problemas: ProblemaProduto[] = []
  const avisos: AvisoAlimentoProprio[] = []
  // Na base "por 100 g", o campo da porção nem aparece: o que ficou escrito nele não conta.
  const ilegivel = (campo: string) => ilegiveis.includes(campo) && (campo !== 'porcaoG' || d.base === 'porcao')
  for (const campo of new Set(ilegiveis)) if (ilegivel(campo)) problemas.push({ campo, mensagem: MENSAGEM_ILEGIVEL })
  if (d.nome.trim() === '') problemas.push({ campo: 'nome', mensagem: 'O alimento precisa de um nome.' })
  if (d.nome.length > 120) problemas.push({ campo: 'nome', mensagem: 'O nome tem mais de 120 caracteres.' })
  if (d.nomeParaPaciente.length > 120) problemas.push({ campo: 'nomeParaPaciente', mensagem: 'O nome para o paciente tem mais de 120 caracteres.' })
  if (d.grupo.trim() === '') problemas.push({ campo: 'grupo', mensagem: 'Escolha o grupo do alimento.' })
  if (d.tipo === 'alimento' && d.preparo === null) problemas.push({ campo: 'preparo', mensagem: 'Diga como o alimento é servido: cru, cozido, assado…' })
  if (d.base === 'porcao' && !ilegivel('porcaoG')) {
    if (d.porcaoG === null || !(d.porcaoG > 0)) problemas.push({ campo: 'porcaoG', mensagem: 'A porção precisa ser maior que zero.' })
    else if (d.porcaoG > 2000) problemas.push({ campo: 'porcaoG', mensagem: PORCAO_ACIMA })
  }
  for (const campo of CAMPOS_MACROS) {
    const v = d.valores[campo.chave]
    if (ilegivel(campo.chave)) continue
    if (v === null || v === undefined) problemas.push({ campo: campo.chave, mensagem: informe(campo.chave, campo.rotulo) })
    else if (v < 0) problemas.push({ campo: campo.chave, mensagem: NEGATIVO })
  }
  for (const campo of [...CAMPOS_GERAIS, ...CAMPOS_MICROS]) {
    const v = d.valores[campo.chave]
    if (typeof v === 'number' && v < 0) problemas.push({ campo: campo.chave, mensagem: NEGATIVO })
  }
  problemas.push(...coerencia(d.valores))
  // D-502 (I13): cada erro no próprio campo; a medida repetida (depois da leitura da D-496) não some em silêncio.
  const nomesVistos = new Set<string>()
  d.medidas.forEach((m, i) => {
    const lida = lerMedidaDaLista(m.nome, m.gramas)
    if (lida.nome === '') problemas.push({ campo: `medida-${i}-nome`, mensagem: 'Dê um nome à medida.' })
    else if (nomesVistos.has(lida.nome)) problemas.push({ campo: `medida-${i}-nome`, mensagem: `Já há uma medida “${lida.nome}”.` })
    if (!(m.gramas > 0) || m.gramas > 2000) problemas.push({ campo: `medida-${i}-peso`, mensagem: `Peso maior que 0 e até 2.000 ${d.unidade}.` })
    if (lida.nome !== '') nomesVistos.add(lida.nome)
  })
  if (d.fonte === null) problemas.push({ campo: 'fonte', mensagem: 'Diga de onde vieram os valores.' })
  else if (d.fonte.tipo === 'outra' && d.fonte.texto.trim() === '') problemas.push({ campo: 'fonte', mensagem: 'Escreva de onde vieram os valores.' })
  if (d.observacoes.length > 500) problemas.push({ campo: 'observacoes', mensagem: 'As observações têm mais de 500 caracteres.' })

  const por100 = valoresPor100(d)
  if (por100) {
    const soma = ['proteina_g', 'carboidrato_g', 'lipideos_g', 'fibra_g'].reduce((t, chave) => t + (por100[chave as ChaveNutrienteAlimento] ?? 0), 0)
    if (soma > 105) problemas.push({ campo: 'soma', mensagem: `Proteína, carboidrato, gordura e fibra passam de 105 g em 100 g (somam ${comDuasCasas.format(soma)} g). Confira os valores.` })
    // D-501 (I10): nem óleo passa de 900 kcal em 100 g; acima disso, é o kJ do rótulo digitado como kcal.
    const energia = por100.energia_kcal
    if (typeof energia === 'number' && energia > ENERGIA_MAXIMA_KCAL && !ilegivel('energia_kcal')) {
      problemas.push({ campo: 'energia_kcal', mensagem: `Energia acima de ${ENERGIA_MAXIMA_KCAL} kcal em 100 ${d.unidade}. O rótulo traz kJ e kcal: use o valor em kcal.` })
    }
    if (energiaIncoerente(d.valores)) {
      const pelosMacros = energiaPelosMacros(d.valores) ?? 0
      avisos.push({ campo: 'energia_kcal', mensagem: `Pelos macros, dá ${inteiro(pelosMacros)} kcal; você digitou ${inteiro(d.valores.energia_kcal ?? 0)}. Confira.` })
    }
    for (const campo of CAMPOS_MICROS) {
      const v = por100[campo.chave]
      const maior = MAIOR_NA_BASE[campo.chave]
      if (typeof v === 'number' && maior !== undefined && maior > 0 && v > maior) avisos.push({ campo: campo.chave, mensagem: `${campo.rotulo} acima de qualquer alimento da base. Confira a unidade: mg ou µg?` })
    }
  }
  return { problemas, avisos }
}

/**
 * A medida caseira da porção do rótulo (D-433, correção A): "4 colheres de sopa" com 40 g, "1 copo (200 ml)". O peso
 * escrito no texto vale mais; sem ele, a porção do rótulo, nunca os 100 g de uma leitura por 100 g da Open Food Facts
 * (Importante 3 da revisão de código).
 */
function medidaDoRotulo(p: Produto): MedidaLidaDoRotulo | null {
  if (typeof p.medidaCaseira !== 'string') return null
  const porPorcao = (p.base ?? 'porcao') === 'porcao' && p.fonte?.tipo !== 'open-food-facts' && p.porcaoG > 0
  return lerMedidaDoRotulo(p.medidaCaseira, porPorcao ? p.porcaoG : null)
}

/**
 * As medidas do item, lidas com segurança, mais a do rótulo e a "porção" (A11; D-433): "granola" de 40 g em "4
 * colheres de sopa" ganha "colher de sopa · 10 g" e "porção · 40 g". Com o mesmo nome, vale a do cadastro.
 */
function medidasDoProduto(p: Produto): readonly MedidaDoProprio[] {
  const validas = Array.isArray(p.medidas)
    ? p.medidas.filter((m): m is MedidaDoProprio => typeof m === 'object' && m !== null && typeof m.nome === 'string' && m.nome.trim() !== '' && typeof m.gramas === 'number' && m.gramas > 0)
    : []
  const rotulo = medidaDoRotulo(p)
  const doRotulo: MedidaDoProprio[] = rotulo ? [...(rotulo.medida ? [{ nome: rotulo.medida.nome, gramas: rotulo.medida.gramas }] : []), { nome: 'porção', gramas: rotulo.porcaoG }] : []
  const medidas: MedidaDoProprio[] = []
  // D-496: "2 fatias · 50 g" gravada antes é lida como "fatia · 25 g".
  for (const m of [...validas.map((v) => lerMedidaDaLista(v.nome, v.gramas)), ...doRotulo]) if (!medidas.some((x) => x.nome === m.nome)) medidas.push(m)
  return medidas
}

/** A porção do rótulo com a medida dela, que a entrada rápida usa quando não há quantidade (D-433). */
function porcaoPadraoDoProduto(p: Produto): Alimento['porcaoPadrao'] {
  const rotulo = medidaDoRotulo(p)
  if (!rotulo) return undefined
  return rotulo.medida
    ? { nome: rotulo.medida.nome, quantidade: rotulo.medida.quantidade, gramasPorMedida: rotulo.medida.gramas }
    : { nome: 'porção', quantidade: 1, gramasPorMedida: rotulo.porcaoG }
}

/**
 * O alimento próprio entra na busca e nos cálculos como um alimento normal, por 100 g.
 * Toda chave que o cadastro não traz fica nula, nunca indefinida: indefinido virava NaN nos totais do plano, e as
 * vitaminas do complemento do USDA nunca vêm do rótulo (spec vitaminas-usda, D-303 e CA-951).
 */
export function produtoComoAlimento(p: Produto): Alimento {
  // CA-793 (spec revisao-geral-trabalho): o que o rótulo não traz é falta de dado (nulo); indefinido virava NaN na soma.
  const nutrientes = Object.fromEntries(CHAVES_NUTRIENTES.map((chave) => [chave, null])) as Record<ChaveNutrienteAlimento, number | null>
  for (const [chave, valor] of Object.entries(p.porPorcao)) {
    nutrientes[chave as ChaveNutrienteAlimento] = typeof valor === 'number' ? porCem(valor, p.porcaoG) : null
  }
  const marca = typeof p.marca === 'string' ? p.marca.trim() : ''
  const descricao = marca ? `${p.nome.trim()} (${marca})` : p.nome.trim()
  const preparo = p.preparo && p.preparo !== 'pronto para consumo' ? p.preparo : null
  const porcaoPadrao = porcaoPadraoDoProduto(p)
  return {
    id: p.id,
    descricao,
    categoria: typeof p.grupo === 'string' && p.grupo.trim() !== '' ? p.grupo : 'Meus alimentos',
    base: null,
    preparo,
    qualificadores: null,
    nutrientes,
    tracos: [],
    ...(p.unidade === 'ml' || p.unidade === 'g' ? { unidade: p.unidade } : {}),
    medidas: medidasDoProduto(p),
    ...(porcaoPadrao ? { porcaoPadrao } : {}),
    proprio: {
      tipo: p.tipo ?? 'rotulo',
      nomeParaPaciente: typeof p.nomeParaPaciente === 'string' ? p.nomeParaPaciente.trim() : '',
      sugerir: p.sugerirAutomaticamente === true,
      energiaIncoerente: energiaIncoerente(nutrientes),
    },
  }
}

/**
 * D-248 (spec revisao-geral-trabalho): o nome da linha do plano cujo alimento não existe mais. O alimento próprio
 * excluído diz isso (D-385); o resto é alimento que saiu da base (CB-180 da impressao-do-plano).
 */
export function nomeSemAlimento(alimentoId: number): string {
  return alimentoId >= PRIMEIRO_ID_PRODUTO ? 'Alimento excluído' : 'Alimento removido'
}

/** O que o repositório grava: os campos de sempre e os novos, que ficam como vierem. */
export type DadosParaSalvar = Pick<Produto, 'nome' | 'porcaoG' | 'porPorcao'> &
  Partial<Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm' | 'nome' | 'porcaoG' | 'porPorcao'>> & { readonly id?: number }

export interface RepositorioProdutos {
  listar(): readonly Produto[]
  /** Preserva o que esta versão não conhece no item (`{ ...anterior, ...dados }`, D-383). */
  salvar(dados: DadosParaSalvar): Produto
  porCodigo(codigo: string): Produto | null
  excluir(id: number): void
  readonly persistente: boolean
}

function ehProduto(v: unknown): v is Produto {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o['id'] === 'number' && typeof o['nome'] === 'string' && typeof o['porcaoG'] === 'number' && typeof o['porPorcao'] === 'object' && o['porPorcao'] !== null
}

const texto = (v: unknown): string => (typeof v === 'string' ? v : '')

/**
 * D-498 (G6 da revisão da publicação 2): o item de uma versão antiga, de uma importação ou mexido à mão pode vir sem
 * os campos de texto; na leitura eles valem vazio, e a tela não quebra. A gravação continua com o item como veio.
 */
const comTextos = (p: Produto): Produto => ({ ...p, marca: texto(p.marca), codigoBarras: texto(p.codigoBarras), medidaCaseira: texto(p.medidaCaseira), criadoEm: texto(p.criadoEm) })

/** Os dados sem as chaves indefinidas: elas não apagam o que o item já tinha. */
const semIndefinidos = (o: object): Record<string, unknown> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))

export function criarRepositorioProdutos(armazenamento: Armazenamento | null, agora: () => string = () => new Date().toISOString()): RepositorioProdutos {
  const memoria: { lista: unknown[] } = { lista: [] }
  let persistente = armazenamento !== null

  // A lista como está guardada: item estragado é ignorado na leitura e preservado na gravação (CB-370).
  const lerBruto = (): unknown[] => {
    if (!persistente || !armazenamento) return memoria.lista
    try {
      const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE) ?? '[]')
      return Array.isArray(bruto) ? bruto : []
    } catch {
      return memoria.lista
    }
  }

  const gravar = (lista: unknown[]) => {
    memoria.lista = lista
    if (!persistente || !armazenamento) return
    try {
      armazenamento.setItem(CHAVE, JSON.stringify(lista))
    } catch {
      persistente = false
    }
  }

  const ler = (): Produto[] => lerBruto().filter(ehProduto).map(comTextos)
  const idDe = (v: unknown): unknown => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>)['id'] : undefined)

  return {
    get persistente() {
      return persistente
    },

    listar() {
      return ler().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    },

    salvar(dados) {
      const bruto = lerBruto()
      const lista = ler()
      if (dados.id === undefined && lista.length >= LIMITE_ALIMENTOS_PROPRIOS) {
        throw new RangeError(`Você já tem ${LIMITE_ALIMENTOS_PROPRIOS.toLocaleString('pt-BR')} alimentos cadastrados, o limite da conta. Exclua um que não usa mais.`)
      }
      const id = dados.id ?? Math.max(PRIMEIRO_ID_PRODUTO - 1, ...lista.map((p) => p.id), ...idsMarcados(armazenamento)) + 1
      const posicao = bruto.findIndex((v) => idDe(v) === id)
      const anterior = posicao === -1 ? {} : (bruto[posicao] as Record<string, unknown>)
      const quando = agora()
      const produto = {
        ...anterior,
        ...semIndefinidos(dados),
        id,
        codigoBarras: dados.codigoBarras ?? (typeof anterior['codigoBarras'] === 'string' ? anterior['codigoBarras'] : ''),
        marca: dados.marca ?? (typeof anterior['marca'] === 'string' ? anterior['marca'] : ''),
        medidaCaseira: dados.medidaCaseira ?? (typeof anterior['medidaCaseira'] === 'string' ? anterior['medidaCaseira'] : ''),
        criadoEm: typeof anterior['criadoEm'] === 'string' ? anterior['criadoEm'] : quando,
        atualizadoEm: quando,
      } as Produto
      gravar(posicao === -1 ? [...bruto, produto] : bruto.map((v, i) => (i === posicao ? produto : v)))
      return produto
    },

    porCodigo(codigo) {
      const digitos = codigo.replace(/\D/g, '')
      return digitos === '' ? null : (ler().find((p) => p.codigoBarras === digitos) ?? null)
    },

    excluir(id) {
      gravar(lerBruto().filter((v) => idDe(v) !== id))
    },
  }
}
