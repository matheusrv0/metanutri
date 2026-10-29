// Código de barras do produto: validação do EAN e leitura do rótulo em base pública.
import tabelaDoOff from '../data/off-nutrientes.json'
import { CONTATO_EMAIL } from './legal.ts'
import type { AlergenicosDoRotulo, ChaveNutrienteAlimento } from './tipos.ts'

/** Confere o dígito verificador de EAN-8, EAN-13 ou UPC-A. */
export function ehCodigoValido(codigo: string): boolean {
  const digitos = codigo.replace(/\D/g, '')
  if (![8, 12, 13, 14].includes(digitos.length)) return false
  const numeros = [...digitos].map(Number)
  const verificador = numeros.pop()
  if (verificador === undefined) return false
  // Da direita para a esquerda, alternando peso 3 e 1.
  const soma = numeros.reverse().reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (soma % 10)) % 10 === verificador
}

export interface RotuloEncontrado {
  readonly codigo: string
  readonly nome: string
  readonly marca: string
  /**
   * Os valores por 100 g ou 100 ml, como a Open Food Facts publica (spec alimentos-e-gramaturas, A13 e D-382). Nunca são
   * reescalados para uma porção: a porção do rótulo vira só a medida. `null` = a base não tem o valor.
   */
  readonly por100: Readonly<Partial<Record<ChaveNutrienteAlimento, number | null>>>
  /** A porção declarada, quando a base tem: "30 g", com o peso. */
  readonly porcao: { readonly gramas: number; readonly texto: string } | null
  /** Produto medido em ml (bebida, leite) ou em g (A23). */
  readonly unidade: 'g' | 'ml'
  readonly fonte: string
  /** D-761: os alergênicos do rótulo, quando vêm do catálogo de rótulos. */
  readonly alergenicos?: AlergenicosDoRotulo
}

interface ProdutoOpenFoodFacts {
  readonly product_name?: string
  readonly product_name_pt?: string
  readonly brands?: string
  readonly quantity?: string
  readonly serving_size?: string
  readonly serving_quantity?: number | string
  readonly serving_quantity_unit?: string
  readonly nutrition_data_per?: string
  readonly nutriments?: Record<string, number | string | undefined>
}

/** Número da base; texto, negativo ou NaN viram nulo (CB-369). */
const numero = (v: number | string | undefined): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : Number.NaN
  return Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * Os nutrientes da Open Food Facts, por 100 g, na unidade da adequação (A14): a OFF guarda minerais e vitaminas em
 * gramas. O folato da OFF vai como está para o folato DFE: é a melhor aproximação que o rótulo dá. A tabela vive em
 * `src/data/off-nutrientes.json`, a mesma que o script do catálogo de rótulos lê (spec base-ampliada, fase 2, D-751).
 */
export const NUTRIENTES_DA_OFF: readonly { readonly chave: string; readonly off: string; readonly fator: number }[] = tabelaDoOff
const DA_OFF = NUTRIENTES_DA_OFF as readonly { readonly chave: ChaveNutrienteAlimento; readonly off: string; readonly fator: number }[]

const arredondar = (v: number): number => Math.round(v * 1000) / 1000

/** Os valores por 100 g ou 100 ml. Sem sódio, o sódio sai do sal (÷ 2,5); sem kcal, da energia em kJ (÷ 4,184). */
export function nutrientesPor100(n: Record<string, number | string | undefined>): Partial<Record<ChaveNutrienteAlimento, number | null>> {
  const porCem = (chave: string) => numero(n[`${chave}_100g`])
  const valores: Partial<Record<ChaveNutrienteAlimento, number | null>> = {}
  const kcal = porCem('energy-kcal')
  const kj = porCem('energy')
  valores.energia_kcal = kcal ?? (kj === null ? null : arredondar(kj / 4.184))
  for (const { chave, off, fator } of DA_OFF) {
    const v = porCem(off)
    valores[chave] = v === null ? null : arredondar(v * fator)
  }
  const sodio = porCem('sodium')
  const sal = porCem('salt')
  valores.sodio_mg = sodio !== null ? arredondar(sodio * 1000) : sal !== null ? arredondar((sal / 2.5) * 1000) : null
  return valores
}

/** "ml" quando a OFF diz que a porção ou a embalagem é em ml ou litro (A23). */
function unidadeDo(p: ProdutoOpenFoodFacts): 'g' | 'ml' {
  if (p.nutrition_data_per === '100ml' || p.serving_quantity_unit?.toLowerCase() === 'ml') return 'ml'
  return /\d\s*(ml|l|litros?)\b/i.test(p.quantity ?? '') ? 'ml' : 'g'
}

export interface OpcoesBusca {
  readonly buscar?: typeof fetch
  readonly sinal?: AbortSignal
}

/**
 * Como o MetaNutri se apresenta à Open Food Facts, que pede "App/Versão (email)" (A25). O navegador não deixa trocar o
 * User-Agent; a OFF aceita o `X-User-Agent`.
 */
export const IDENTIFICACAO_OFF = `MetaNutri/1.0 (${CONTATO_EMAIL ?? 'metanutri.com.br'})`

/**
 * Procura o produto pelo código na Open Food Facts, base colaborativa e aberta.
 * Devolve `null` quando não encontra. Só funciona com internet; offline, o cadastro é manual.
 */
export async function buscarRotuloPorCodigo(codigo: string, opcoes: OpcoesBusca = {}): Promise<RotuloEncontrado | null> {
  const digitos = codigo.replace(/\D/g, '')
  if (digitos === '') return null
  const buscar = opcoes.buscar ?? fetch
  const campos = 'product_name,product_name_pt,brands,quantity,serving_size,serving_quantity,serving_quantity_unit,nutrition_data_per,nutriments'
  const url = `https://world.openfoodfacts.org/api/v2/product/${digitos}.json?fields=${campos}`

  const resposta = await buscar(url, { headers: { 'X-User-Agent': IDENTIFICACAO_OFF }, ...(opcoes.sinal ? { signal: opcoes.sinal } : {}) })
  if (!resposta.ok) return null
  const corpo = (await resposta.json()) as { readonly status?: number; readonly product?: ProdutoOpenFoodFacts }
  if (corpo.status !== 1 || !corpo.product) return null

  const p = corpo.product
  const gramasDaPorcao = numero(p.serving_quantity)
  const unidade = unidadeDo(p)
  const nome = (p.product_name_pt ?? p.product_name ?? '').trim()
  return {
    codigo: digitos,
    nome,
    marca: (p.brands ?? '').split(',')[0]?.trim() ?? '',
    por100: nutrientesPor100(p.nutriments ?? {}),
    porcao: gramasDaPorcao !== null && gramasDaPorcao > 0 ? { gramas: Math.round(gramasDaPorcao * 10) / 10, texto: (p.serving_size ?? '').trim() } : null,
    unidade,
    fonte: 'Open Food Facts',
  }
}

/** A câmera só é oferecida quando o navegador sabe ler código de barras sozinho. */
export function navegadorLeCodigoBarras(): boolean {
  return typeof globalThis !== 'undefined' && 'BarcodeDetector' in globalThis
}
