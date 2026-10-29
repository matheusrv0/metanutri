// O catálogo de rótulos do Open Food Facts no app (spec base-ampliada, fase 2): o índice de nomes e as fatias que o
// script publica em public/catalogo-off/<versão>/, a busca sem acento e com tolerância a erro, e a cópia em Meus
// alimentos que entra no plano. Os arquivos chegam pela interface (`src/ui/estado/catalogoOff.ts`).
import { dadosEmBranco } from './alimentoProprio.ts'
import { interpretarEntrada } from './busca.ts'
import type { RotuloEncontrado } from './codigoBarras.ts'
import type { DadosAlimentoProprio, Produto } from './produtos.ts'
import { CHAVES_NUTRIENTES } from './totais.ts'
import type { AlergenicosDoRotulo, Alimento, ChaveNutrienteAlimento, IdAlergenico } from './tipos.ts'

export interface ArquivoIndice {
  readonly versao: string
  readonly campos: readonly string[]
  /** [código, nome, marca, porção em g ou ml, texto da porção, 1 se ml, kcal por 100]. */
  readonly produtos: readonly (readonly [string, string, string, number | null, string, number, number])[]
}

export interface ArquivoFatia {
  readonly chaves: readonly string[]
  /** D-761: a ordem dos bits de "contém" e "pode conter", que vêm depois dos valores de cada produto. */
  readonly alergenicos?: readonly string[]
  readonly produtos: Readonly<Record<string, readonly (number | null)[]>>
}

export type ValoresDoRotulo = Partial<Record<ChaveNutrienteAlimento, number | null>>

/** O que a fatia diz do produto: os valores por 100 e os alergênicos do rótulo (D-761). */
export interface DetalheDoProduto {
  readonly valores: ValoresDoRotulo
  readonly alergenicos: AlergenicosDoRotulo
}

export interface ProdutoDoIndice {
  readonly codigo: string
  readonly nome: string
  readonly marca: string
  readonly porcaoG: number | null
  readonly porcaoTexto: string
  readonly unidade: 'g' | 'ml'
  readonly kcal: number
}

interface ProdutoIndexado {
  readonly produto: ProdutoDoIndice
  readonly palavras: readonly string[]
  readonly primeira: string
}

export interface IndiceDoCatalogo {
  readonly versao: string
  readonly produtos: readonly ProdutoIndexado[]
}

/** Sem acento, em minúscula, sem pontuação: as palavras do nome. */
const palavrasDe = (s: string): string[] =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter((p) => p !== '')

export function decodificarIndice(arquivo: ArquivoIndice): IndiceDoCatalogo {
  return {
    versao: arquivo.versao,
    produtos: arquivo.produtos.map(([codigo, nome, marca, porcaoG, porcaoTexto, ml, kcal]) => {
      const doNome = palavrasDe(nome)
      return {
        produto: { codigo, nome, marca, porcaoG, porcaoTexto, unidade: ml === 1 ? 'ml' : 'g', kcal },
        palavras: [...doNome, ...palavrasDe(marca)],
        primeira: doNome[0] ?? '',
      }
    }),
  }
}

/** Distância de edição até 1 (troca, falta ou sobra de uma letra), sem calcular a matriz inteira. */
function quaseIgual(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let erros = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1
      j += 1
      continue
    }
    erros += 1
    if (erros > 1) return false
    if (a.length > b.length) i += 1
    else if (b.length > a.length) j += 1
    else {
      i += 1
      j += 1
    }
  }
  return erros + (a.length - i) + (b.length - j) <= 1
}

/** O termo casa a palavra pelo começo; com 5 letras ou mais, também com uma letra errada (D-758). */
function casaPalavra(termo: string, palavra: string): boolean {
  if (palavra.startsWith(termo)) return true
  if (termo.length < 5) return false
  return quaseIgual(termo, palavra) || quaseIgual(termo, palavra.slice(0, termo.length))
}

export const LIMITE_DO_CATALOGO = 5
/** CB-753: o catálogo só é consultado com 3 letras ou mais. */
export const LETRAS_PARA_O_CATALOGO = 3

/**
 * Os termos da busca, sem a quantidade e a medida, como a entrada rápida lê (D-758). O número que sobra é do nome
 * ("Nescau 2.0") e também precisa casar.
 */
export function termosDaBusca(texto: string): readonly string[] {
  return interpretarEntrada(texto).termos.flatMap(palavrasDe)
}

/** CB-753: só as letras contam para o mínimo. */
export const letrasDaBusca = (texto: string): number => termosDaBusca(texto).join('').replace(/\d/g, '').length

export function buscarNoCatalogo(indice: IndiceDoCatalogo, texto: string, limite = LIMITE_DO_CATALOGO): readonly ProdutoDoIndice[] {
  const termos = termosDaBusca(texto)
  if (letrasDaBusca(texto) < LETRAS_PARA_O_CATALOGO) return []
  const achados: { readonly p: ProdutoIndexado; readonly exatos: number }[] = []
  for (const p of indice.produtos) {
    let exatos = 0
    let casaTodos = true
    for (const termo of termos) {
      if (p.palavras.some((palavra) => palavra.startsWith(termo))) exatos += 1
      else if (!p.palavras.some((palavra) => casaPalavra(termo, palavra))) {
        casaTodos = false
        break
      }
    }
    if (casaTodos) achados.push({ p, exatos })
  }
  const primeiro = termos[0] ?? ''
  return achados
    .sort(
      (a, b) =>
        Number(!a.p.primeira.startsWith(primeiro)) - Number(!b.p.primeira.startsWith(primeiro)) ||
        b.exatos - a.exatos ||
        // D-764: o produto com marca vem antes do genérico sem marca.
        Number(a.p.produto.marca === '') - Number(b.p.produto.marca === '') ||
        a.p.produto.nome.length - b.p.produto.nome.length ||
        a.p.produto.nome.localeCompare(b.p.produto.nome, 'pt-BR') ||
        a.p.produto.marca.localeCompare(b.p.produto.marca, 'pt-BR'),
    )
    .slice(0, limite)
    .map((a) => a.p.produto)
}

