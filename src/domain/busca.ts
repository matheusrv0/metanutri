// Entrada rápida de alimentos (SPEC CA-15 a CA-18, CA-20, CA-21, CB-07).
import tabelaMedidas from '../data/medidas-caseiras.json'
import { posicaoNoConsumo } from './consumoPof.ts'
import { unidadeDo, type UnidadeDoAlimento } from './liquido.ts'
import { ehDeUsoComum, ehPratoComposto, regraQueExclui } from './prescritivel.ts'
import { alimentosComProdutos, buscarAlimento } from './tabelas.ts'
import type { Alimento } from './tipos.ts'

/** O primeiro id de alimento próprio (o mesmo `PRIMEIRO_ID_PRODUTO` de `produtos.ts`; aqui sem importar, para não fechar um ciclo). */
export const PRIMEIRO_ID_PROPRIO = 900_000

export interface MedidaCaseira {
  readonly nome: string
  readonly gramas: number
  /** Medida da conta (spec alimentos-e-gramaturas, D-387): vem antes das da POF e leva a marca "sua". */
  readonly propria?: boolean
}

const MEDIDAS_POR_ALIMENTO = new Map<number, readonly MedidaCaseira[]>(
  Object.entries(tabelaMedidas.alimentos as Record<string, { medidas: MedidaCaseira[] }>).map(([id, r]) => [Number(id), r.medidas]),
)

/** As medidas da conta para alimentos da base (spec alimentos-e-gramaturas, D-387), registradas pela interface. */
const PROPRIAS = new Map<number, readonly MedidaCaseira[]>()
let versaoDasProprias = 0

/** Troca as medidas da conta que a busca e a linha do plano conhecem (ao abrir, ao gravar e quando outra aba grava). */
export function registrarMedidasProprias(lista: readonly { readonly alimentoId: number; readonly nome: string; readonly gramas: number }[]): void {
  PROPRIAS.clear()
  for (const m of lista) PROPRIAS.set(m.alimentoId, [...(PROPRIAS.get(m.alimentoId) ?? []), { nome: m.nome, gramas: m.gramas, propria: true }])
  versaoDasProprias += 1
}

/**
 * As medidas do alimento: as da conta primeiro (marcadas `propria`), depois as da POF; com o mesmo nome, vale a da conta
 * (D-387). O alimento próprio traz as dele no cadastro.
 */
export function medidasDoAlimento(alimentoId: number): readonly MedidaCaseira[] {
  // O alimento próprio traz as do cadastro e do rótulo; a medida da conta também vale para ele (correção A, D-433).
  const daBase = alimentoId >= PRIMEIRO_ID_PROPRIO ? (buscarAlimento(alimentoId)?.medidas ?? []) : (MEDIDAS_POR_ALIMENTO.get(alimentoId) ?? [])
  const proprias = PROPRIAS.get(alimentoId)
  if (!proprias) return daBase
  return [...proprias, ...daBase.filter((m) => !proprias.some((p) => p.nome === m.nome))]
}

/** Medidas mais legíveis num plano, em ordem de preferência; medidas vagas ("porção", "prato") ficam de fora. */
export const PREFERENCIA_MEDIDAS: readonly string[] = [
  'unidade',
  'fatia',
  'bife',
  'filé',
  // Correção A (spec alimentos-e-gramaturas, D-431): a folha crua só tem folha, pires e prato; "3 folhas" é como se lê.
  'folha',
  'colher de sopa',
  'colher de servir',
  'concha',
  'escumadeira',
  'xícara de chá',
  'copo americano',
  'copo de requeijão',
  'unidade pequena',
  'pedaço',
  'colher de sobremesa',
  'colher de chá',
  'coxa',
  'sobrecoxa',
  'peito',
  'posta',
  'rodela',
  'gomo',
  'banda',
  'metade',
  'copo médio',
  'copo grande',
  'xícara de café',
  'colher de café',
]

const ERRO_MAXIMO = 0.15
const QUANTIDADE_MAXIMA = 8

// "porção" entrou com as receitas (spec receitas-com-calculo): "meia porção". Nenhum alimento escolhe "porção" como
// medida (não está em PREFERENCIA_MEDIDAS). "ponta" entrou com a ponta de faca (spec revisao-geral-trabalho, D-242).
const FEMININOS = new Set(['unidade', 'fatia', 'colher', 'concha', 'xícara', 'escumadeira', 'banda', 'metade', 'rodela', 'posta', 'coxa', 'sobrecoxa', 'folha', 'espiga', 'porção', 'ponta'])

