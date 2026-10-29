// O catálogo de rótulos do Open Food Facts chega sob demanda (spec base-ampliada, fase 2, D-753 e D-758): o índice de
// nomes na primeira busca com 3 letras, e cada fatia quando um produto é escolhido. Os arquivos ficam em
// public/catalogo-off/<versão>/, são pedidos por fetch (que, ao contrário do import(), não guarda a falha: o próximo
// pedido tenta de novo) e guardados pelo service worker sob demanda.
import fonte from '@/data/catalogo-off-fonte.json'
import {
  decodificarFatia,
  decodificarIndice,
  fatiaDoCodigo,
  rotuloDoCatalogo,
  type ArquivoFatia,
  type ArquivoIndice,
  type DetalheDoProduto,
  type IndiceDoCatalogo,
  type ProdutoDoIndice,
} from '@/domain/catalogoOff.ts'
import { buscarRotuloPorCodigo, type RotuloEncontrado } from '@/domain/codigoBarras.ts'

export type EstadoDoCatalogo = 'parado' | 'carregando' | 'pronto' | 'erro'

type BuscarArquivo = (caminho: string) => Promise<unknown>

export const VERSAO_DO_CATALOGO: string = fonte.versao
/** Quantos produtos o catálogo publicado tem (página Fontes). */
export const PRODUTOS_NO_CATALOGO: number = fonte.produtos

const doServidor: BuscarArquivo = async (caminho) => {
  const resposta = await fetch(new URL(caminho, document.baseURI))
  if (!resposta.ok) throw new Error(`O catálogo respondeu ${resposta.status}.`)
  return resposta.json()
}

let buscarArquivo: BuscarArquivo = doServidor
let automatico = true
let estado: EstadoDoCatalogo = 'parado'
let indice: IndiceDoCatalogo | null = null
let porCodigo: ReadonlyMap<string, ProdutoDoIndice> = new Map()
let versao = 0
let pendente: Promise<void> | null = null
const fatias = new Map<string, Promise<ReadonlyMap<string, DetalheDoProduto>>>()
const ouvintes = new Set<() => void>()

const caminho = (arquivo: string): string => `${fonte.caminho}${arquivo}`

function mudar(novo: EstadoDoCatalogo): void {
  estado = novo
  versao += 1
  for (const ouvinte of ouvintes) ouvinte()
}

/** Pede o índice uma vez; com erro (ou arquivo estragado), o próximo pedido tenta de novo (CB-750). */
export function carregarIndiceDoCatalogo(): Promise<void> {
  if (estado === 'pronto') return Promise.resolve()
  if (pendente) return pendente
  mudar('carregando')
  pendente = buscarArquivo(caminho('indice.json'))
    // O JSON vem do script; a forma é conferida em src/data/catalogo-off.test.ts.
    .then((arquivo) => decodificarIndice(arquivo as ArquivoIndice))
    .then(
      (decodificado) => {
        indice = decodificado
        porCodigo = new Map(decodificado.produtos.map((p) => [p.produto.codigo, p.produto]))
        pendente = null
        mudar('pronto')
      },
      () => {
        pendente = null
        mudar('erro')
      },
    )
  return pendente
}

export const estadoDoCatalogo = (): EstadoDoCatalogo => estado
export const indiceDoCatalogo = (): IndiceDoCatalogo | null => indice
export const versaoDoCatalogo = (): number => versao
export const carregamentoAutomaticoDoCatalogo = (): boolean => automatico

export function inscreverNoCatalogo(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

/** A fatia do código, pedida uma vez; a que falha sai da memória, para o próximo pedido tentar de novo (CB-751). */
function fatia(nn: string): Promise<ReadonlyMap<string, DetalheDoProduto>> {
  const guardada = fatias.get(nn)
  if (guardada) return guardada
  const pedido = buscarArquivo(caminho(`fatias/${nn}.json`)).then((arquivo) => decodificarFatia(arquivo as ArquivoFatia))
  fatias.set(nn, pedido)
  pedido.catch(() => fatias.delete(nn))
  return pedido
}

/** Os valores por 100 e os alergênicos do produto (D-761); rejeita se a fatia não vem ou se o produto não está nela. */
export async function detalheDoProdutoDoCatalogo(p: ProdutoDoIndice): Promise<DetalheDoProduto> {
  const detalhe = (await fatia(fatiaDoCodigo(p.codigo))).get(p.codigo)
  if (!detalhe) throw new Error(`O produto ${p.codigo} não está na fatia do catálogo.`)
  return detalhe
}

/** D-759: o código de barras no catálogo, como a leitura ao vivo devolve; `null` quando o catálogo não tem. */
export async function rotuloDoCatalogoPorCodigo(codigo: string): Promise<RotuloEncontrado | null> {
  const digitos = codigo.replace(/\D/g, '')
  await carregarIndiceDoCatalogo()
  const p = porCodigo.get(digitos)
  if (!p) return null
  return rotuloDoCatalogo(p, await detalheDoProdutoDoCatalogo(p), VERSAO_DO_CATALOGO)
}

/**
 * D-759 (CA-1762): o código lido no cadastro procura primeiro no catálogo; sem ele (fora do catálogo, sem rede ou com o
 * arquivo estragado), no Open Food Facts ao vivo, como antes.
 */
export async function procurarRotulo(codigo: string, aoVivo: (codigo: string) => Promise<RotuloEncontrado | null> = buscarRotuloPorCodigo): Promise<RotuloEncontrado | null> {
  try {
    const doCatalogo = await rotuloDoCatalogoPorCodigo(codigo)
    if (doCatalogo) return doCatalogo
  } catch {
    // A fatia não veio: o OFF ao vivo responde.
  }
  return aoVivo(codigo)
}

/** Só para teste: volta ao começo, com outro servidor e com o carregamento automático ligado ou não. */
export function prepararCatalogoParaTeste(opcoes: { readonly buscar?: BuscarArquivo; readonly automatico?: boolean }): void {
  buscarArquivo = opcoes.buscar ?? doServidor
  automatico = opcoes.automatico ?? true
  estado = 'parado'
  indice = null
  porCodigo = new Map()
  pendente = null
  fatias.clear()
  versao += 1
}