/** D-753: a fatia é a dos dois últimos dígitos do código. */
export const fatiaDoCodigo = (codigo: string): string => codigo.slice(-2)

export function decodificarFatia(arquivo: ArquivoFatia): ReadonlyMap<string, DetalheDoProduto> {
  const chaves = arquivo.chaves as readonly ChaveNutrienteAlimento[]
  const nomes = (arquivo.alergenicos ?? []) as readonly IdAlergenico[]
  const daMascara = (m: number | null | undefined): readonly IdAlergenico[] => nomes.filter((_, i) => ((m ?? 0) & (1 << i)) !== 0)
  return new Map(
    Object.entries(arquivo.produtos).map(([codigo, linha]) => {
      const [contem, podeConter, semInformacao, semGluten] = linha.slice(chaves.length)
      return [
        codigo,
        {
          valores: Object.fromEntries(chaves.map((c, i) => [c, linha[i] ?? null])),
          // Sem as marcas (arquivo antigo), o produto fica sem informação: a restrição pede a embalagem.
          alergenicos: {
            contem: daMascara(contem),
            podeConter: daMascara(podeConter),
            semInformacao: semInformacao === undefined || semInformacao === 1,
            ...(semGluten === 1 ? { semGlutenNoRotulo: true } : {}),
          },
        },
      ]
    }),
  )
}

/** O produto do catálogo na forma da leitura ao vivo (`RotuloEncontrado`), para a cópia e para o código de barras. */
export function rotuloDoCatalogo(p: ProdutoDoIndice, detalhe: DetalheDoProduto, versao: string): RotuloEncontrado {
  const { valores } = detalhe
  const por100 = Object.fromEntries(CHAVES_NUTRIENTES.filter((c) => c in valores).map((c) => [c, valores[c] ?? null])) as Partial<Record<ChaveNutrienteAlimento, number | null>>
  return {
    codigo: p.codigo,
    nome: p.nome,
    marca: p.marca,
    por100,
    porcao: p.porcaoG !== null && p.porcaoG > 0 ? { gramas: p.porcaoG, texto: p.porcaoTexto } : null,
    unidade: p.unidade,
    fonte: `catálogo de rótulos do Open Food Facts (versão ${versao})`,
    alergenicos: detalhe.alergenicos,
  }
}

/**
 * D-756 e D-757: a cópia em Meus alimentos, como a leitura do código de barras faz no cadastro: rótulo por 100 g ou
 * 100 ml, a porção do rótulo como medida, a fonte com o código e a versão do catálogo, e o Cobrir desligado.
 */
export function dadosDaCopia(rotulo: RotuloEncontrado): DadosAlimentoProprio {
  const versao = /versão (\d{4}-\d{2}-\d{2})/.exec(rotulo.fonte)?.[1] ?? new Date().toISOString().slice(0, 10)
  return {
    ...dadosEmBranco('rotulo'),
    nome: rotulo.nome,
    marca: rotulo.marca,
    codigoBarras: rotulo.codigo,
    unidade: rotulo.unidade,
    base: 'por100',
    porcaoG: 100,
    valores: rotulo.por100,
    medidas: rotulo.porcao ? [{ nome: 'porção', gramas: rotulo.porcao.gramas }] : [],
    fonte: { tipo: 'open-food-facts', codigo: rotulo.codigo, data: versao },
    sugerirAutomaticamente: false,
    // D-761: os alergênicos do rótulo vão junto; as restrições os leem além do nome.
    ...(rotulo.alergenicos ? { alergenicos: rotulo.alergenicos } : {}),
  }
}

/** CA-1757: a cópia que a conta já tem, pelo código do Open Food Facts. */
export function copiaExistente(produtos: readonly Produto[], codigo: string): Produto | undefined {
  return produtos.find((p) => p.fonte?.tipo === 'open-food-facts' && p.fonte.codigo === codigo) ?? produtos.find((p) => p.codigoBarras === codigo)
}

/** D-760: a faixa dos ids provisórios da lista da busca, que nunca vão para o plano. */
export const PRIMEIRO_ID_PROVISORIO = 800_000_000
export const ehProvisorio = (id: number): boolean => id >= PRIMEIRO_ID_PROVISORIO && id < 900_000_000

/** O produto como alimento da lista da entrada rápida: só para a leitura da quantidade (a porção do rótulo). */
export function alimentoProvisorio(p: ProdutoDoIndice, posicao: number): Alimento {
  const nutrientes = Object.fromEntries(CHAVES_NUTRIENTES.map((c) => [c, null])) as Record<ChaveNutrienteAlimento, number | null>
  return {
    id: PRIMEIRO_ID_PROVISORIO + posicao,
    descricao: p.nome,
    categoria: '',
    base: null,
    preparo: null,
    qualificadores: null,
    nutrientes: { ...nutrientes, energia_kcal: p.kcal },
    tracos: [],
    ...(p.unidade === 'ml' ? { unidade: 'ml' as const } : {}),
    ...(p.porcaoG !== null && p.porcaoG > 0 ? { porcaoPadrao: { nome: 'porção', quantidade: 1, gramasPorMedida: p.porcaoG } } : {}),
  }
}