/** "unidade" → "unidades", "colher de sopa" → "colheres de sopa", "porção" → "porções". */
export function pluralDaMedida(nome: string): string {
  const [primeira = '', ...resto] = nome.split(' ')
  const p = (w: string) =>
    w.endsWith('ão') ? `${w.slice(0, -2)}ões` : /[rz]$/.test(w) ? `${w}es` : w.endsWith('l') ? `${w.slice(0, -1)}is` : `${w}s`
  // adjetivo logo depois do substantivo concorda ("unidades pequenas", "copos americanos"); "de ..." fica igual
  const [segunda, ...demais] = resto
  const adjetivo = segunda && segunda !== 'de' ? [p(segunda), ...demais] : resto
  return [p(primeira), ...adjetivo].join(' ')
}

/** "0,25", "1,5": vírgula decimal, até duas casas. */
const decimal = (q: number): string => String(Math.round(q * 100) / 100).replace('.', ',')

export function formatarQuantidadeMedida(quantidade: number, medida: string): string {
  const feminino = FEMININOS.has(medida.split(' ')[0] ?? '')
  const meia = feminino ? 'meia' : 'meio'
  // D-373 (spec alimentos-e-gramaturas): fração que não é meia sai com vírgula ("0,25 xícara de chá").
  if (!Number.isInteger(quantidade * 2)) return `${decimal(quantidade)} ${quantidade >= 2 ? pluralDaMedida(medida) : medida}`
  const inteiro = Math.floor(quantidade)
  const temMeia = quantidade - inteiro === 0.5
  if (inteiro === 0 && temMeia) return `${meia} ${medida}`
  const nome = inteiro >= 2 ? pluralDaMedida(medida) : medida
  // "1 concha e meia", "2 fatias e meia"
  return temMeia ? `${inteiro} ${nome} e ${meia}` : `${inteiro} ${nome}`
}

export interface MedidaEquivalente {
  readonly medida: string
  readonly quantidade: number
  readonly texto: string
  readonly gramasEquivalentes: number
}

/** Medidas de contar: unidade e pedaço (spec conduta-da-nutricionista, D-295). */
export const MEDIDAS_DE_CONTAR: ReadonlySet<string> = new Set([
  'unidade',
  'unidade pequena',
  'fatia',
  'pedaço',
  'rodela',
  'gomo',
  'banda',
  'metade',
  'bife',
  'filé',
  'posta',
  'coxa',
  'sobrecoxa',
  'peito',
])

/** Mais de 4 unidades ou pedaços não é como a paciente conta a comida ("7 torradas", "5 fatias e meia de ovo"). */
export const MAXIMO_DE_PEDACOS = 4

interface OpcoesDaMedida {
  /** Tira a medida de contar que pediria mais pedaços que isto (D-295 da conduta-da-nutricionista). */
  readonly maximoDePedacos?: number | undefined
  /** Tira a "fatia" (manteiga e margarina, D-242 da revisao-geral-trabalho). */
  readonly semFatia?: boolean | undefined
  /** Tira a colher (de sopa, de sobremesa, de servir, de chá) que pediria mais colheres que isto (D-483, carne e peixe). */
  readonly maximoDeColheres?: number | undefined
}

const PECAS_DA_FRUTA_PEQUENA: ReadonlySet<string> = new Set(['unidade', 'unidade pequena'])
/** Fruta com unidade da base até este peso se come inteira: maçã, pera, laranja, banana prata. */
const FRUTA_PEQUENA_ATE_G = 250
const MAXIMO_DE_FATIAS_DE_FRUTA = 2
/** D-484: o erro aceito na unidade da fruta, que varia de tamanho (a automática diz "cerca de" acima de 5%). */
const ERRO_MAXIMO_DA_PECA_DE_FRUTA = 0.2

/**
 * D-423 (spec alimentos-e-gramaturas, seção 6): a peça que a fruta inteira crua aceita. A fruta pequena só em unidade e
 * unidade pequena ("1 unidade pequena e meia" de maçã, nunca "3 fatias e meia"); a grande ou sem unidade também em fatia
 * e pedaço, até 2 ("1 fatia de mamão"). Banda, metade, gomo e rodela saem: a meia unidade já diz "meia unidade". A
 * medida da conta e o alimento próprio são da nutricionista e sempre valem; colher, xícara e taça não são peça.
 */
function pecaDaFruta(alimentoId: number, medidas: readonly MedidaCaseira[]): ((m: MedidaCaseira, quantidade: number) => boolean) | null {
  const a = alimentoId >= PRIMEIRO_ID_PROPRIO ? undefined : buscarAlimento(alimentoId)
  if (!a || a.categoria !== 'Frutas e derivados' || a.preparo !== 'cru' || /suco|polpa/i.test(a.descricao)) return null
  const pequena = medidas.some((m) => m.propria !== true && PECAS_DA_FRUTA_PEQUENA.has(m.nome) && m.gramas <= FRUTA_PEQUENA_ATE_G)
  return (m, quantidade) => {
    if (m.propria === true || !MEDIDAS_DE_CONTAR.has(m.nome)) return true
    // D-484 (correção C): a unidade pequena é sempre inteira ("1 unidade pequena e meia" de maçã não se lê); a unidade
    // aceita a meia ("1 unidade e meia" de banana, "meia unidade").
    if (m.nome === 'unidade pequena') return Number.isInteger(quantidade)
    if (PECAS_DA_FRUTA_PEQUENA.has(m.nome)) return true
    return !pequena && (m.nome === 'fatia' || m.nome === 'pedaço') && quantidade <= MAXIMO_DE_FATIAS_DE_FRUTA
  }
}

