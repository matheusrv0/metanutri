// Entrada rápida de alimentos (SPEC CA-15 a CA-18, CA-20, CA-21, CB-07).
import tabelaMedidas from '../data/medidas-caseiras.json'
import type { Alimento } from './tipos.ts'

export interface MedidaCaseira {
  readonly nome: string
  readonly gramas: number
}

const MEDIDAS_POR_ALIMENTO = new Map<number, readonly MedidaCaseira[]>(
  Object.entries(tabelaMedidas.alimentos as Record<string, { medidas: MedidaCaseira[] }>).map(([id, r]) => [Number(id), r.medidas]),
)

export function medidasDoAlimento(alimentoId: number): readonly MedidaCaseira[] {
  return MEDIDAS_POR_ALIMENTO.get(alimentoId) ?? []
}

/** Medidas mais legíveis num plano, em ordem de preferência; medidas vagas ("porção", "prato") ficam de fora. */
const PREFERENCIA_MEDIDAS = [
  'unidade',
  'fatia',
  'bife',
  'filé',
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

const FEMININOS = new Set(['unidade', 'fatia', 'colher', 'concha', 'xícara', 'escumadeira', 'banda', 'metade', 'rodela', 'posta', 'coxa', 'sobrecoxa', 'folha', 'espiga'])

function plural(nome: string): string {
  const [primeira = '', ...resto] = nome.split(' ')
  const p = (w: string) =>
    w.endsWith('ão') ? `${w.slice(0, -2)}ões` : /[rz]$/.test(w) ? `${w}es` : w.endsWith('l') ? `${w.slice(0, -1)}is` : `${w}s`
  // adjetivo logo depois do substantivo concorda ("unidades pequenas", "copos americanos"); "de ..." fica igual
  const [segunda, ...demais] = resto
  const adjetivo = segunda && segunda !== 'de' ? [p(segunda), ...demais] : resto
  return [p(primeira), ...adjetivo].join(' ')
}

export function formatarQuantidadeMedida(quantidade: number, medida: string): string {
  const feminino = FEMININOS.has(medida.split(' ')[0] ?? '')
  const meia = feminino ? 'meia' : 'meio'
  const inteiro = Math.floor(quantidade)
  const temMeia = quantidade - inteiro === 0.5
  if (inteiro === 0 && temMeia) return `${meia} ${medida}`
  const nome = inteiro >= 2 ? plural(medida) : medida
  // "1 concha e meia", "2 fatias e meia"
  return temMeia ? `${inteiro} ${nome} e ${meia}` : `${inteiro} ${nome}`
}

export interface MedidaEquivalente {
  readonly medida: string
  readonly quantidade: number
  readonly texto: string
  readonly gramasEquivalentes: number
}

/** CA-19: gramas expressas na medida caseira mais legível do alimento, em passos de meia medida. */
export function medidaEquivalente(alimentoId: number, gramas: number): MedidaEquivalente | null {
  if (!(gramas > 0)) return null
  let melhor: { m: MedidaCaseira; q: number; pontos: number } | null = null
  for (const m of medidasDoAlimento(alimentoId)) {
    const preferencia = PREFERENCIA_MEDIDAS.indexOf(m.nome)
    if (preferencia < 0) continue
    const q = Math.max(0.5, Math.round((gramas / m.gramas) * 2) / 2)
    if (q > QUANTIDADE_MAXIMA) continue
    const erro = Math.abs(q * m.gramas - gramas) / gramas
    if (erro > ERRO_MAXIMO) continue
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

/** Nomes de medidas conhecidos, das mais longas para as mais curtas (para casar "colher de sopa" antes de "colher"). */
export const MEDIDAS: readonly string[] = [...new Set([...MEDIDAS_POR_ALIMENTO.values()].flat().map((m) => m.nome))].sort(
  (a, b) => b.length - a.length,
)

export const GRAMAS_PADRAO = 100
export const LIMITE_RESULTADOS = 5

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

const PADROES_MEDIDA = MEDIDAS.map((nome) => {
  const [primeira = '', ...resto] = normalizar(nome).split(' ')
  const inicio = `(?:${variantesPlural(primeira).map(escapar).join('|')})`
  const fim = resto.length ? ` ${resto.map(escapar).join(' ')}` : ''
  return { nome, re: new RegExp(`^${inicio}${fim}(?:\\s+de)?(?=\\s|$)`) }
})

export interface InterpretacaoEntrada {
  readonly quantidade: number | null
  readonly medida: string | null
  readonly termos: readonly string[]
}

function lerQuantidade(texto: string): { valor: number; resto: string } | null {
  const m = texto.match(/^(\d+)\s*\/\s*(\d+)(?=\s|[a-z]|$)|^(\d+(?:[.,]\d+)?)(?=\s|[a-z]|$)/)
  if (!m) return null
  const valor = m[1] && m[2] ? Number(m[1]) / Number(m[2]) : Number((m[3] ?? '').replace(',', '.'))
  if (!Number.isFinite(valor)) return null
  return { valor, resto: texto.slice(m[0].length).trim() }
}

export function interpretarEntrada(texto: string): InterpretacaoEntrada {
  let resto = normalizar(texto).trim().replace(/\s+/g, ' ')
  let quantidade: number | null = null
  const q = lerQuantidade(resto)
  if (q) {
    quantidade = q.valor
    resto = q.resto
  }

  let medida: string | null = null
  const gramas = resto.match(/^(?:g|gr|grama|gramas)(?:\s+de)?(?=\s|$)/)
  if (gramas) {
    resto = resto.slice(gramas[0].length).trim()
  } else {
    for (const p of PADROES_MEDIDA) {
      const m = resto.match(p.re)
      if (m) {
        medida = p.nome
        resto = resto.slice(m[0].length).trim()
        if (quantidade === null) quantidade = 1
        break
      }
    }
  }

  const termos = resto.split(' ').filter((t) => t !== '' && t !== 'de')
  return { quantidade, medida, termos }
}

export interface ResultadoBusca {
  readonly alimento: Alimento
  /** Gramas a adicionar; `null` quando a medida digitada não existe para este alimento (CB-07). */
  readonly gramas: number | null
  readonly medida: { readonly nome: string; readonly quantidade: number; readonly gramasPorMedida: number } | null
  readonly aviso: string | null
}

interface Indice {
  readonly alimento: Alimento
  readonly texto: string
}

const indices = new WeakMap<readonly Alimento[], readonly Indice[]>()
function indexar(alimentos: readonly Alimento[]): readonly Indice[] {
  let i = indices.get(alimentos)
  if (!i) {
    i = alimentos.map((alimento) => ({ alimento, texto: normalizar(alimento.descricao) }))
    indices.set(alimentos, i)
  }
  return i
}

export function buscarAlimentos(texto: string, alimentos: readonly Alimento[]): { readonly resultados: readonly ResultadoBusca[]; readonly aviso: string | null } {
  const { quantidade, medida, termos } = interpretarEntrada(texto)
  if (termos.length === 0) return { resultados: [], aviso: null }

  const primeiro = termos[0] ?? ''
  const candidatos = indexar(alimentos)
    .filter((i) => termos.every((t) => i.texto.includes(t)))
    .map((i) => {
      const medidaDoAlimento = medida ? medidasDoAlimento(i.alimento.id).find((m) => m.nome === medida) : undefined
      return {
        i,
        temMedida: medida === null || medidaDoAlimento !== undefined,
        medidaDoAlimento,
        comeca: i.texto.startsWith(primeiro),
        virgulas: i.texto.split(',').length,
      }
    })
    .sort(
      (a, b) =>
        Number(b.temMedida) - Number(a.temMedida) ||
        Number(b.comeca) - Number(a.comeca) ||
        a.virgulas - b.virgulas ||
        a.i.texto.length - b.i.texto.length,
    )
    .slice(0, LIMITE_RESULTADOS)

  if (candidatos.length === 0) {
    return { resultados: [], aviso: 'Nenhum alimento encontrado com esse nome. Tente outra palavra ou menos letras.' }
  }

  const resultados = candidatos.map(({ i, medidaDoAlimento }): ResultadoBusca => {
    if (medida === null) {
      return { alimento: i.alimento, gramas: quantidade ?? GRAMAS_PADRAO, medida: null, aviso: null }
    }
    if (!medidaDoAlimento) {
      return {
        alimento: i.alimento,
        gramas: null,
        medida: null,
        aviso: `A medida "${medida}" não está cadastrada para ${i.alimento.descricao}; informe a quantidade em gramas.`,
      }
    }
    const qtd = quantidade ?? 1
    return {
      alimento: i.alimento,
      gramas: Math.round(qtd * medidaDoAlimento.gramas * 10) / 10,
      medida: { nome: medida, quantidade: qtd, gramasPorMedida: medidaDoAlimento.gramas },
      aviso: null,
    }
  })

  return { resultados, aviso: null }
}
