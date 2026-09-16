// Código de barras do produto: validação do EAN e leitura do rótulo em base pública.
import type { ChaveNutrienteAlimento } from './tipos.ts'

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
  readonly porcaoG: number | null
  readonly medidaCaseira: string
  readonly porPorcao: Readonly<Partial<Record<ChaveNutrienteAlimento, number | null>>>
  readonly fonte: string
}

interface ProdutoOpenFoodFacts {
  readonly product_name?: string
  readonly product_name_pt?: string
  readonly brands?: string
  readonly serving_size?: string
  readonly serving_quantity?: number | string
  readonly nutriments?: Record<string, number | string | undefined>
}

const numero = (v: number | string | undefined): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Converte os nutrientes da Open Food Facts (por 100 g) para a porção declarada. */
function nutrientesDaPorcao(n: Record<string, number | string | undefined>, porcaoG: number | null) {
  const fator = porcaoG && porcaoG > 0 ? porcaoG / 100 : 1
  const porCem = (chave: string) => numero(n[`${chave}_100g`])
  const escalar = (v: number | null) => (v === null ? null : Math.round(v * fator * 100) / 100)
  return {
    energia_kcal: escalar(porCem('energy-kcal') ?? (numero(n['energy_100g']) === null ? null : (numero(n['energy_100g']) ?? 0) / 4.184)),
    carboidrato_g: escalar(porCem('carbohydrates')),
    acucares_g: escalar(porCem('sugars')),
    proteina_g: escalar(porCem('proteins')),
    lipideos_g: escalar(porCem('fat')),
    gordura_saturada_g: escalar(porCem('saturated-fat')),
    fibra_g: escalar(porCem('fiber')),
    sodio_mg: escalar(porCem('sodium') === null ? null : (porCem('sodium') ?? 0) * 1000),
    calcio_mg: escalar(porCem('calcium') === null ? null : (porCem('calcium') ?? 0) * 1000),
    ferro_mg: escalar(porCem('iron') === null ? null : (porCem('iron') ?? 0) * 1000),
  }
}

export interface OpcoesBusca {
  readonly buscar?: typeof fetch
  readonly sinal?: AbortSignal
}

/**
 * Procura o produto pelo código na Open Food Facts, base colaborativa e aberta.
 * Devolve `null` quando não encontra. Só funciona com internet; offline, o cadastro é manual.
 */
export async function buscarRotuloPorCodigo(codigo: string, opcoes: OpcoesBusca = {}): Promise<RotuloEncontrado | null> {
  const digitos = codigo.replace(/\D/g, '')
  if (digitos === '') return null
  const buscar = opcoes.buscar ?? fetch
  const url = `https://world.openfoodfacts.org/api/v2/product/${digitos}.json?fields=product_name,product_name_pt,brands,serving_size,serving_quantity,nutriments`

  const resposta = await buscar(url, opcoes.sinal ? { signal: opcoes.sinal } : {})
  if (!resposta.ok) return null
  const corpo = (await resposta.json()) as { readonly status?: number; readonly product?: ProdutoOpenFoodFacts }
  if (corpo.status !== 1 || !corpo.product) return null

  const p = corpo.product
  const porcaoG = numero(p.serving_quantity)
  const nome = (p.product_name_pt ?? p.product_name ?? '').trim()
  return {
    codigo: digitos,
    nome,
    marca: (p.brands ?? '').split(',')[0]?.trim() ?? '',
    porcaoG,
    medidaCaseira: (p.serving_size ?? '').trim(),
    porPorcao: nutrientesDaPorcao(p.nutriments ?? {}, porcaoG),
    fonte: 'Open Food Facts',
  }
}

/** A câmera só é oferecida quando o navegador sabe ler código de barras sozinho. */
export function navegadorLeCodigoBarras(): boolean {
  return typeof globalThis !== 'undefined' && 'BarcodeDetector' in globalThis
}