/** A medida mais legível entre as preferidas, em passos de meia medida. */
function melhorMedida(alimentoId: number, gramas: number, opcoes: OpcoesDaMedida): MedidaEquivalente | null {
  if (!(gramas > 0)) return null
  let melhor: { m: MedidaCaseira; q: number; pontos: number } | null = null
  const medidas = medidasDoAlimento(alimentoId)
  const servePraFruta = pecaDaFruta(alimentoId, medidas)
  for (const m of medidas) {
    const preferencia = PREFERENCIA_MEDIDAS.indexOf(m.nome)
    if (preferencia < 0 || (opcoes.semFatia && m.nome === 'fatia')) continue
    const q = Math.max(0.5, Math.round((gramas / m.gramas) * 2) / 2)
    if (q > QUANTIDADE_MAXIMA) continue
    if (servePraFruta && !servePraFruta(m, q)) continue
    if (opcoes.maximoDePedacos !== undefined && MEDIDAS_DE_CONTAR.has(m.nome) && q > opcoes.maximoDePedacos) continue
    if (opcoes.maximoDeColheres !== undefined && m.nome.startsWith('colher') && q > opcoes.maximoDeColheres) continue
    const erro = Math.abs(q * m.gramas - gramas) / gramas
    // D-484 (correção C): a peça da fruta varia de tamanho; aceita até 20% (e a linha diz "cerca de" acima de 5%, D-434):
    // 130 g de maçã é "130 g (cerca de 1 unidade)", não "1 unidade pequena e meia".
    const tolerancia = servePraFruta && PECAS_DA_FRUTA_PEQUENA.has(m.nome) && m.propria !== true ? ERRO_MAXIMO_DA_PECA_DE_FRUTA : ERRO_MAXIMO
    if (erro > tolerancia) continue
    // desempate: menos unidades da medida lê melhor ("1 concha" em vez de "4 colheres de servir")
    const pontos = erro + preferencia * 0.01 + (q - 1) * 0.004
    if (!melhor || pontos < melhor.pontos) melhor = { m, q, pontos }
  }
  if (!melhor) return null
  return {
    medida: melhor.m.nome,
    quantidade: melhor.q,
    texto: formatarQuantidadeMedida(melhor.q, melhor.m.nome),
    gramasEquivalentes: Math.round(melhor.q * melhor.m.gramas * 10) / 10,
  }
}

/**
 * CA-19: gramas expressas na medida caseira mais legível do alimento, em passos de meia medida: a medida do planejador
 * na busca. Com `maximoDePedacos`, deixa de fora a medida de contar com mais pedaços (D-295 da conduta-da-nutricionista).
 * Para mostrar à pessoa (planejador, folha, link, Word), use `medidaParaMostrar`.
 */
export function medidaEquivalente(alimentoId: number, gramas: number, opcoes: { readonly maximoDePedacos?: number } = {}): MedidaEquivalente | null {
  return melhorMedida(alimentoId, gramas, { maximoDePedacos: opcoes.maximoDePedacos })
}

const PONTA_DE_FACA = 'ponta de faca'
const MAXIMO_DE_PONTAS = 3
/** Manteiga e margarina: a "fatia" de 32 g da base não é como ninguém serve gordura. */
const GORDURAS = 'Gorduras e óleos'
const CARNE_OU_PEIXE: ReadonlySet<string> = new Set(['Carnes e derivados', 'Pescados e frutos do mar'])

/** CA-642 da impressao-do-plano: o que se passa no pão, em ponta de faca, até 3 e dentro de 15% do peso. */
function emPontaDeFaca(alimentoId: number, gramas: number): MedidaEquivalente | null {
  const ponta = medidasDoAlimento(alimentoId).find((m) => m.nome === PONTA_DE_FACA)
  if (!ponta || !(gramas > 0)) return null
  const quantidade = Math.max(0.5, Math.round((gramas / ponta.gramas) * 2) / 2)
  if (quantidade > MAXIMO_DE_PONTAS || Math.abs(quantidade * ponta.gramas - gramas) / gramas > ERRO_MAXIMO) return null
  return {
    medida: PONTA_DE_FACA,
    quantidade,
    texto: formatarQuantidadeMedida(quantidade, PONTA_DE_FACA),
    gramasEquivalentes: Math.round(quantidade * ponta.gramas * 10) / 10,
  }
}

/**
 * A medida caseira que a paciente lê (spec conduta-da-nutricionista, D-295 e D-297): a do planejador, mas, quando ela
 * pede mais de 4 unidades ou pedaços e outra medida do alimento serve, a outra ("1 unidade" de ovo frito, não "5 fatias e
 * meia"). Sem outra que sirva, fica a do planejador. Gordura nunca em fatia (D-242 da revisao-geral-trabalho).
 */
export function medidaCaseiraParaPaciente(alimentoId: number, gramas: number): MedidaEquivalente | null {
  const categoria = buscarAlimento(alimentoId)?.categoria
  const semFatia = categoria === GORDURAS
  // D-483 (correção C): carne, ave e peixe em colher só até 4 ("7 colheres de sopa e meia" de atum não se lê).
  const maximoDeColheres = categoria !== undefined && CARNE_OU_PEIXE.has(categoria) ? MAXIMO_DE_PEDACOS : undefined
  return (
    melhorMedida(alimentoId, gramas, { semFatia, maximoDePedacos: MAXIMO_DE_PEDACOS, maximoDeColheres }) ??
    melhorMedida(alimentoId, gramas, { semFatia, maximoDeColheres })
  )
}

/**
 * A medida caseira que se mostra, igual no planejador, na folha do paciente, no link, no Cobrir, no substituto e no Word
 * (D-242 da revisao-geral-trabalho): ponta de faca primeiro; depois a medida para a paciente (D-295 da
 * conduta-da-nutricionista, que substitui o "mais de 4 pedaços, sem medida" da D-242).
 */
export function medidaParaMostrar(alimentoId: number, gramas: number): MedidaEquivalente | null {
  return emPontaDeFaca(alimentoId, gramas) ?? medidaCaseiraParaPaciente(alimentoId, gramas)
}

/** Nomes de medidas conhecidos, das mais longas para as mais curtas (para casar "colher de sopa" antes de "colher"). */
export const MEDIDAS: readonly string[] = [...new Set([...MEDIDAS_POR_ALIMENTO.values()].flat().map((m) => m.nome))].sort(
  (a, b) => b.length - a.length,
)

export const GRAMAS_PADRAO = 100
export const LIMITE_RESULTADOS = 5

/** Abaixo disto, número sem medida conta unidades quando o alimento tem medida de contar (D-371). */
export const LIMITE_DE_UNIDADES = 20

export const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Plural da primeira palavra da medida: colher -> colheres, pedaço -> pedaços, porção -> porções. */
function variantesPlural(palavra: string): string[] {
  const variantes = [palavra]
  if (palavra.endsWith('ao')) variantes.push(`${palavra.slice(0, -2)}oes`)
  else if (/[rz]$/.test(palavra)) variantes.push(`${palavra}es`)
  else if (palavra.endsWith('l')) variantes.push(`${palavra.slice(0, -1)}is`)
  else variantes.push(`${palavra}s`)
  return variantes
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const padraoDaMedida = (nome: string): RegExp => {
  const [primeira = '', ...resto] = normalizar(nome).split(' ')
  const inicio = `(?:${variantesPlural(primeira).map(escapar).join('|')})`
  const fim = resto.length ? ` ${resto.map(escapar).join(' ')}` : ''
  return new RegExp(`^${inicio}${fim}(?=\\s|$)`)
}

let padroes: { readonly chave: unknown; readonly versao: number; readonly lista: readonly { readonly nome: string; readonly re: RegExp }[] } | null = null

/**
 * Os nomes de medida que a entrada entende: os da POF, os das medidas da conta e os dos alimentos próprios (D-387), dos
 * mais longos para os mais curtos. Refeito só quando um deles muda.
 */
function padroesDeMedida(): readonly { readonly nome: string; readonly re: RegExp }[] {
  const comProprios = alimentosComProdutos()
  if (padroes && padroes.chave === comProprios && padroes.versao === versaoDasProprias) return padroes.lista
  const nomes = new Set(MEDIDAS)
  for (const lista of PROPRIAS.values()) for (const m of lista) nomes.add(m.nome)
  for (const a of comProprios) for (const m of a.medidas ?? []) nomes.add(m.nome)
  const lista = [...nomes].sort((a, b) => b.length - a.length).map((nome) => ({ nome, re: padraoDaMedida(nome) }))
  padroes = { chave: comProprios, versao: versaoDasProprias, lista }
  return lista
}

/**
 * D-372 (spec alimentos-e-gramaturas): o nome curto da medida, como se fala. Vale a primeira medida da lista que o
 * alimento tiver; sem nenhuma, a medida não existe para ele.
 */
export const MEDIDAS_CURTAS: Readonly<Record<string, readonly string[]>> = {
  colher: ['colher de sopa', 'colher de servir'],
  'xícara': ['xícara de chá'],
  copo: ['copo americano', 'copo médio', 'copo de requeijão', 'copo grande'],
  // D-424: o "copo médio" de 240 ml virou "copo de requeijão" na base; quem escreve o nome antigo acha o mesmo copo.
  'copo médio': ['copo médio', 'copo de requeijão'],
}

// Do mais longo para o mais curto: "copo médio" antes de "copo". Sem isso, o nome antigo só era lido enquanto algum
// alimento da base ainda tinha "copo médio" (o cereal matinal, até a D-483 da correção C).
const PADROES_CURTOS = Object.keys(MEDIDAS_CURTAS)
  .sort((a, b) => b.length - a.length)
  .map((nome) => ({ nome, re: padraoDaMedida(nome) }))

/** Quantidade por extenso (D-372). */
const PALAVRAS_QUANTIDADE: Readonly<Record<string, number>> = { meia: 0.5, meio: 0.5, uma: 1, um: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5 }
const PALAVRA_QUANTIDADE = /^(meia|meio|uma|um|duas|dois|tres|quatro|cinco)(?=\s|$)/
const FRACOES: Readonly<Record<string, string>> = { '½': ' 1/2 ', '¼': ' 1/4 ', '¾': ' 3/4 ' }

export interface InterpretacaoEntrada {
  readonly quantidade: number | null
  /** O nome inteiro da medida ("colher de sopa") ou o curto ("colher", D-372). */
  readonly medida: string | null
  /** "g" quando a pessoa escreveu gramas; "ml" quando escreveu ml ou litro; `null` quando não disse. */
  readonly unidade: 'g' | 'ml' | null
  readonly termos: readonly string[]
}

const fracao = (a: string, b: string): number => (Number(b) === 0 ? Number.NaN : Number(a) / Number(b))

function lerQuantidade(texto: string): { valor: number; resto: string } | null {
  // "1.000 ml": o ponto separa o milhar (Menor da revisão de código, correção A); "1,5" e "1.5" continuam decimais.
  const milhar = texto.match(/^(\d{1,3}(?:\.\d{3})+)(?=\s|[a-z]|$)/)
  const m = milhar ? null : texto.match(/^(\d+)\s*\/\s*(\d+)(?=\s|[a-z]|$)|^(\d+(?:[.,]\d+)?)(?=\s|[a-z]|$)/)
  let valor: number
  let resto: string
  if (milhar?.[1]) {
    valor = Number(milhar[1].replace(/\./g, ''))
    resto = texto.slice(milhar[0].length).trim()
  } else if (m) {
    valor = m[1] && m[2] ? fracao(m[1], m[2]) : Number((m[3] ?? '').replace(',', '.'))
    resto = texto.slice(m[0].length).trim()
  } else {
    const p = texto.match(PALAVRA_QUANTIDADE)
    if (!p?.[1]) return null
    valor = PALAVRAS_QUANTIDADE[p[1]] ?? Number.NaN
    resto = texto.slice(p[0].length).trim()
  }
  if (!Number.isFinite(valor)) return null
  // "1 1/2" (de "1½") e "1 e meia" / "uma e meia".
  const meia = Number.isInteger(valor) ? resto.match(/^(\d+)\s*\/\s*(\d+)(?=\s|$)/) : null
  if (meia?.[1] && meia[2] && Number(meia[1]) < Number(meia[2])) {
    valor += fracao(meia[1], meia[2])
    resto = resto.slice(meia[0].length).trim()
  }
  const eMeia = resto.match(/^e (meia|meio)(?=\s|$)/)
  if (eMeia) {
    valor += 0.5
    resto = resto.slice(eMeia[0].length).trim()
  }
  return { valor, resto }
}

/** "de", "da", "do" depois da medida ou da unidade. */
const tirarDe = (texto: string): string => texto.replace(/^(de|da|do|dos|das)(?=\s|$)/, '').trim()

export function interpretarEntrada(texto: string): InterpretacaoEntrada {
  let resto = normalizar(texto.replace(/[½¼¾]/g, (f) => FRACOES[f] ?? f))
    .trim()
    .replace(/\s+/g, ' ')
  let quantidade: number | null = null
  const q = lerQuantidade(resto)
  if (q) {
    quantidade = q.valor
    resto = q.resto
  }

  let medida: string | null = null
  let unidade: InterpretacaoEntrada['unidade'] = null
  const gramas = resto.match(/^(?:g|gr|grama|gramas)(?=\s|$)/)
  const ml = resto.match(/^(?:ml|mililitro|mililitros)(?=\s|$)/)
  const litro = resto.match(/^(?:l|litro|litros)(?=\s|$)/)
  if (gramas) {
    unidade = 'g'
    resto = tirarDe(resto.slice(gramas[0].length).trim())
  } else if (ml || litro) {
    unidade = 'ml'
    if (litro && quantidade !== null) quantidade *= 1000
    resto = tirarDe(resto.slice((ml ?? litro)?.[0].length ?? 0).trim())
  } else {
    for (const p of [...padroesDeMedida(), ...PADROES_CURTOS]) {
      const m = resto.match(p.re)
      if (m) {
        medida = p.nome
        resto = resto.slice(m[0].length).trim()
        // "1 concha e meia de feijão"
        const eMeia = resto.match(/^e (meia|meio)(?=\s|$)/)
        if (eMeia) {
          quantidade = (quantidade ?? 1) + 0.5
          resto = resto.slice(eMeia[0].length).trim()
        }
        resto = tirarDe(resto)
        if (quantidade === null) quantidade = 1
        // "1 xícara de café", "1 colher de chá": a última palavra da medida também é o alimento.
        if (resto === '' && p.nome.includes(' ')) resto = normalizar(p.nome.split(' ').at(-1) ?? '')
        break
      }
    }
  }

  const termos = resto.split(' ').filter((t) => t !== '' && t !== 'de')
  return { quantidade, medida, unidade, termos }
}

/** O termo com e sem o plural (D-372): "ovos" acha ovo; "paes" acha pao; "feijoes" acha feijao. */
export function variantesDoTermo(termo: string): readonly string[] {
  const singular = termo.endsWith('oes') || termo.endsWith('aes')
    ? `${termo.slice(0, -3)}ao`
    : // "franceses" → "frances", "ingleses" → "ingles" (Menor da revisão de código, correção A).
      termo.length > 5 && termo.endsWith('eses')
      ? termo.slice(0, -2)
      : termo.endsWith('ais')
      ? `${termo.slice(0, -3)}al`
      : termo.endsWith('eis')
        ? `${termo.slice(0, -3)}el`
        : /[rz]es$/.test(termo)
          ? termo.slice(0, -2)
          : termo.length > 3 && termo.endsWith('s')
            ? termo.slice(0, -1)
            : termo
  return singular === termo ? [termo] : [termo, singular]
}

/** A medida que o alimento tem com o nome pedido (inteiro ou curto); `null` quando ele não tem. */
export function medidaPedida(alimentoId: number, pedida: string): MedidaCaseira | null {
  const medidas = medidasDoAlimento(alimentoId)
  // O nome curto vale primeiro; depois, o nome como foi escrito (o "copo" do rótulo de um alimento próprio, D-433).
  const nomes = MEDIDAS_CURTAS[pedida] ? [...MEDIDAS_CURTAS[pedida], pedida] : [pedida]
  for (const nome of nomes) {
    const achada = medidas.find((m) => m.nome === nome)
    if (achada) return achada
  }
  return null
}

/** A ordem das medidas de contar para "1 banana" (D-371): unidade primeiro, depois fatia, bife, filé… */
const ORDEM_DE_CONTAR = ['unidade', 'fatia', 'bife', 'filé', 'unidade pequena', 'pedaço', 'posta', 'coxa', 'sobrecoxa', 'peito', 'rodela']

/** Fruta se conta pela unidade: "1 banana nanica" nunca é "1 fatia" (correção A, CA-1258). */
const ORDEM_DE_CONTAR_FRUTA = ['unidade', 'unidade pequena']

/** A medida de contar do alimento, na ordem acima; `null` quando ele não tem. */
export function medidaDeContar(alimentoId: number): MedidaCaseira | null {
  const medidas = medidasDoAlimento(alimentoId)
  for (const nome of ehFruta(alimentoId) ? ORDEM_DE_CONTAR_FRUTA : ORDEM_DE_CONTAR) {
    const achada = medidas.find((m) => m.nome === nome)
    if (achada) return achada
  }
  return null
}

export interface MedidaDoResultado {
  readonly nome: string
  readonly quantidade: number
  readonly gramasPorMedida: number
}

export interface ResultadoBusca {
  readonly alimento: Alimento
  /** Gramas a adicionar; `null` quando a medida digitada não existe para este alimento (CB-07). */
  readonly gramas: number | null
  readonly medida: MedidaDoResultado | null
  /** Como o peso se escreve: ml para líquido ou quando a pessoa digitou ml (D-378). */
  readonly unidade: UnidadeDoAlimento
  readonly aviso: string | null
  /**
   * A medida pedida que o alimento não tem, com a quantidade digitada: "+ Nova medida" cria e põe o alimento nela
   * (spec alimentos-e-gramaturas, correção A, D-432).
   */
  readonly faltaMedida?: { readonly nome: string; readonly quantidade: number }
}

/** Quantas medidas que há o aviso cita. */
const MEDIDAS_NO_AVISO = 3

/** "Sem “xícara de chá” · tem colher de sopa (15 g), colher de servir (30 g)" (D-432). */
function avisoSemMedida(alimento: Alimento, nome: string, unidade: UnidadeDoAlimento): string {
  const posicao = (m: MedidaCaseira) => (m.propria === true ? -1 : PREFERENCIA_MEDIDAS.indexOf(m.nome))
  const legiveis = medidasDoAlimento(alimento.id)
    .filter((m) => posicao(m) !== -1 || m.propria === true)
    .sort((a, b) => posicao(a) - posicao(b))
    .slice(0, MEDIDAS_NO_AVISO)
  if (legiveis.length === 0) return `Sem “${nome}” e sem outra medida cadastrada`
  return `Sem “${nome}” · tem ${legiveis.map((m) => `${m.nome} (${formatarPeso(m.gramas)} ${unidade})`).join(', ')}`
}

/** O alimento é fruta: conta pela unidade (CA-1258). */
const ehFruta = (alimentoId: number): boolean => buscarAlimento(alimentoId)?.categoria.startsWith('Frutas') === true

interface Indice {
  readonly alimento: Alimento
  readonly texto: string
  /** A forma crua de quem se come cozido, quando a base tem a preparada: vem depois dela (D-370, item 3). */
  readonly cruIngrediente: boolean
  readonly usoComum: boolean
  /** Desempate depois do uso comum: o prescritível simples, o ingrediente, o prato composto e o fora da rotina. */
  readonly classe: number
  readonly consumo: number
  readonly virgulas: number
}

/** "Arroz, integral, cru" termina no preparo cru. */
const CRU_NO_FIM = /,\s*cru[ao]?s?$/
/** A descrição sem o último pedaço (o preparo): "Arroz, integral, cru" e "Arroz, integral, cozido" dão "arroz, integral". */
const semPreparo = (descricao: string): string => normalizar(descricao).trim().split(',').slice(0, -1).map((p) => p.trim()).join(',')

const indices = new WeakMap<readonly Alimento[], readonly Indice[]>()
function indexar(alimentos: readonly Alimento[]): readonly Indice[] {
  let i = indices.get(alimentos)
  if (!i) {
    const preparadas = new Set(alimentos.filter((a) => !CRU_NO_FIM.test(normalizar(a.descricao).trim())).map((a) => semPreparo(a.descricao)))
    i = alimentos.map((alimento) => {
      const texto = normalizar(alimento.descricao).trim()
      const regra = regraQueExclui(alimento)
      return {
        alimento,
        texto,
        cruIngrediente: regra?.id === 'cru' && CRU_NO_FIM.test(texto) && preparadas.has(semPreparo(alimento.descricao)),
        usoComum: ehDeUsoComum(alimento),
        classe: regra === null ? (ehPratoComposto(alimento) ? 2 : 0) : regra.nivel === 'ingrediente' ? 1 : 3,
        consumo: posicaoNoConsumo(alimento.id),
        virgulas: texto.split(',').length,
      }
    })
    indices.set(alimentos, i)
  }
  return i
}

export interface OpcoesBusca {
  /** Quantas vezes cada alimento aparece nos planos desta conta (D-370, item 2). */
  readonly uso?: ReadonlyMap<number, number>
}

/** O alimento próprio conta como usado: se ela cadastrou, é porque usa (D-370). */
const usoDe = (alimento: Alimento, uso: ReadonlyMap<number, number> | undefined): number =>
  (uso?.get(alimento.id) ?? 0) + (alimento.id >= PRIMEIRO_ID_PROPRIO ? 1 : 0)

/** Os alimentos com todas as palavras, na ordem de relevância da D-370 (sem a medida, que só a entrada conhece). */
export function porRelevancia(termos: readonly string[], alimentos: readonly Alimento[], opcoes: OpcoesBusca = {}): readonly Alimento[] {
  return candidatosDaBusca(termos, alimentos, opcoes, () => true).map((c) => c.i.alimento)
}

interface Candidato {
  readonly i: Indice
  readonly temMedida: boolean
  readonly comeca: boolean
  readonly uso: number
}

function candidatosDaBusca(
  termos: readonly string[],
  alimentos: readonly Alimento[],
  opcoes: OpcoesBusca,
  temMedida: (alimento: Alimento) => boolean,
): readonly Candidato[] {
  const variantes = termos.map(variantesDoTermo)
  const primeiro = variantes[0] ?? []
  return indexar(alimentos)
    .filter((i) => variantes.every((vs) => vs.some((v) => i.texto.includes(v))))
    .map((i) => ({ i, temMedida: temMedida(i.alimento), comeca: primeiro.some((v) => i.texto.startsWith(v)), uso: usoDe(i.alimento, opcoes.uso) }))
    .sort(
      (a, b) =>
        Number(b.temMedida) - Number(a.temMedida) ||
        b.uso - a.uso ||
        Number(a.i.cruIngrediente) - Number(b.i.cruIngrediente) ||
        Number(b.comeca) - Number(a.comeca) ||
        Number(b.i.usoComum) - Number(a.i.usoComum) ||
        a.i.classe - b.i.classe ||
        a.i.consumo - b.i.consumo ||
        a.i.virgulas - b.i.virgulas ||
        a.i.texto.length - b.i.texto.length,
    )
}

const arredondar = (g: number): number => Math.round(g * 10) / 10

/** O que a entrada quer dizer para este alimento: a medida dele, as unidades (D-371) ou os gramas. */
function lerParaOAlimento(lida: InterpretacaoEntrada, alimento: Alimento): Omit<ResultadoBusca, 'alimento'> {
  const unidade: UnidadeDoAlimento = lida.unidade === 'ml' ? 'ml' : unidadeDo(alimento)
  if (lida.medida !== null) {
    const m = medidaPedida(alimento.id, lida.medida)
    if (!m) {
      // D-432: o aviso diz o que falta e o que há; "+ Nova medida" cria a que falta com a quantidade digitada.
      const nome = MEDIDAS_CURTAS[lida.medida]?.[0] ?? lida.medida
      return { gramas: null, medida: null, unidade, aviso: avisoSemMedida(alimento, nome, unidade), faltaMedida: { nome, quantidade: lida.quantidade ?? 1 } }
    }
    const q = lida.quantidade ?? 1
    return { gramas: arredondar(q * m.gramas), medida: { nome: m.nome, quantidade: q, gramasPorMedida: m.gramas }, unidade, aviso: null }
  }
  if (lida.unidade === null && lida.quantidade !== null && lida.quantidade < LIMITE_DE_UNIDADES) {
    const m = medidaDeContar(alimento.id)
    if (m) return { gramas: arredondar(lida.quantidade * m.gramas), medida: { nome: m.nome, quantidade: lida.quantidade, gramasPorMedida: m.gramas }, unidade, aviso: null }
    // CA-1258: fruta sem a unidade na base não vira 1 g: pede gramas ou a medida.
    if (ehFruta(alimento.id)) {
      return { gramas: null, medida: null, unidade, aviso: avisoSemMedida(alimento, 'unidade', unidade), faltaMedida: { nome: 'unidade', quantidade: lida.quantidade } }
    }
  }
  // D-433: sem quantidade, o alimento próprio entra pela porção do rótulo ("4 colheres de sopa · 40 g"), não por 100 g.
  const porcao = alimento.porcaoPadrao
  if (lida.quantidade === null && lida.unidade === null && porcao) {
    return { gramas: arredondar(porcao.quantidade * porcao.gramasPorMedida), medida: { ...porcao }, unidade, aviso: null }
  }
  return { gramas: lida.quantidade ?? GRAMAS_PADRAO, medida: null, unidade, aviso: null }
}

/** Gema e clara, como a pessoa escreve ("gemas", "claras") e como a TACO descreve ("Ovo, de galinha, gema"). */
const PARTE_DO_OVO = /^(gema|clara)s?$/
const PARTE_DO_OVO_NA_DESCRICAO = /^ovo, [^,]+, (gema|clara)/

export function buscarAlimentos(
  texto: string,
  alimentos: readonly Alimento[],
  opcoes: OpcoesBusca = {},
): { readonly resultados: readonly ResultadoBusca[]; readonly aviso: string | null } {
  const lida = interpretarEntrada(texto)
  const termos = lida.termos.filter((t) => t.length > 1 || /\d/.test(t))
  if (termos.length === 0) return { resultados: [], aviso: null }

  const pedida = lida.medida
  // D-482 (correção C): gema e clara são partes do ovo; só aparecem quando a busca as nomeia ("2 ovos" é o ovo inteiro).
  const nomeiaParte = termos.some((t) => PARTE_DO_OVO.test(t))
  const candidatos = candidatosDaBusca(termos, alimentos, opcoes, (a) => pedida === null || medidaPedida(a.id, pedida) !== null)
    .filter(({ i }) => nomeiaParte || !PARTE_DO_OVO_NA_DESCRICAO.test(i.texto))
    .slice(0, LIMITE_RESULTADOS)
  if (candidatos.length === 0) {
    return { resultados: [], aviso: 'Nenhum alimento encontrado com esse nome. Tente outra palavra ou menos letras.' }
  }
  return { resultados: candidatos.map(({ i }) => ({ alimento: i.alimento, ...lerParaOAlimento(lida, i.alimento) })), aviso: null }
}

/**
 * D-373: a leitura do resultado como a folha escreve, sem as kcal: "1 unidade · 75 g", "1 concha e meia · 210 g",
 * "200 ml". `null` quando a medida não existe para o alimento.
 */
export function leituraDoResultado(r: Pick<ResultadoBusca, 'gramas' | 'medida' | 'unidade'>): string | null {
  if (r.gramas === null) return null
  const peso = `${formatarPeso(r.gramas)} ${r.unidade}`
  return r.medida ? `${formatarQuantidadeMedida(r.medida.quantidade, r.medida.nome)} · ${peso}` : peso
}

/** "150", "37,5": o peso com no máximo uma casa, vírgula decimal. */
export function formatarPeso(gramas: number): string {
  const arredondado = Math.round(gramas * 10) / 10
  return Number.isInteger(arredondado) ? String(arredondado) : String(arredondado).replace('.', ',')
}
