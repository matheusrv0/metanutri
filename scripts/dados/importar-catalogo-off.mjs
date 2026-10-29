// Catálogo de rótulos do Open Food Facts (spec base-ampliada, fase 2, D-750 a D-754): lê a exportação oficial em CSV
// em stream e publica os produtos do Brasil em public/catalogo-off/<versão>/ (índice de nomes, 100 fatias de detalhe e o
// aviso da ODbL) e o cabeçalho src/data/catalogo-off-fonte.json. Só o Node, sem dependência.
//
// Uso:
//   node scripts/dados/importar-catalogo-off.mjs --baixar   baixa a exportação para o cache (1,5 GB) e gera
//   node scripts/dados/importar-catalogo-off.mjs            gera a partir do cache
//   node scripts/dados/importar-catalogo-off.mjs [arquivo.csv.gz] [--versao=AAAA-MM-DD]
//
// Os valores saem só do arquivo do OFF: nenhum número é escrito à mão. Nulo nunca vira zero.
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createGunzip } from 'node:zlib'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const URL_DA_EXPORTACAO = 'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz'
export const CACHE = join(raiz, 'dados-brutos', 'cache', 'off', 'en.openfoodfacts.org.products.csv.gz')
const PUBLICO = join(raiz, 'public', 'catalogo-off')
const CABECALHO = join(raiz, 'src', 'data', 'catalogo-off-fonte.json')
/** O endereço do app em produção, onde os arquivos são publicados (o aviso de licença os lista, D-765). */
const ENDERECO_PUBLICO = 'https://app.metanutri.com.br/'

/** D-751: a tabela de conversão é a mesma da leitura ao vivo (`codigoBarras.ts`). */
const TABELA = JSON.parse(readFileSync(join(raiz, 'src', 'data', 'off-nutrientes.json'), 'utf8'))

/** As chaves gravadas em cada produto, na ordem das fatias. */
export const CHAVES_DO_CATALOGO = ['energia_kcal', ...TABELA.map((t) => t.chave), 'sodio_mg']

const COLUNAS = [
  'code',
  'product_name',
  'brands',
  'countries_tags',
  'quantity',
  'product_quantity',
  'serving_size',
  'serving_quantity',
  'categories_tags',
  'allergens',
  'traces_tags',
  'ingredients_text',
  'energy-kcal_100g',
  'energy_100g',
  'sodium_100g',
  'salt_100g',
  ...TABELA.map((t) => `${t.off}_100g`),
]

/** D-761: os alergênicos, na ordem da base ampliada (D-716b). */
export const ALERGENICOS = ['trigo', 'gluten', 'leite', 'lactose', 'ovo', 'soja', 'amendoim', 'castanhas', 'peixe', 'frutos-do-mar']

/** As tags do OFF ("en:gluten") e o que cada uma liga. O glúten do OFF também liga o trigo: sobrar é mais seguro. */
const DAS_TAGS = {
  'en:gluten': ['trigo', 'gluten'],
  'en:milk': ['leite', 'lactose'],
  'en:eggs': ['ovo'],
  'en:soybeans': ['soja'],
  'en:peanuts': ['amendoim'],
  'en:nuts': ['castanhas'],
  'en:fish': ['peixe'],
  'en:crustaceans': ['frutos-do-mar'],
  'en:molluscs': ['frutos-do-mar'],
}

/** Nos ingredientes, em português e em inglês (a lista do OFF vem nas duas línguas). */
const DOS_INGREDIENTES = [
  [/(?<![\p{L}\p{N}])(trigo|wheat|s[eê]mola|semolina|triticale|espelta|spelt)(?![\p{L}\p{N}])/u, ['trigo', 'gluten']],
  [/(?<![\p{L}\p{N}])(cevada|cebada|barley|centeio|centeno|rye|aveia|avena|oats?|oatmeal|malte|malt|gl[uú]ten)(?![\p{L}\p{N}])/u, ['gluten']],
  [/(?<![\p{L}\p{N}])(leite|leche|milk|l[aá]cteos?|l[aá]cteas?|soro|suero|whey|case[ií]na|caseinato|casein|lactose|creme de leite|cream|manteiga|butter|queijo|cheese|iogurte|yogurt|nata|requeij[aã]o)(?![\p{L}\p{N}])/u, ['leite', 'lactose']],
  [/(?<![\p{L}\p{N}])(ovos?|huevos?|eggs?|clara|gema|albumina|albumin)(?![\p{L}\p{N}])/u, ['ovo']],
  [/(?<![\p{L}\p{N}])(soja|soy|soya|soybeans?)(?![\p{L}\p{N}])/u, ['soja']],
  [/(?<![\p{L}\p{N}])(amendoim|amendoins|man[ií]|cacahuetes?|peanuts?|pa[cç]oca)(?![\p{L}\p{N}])/u, ['amendoim']],
  [/(?<![\p{L}\p{N}])(castanhas?|am[eê]ndoas?|avel[aã]s?|nozes|noz|pistaches?|macad[aâ]mias?|almonds?|hazelnuts?|walnuts?|cashews?|pecans?|pistachios?)(?![\p{L}\p{N}])/u, ['castanhas']],
  [/(?<![\p{L}\p{N}])(peixes?|pescados?|fish|atum|tuna|sardinhas?|sardines?|salm[aã]o|salmon|bacalhau|anchovas?|anchov(y|ies)|merluza|til[aá]pia)(?![\p{L}\p{N}])/u, ['peixe']],
  [/(?<![\p{L}\p{N}])(camar[aã]o|camar[oõ]es|shrimps?|prawns?|caranguejo|crab|siri|lagosta|lobster|lulas?|squid|polvo|octopus|mexilh[aã]o|mussels?|ostras?|oysters?|mariscos?)(?![\p{L}\p{N}])/u, ['frutos-do-mar']],
]

/** O que lembra o alergênico e não é: sai do texto antes de procurar (o mesmo cuidado da D-716n). */
const NAO_E = /(?<![\p{L}\p{N}])((en|em) polvo|polvo para hornear|coconut milk|manteiga de (cacau|karit[eé])|cocoa butter|[oó]leo de soja|soybean oil|noz[ -]moscada|nutmeg|creme de (cebola|milho))(?![\p{L}\p{N}])/gu

/** D-772: "pode conter ..." e "may contain ..." até o fim da frase (o ponto): o que vem depois volta a ser "contém". */
const PODE_CONTER = /(pode conter|podem conter|may contain|traces? of|tra[cç]os de)[^.]*/g

/**
 * D-770: a negação não é alergênico. "Não contém glúten" é obrigatório no rótulo brasileiro (Lei 10.674/2003), e "sem
 * lactose", "gluten free" e "sin TACC" dizem o contrário do que a palavra sozinha diria. Saem antes de ler as palavras;
 * "contém glúten", sem o "não", continua acusando.
 */
const NEGACAO = /(?<![\p{L}\p{N}])((sem|n[aã]o cont[eé]m|zero|isento de|isenta de|livre de|sin|no contiene)\s+(gl[uú]ten|lactose|lactosa)|(gluten|lactose)[ -]free|sin tacc)(?![\p{L}\p{N}])/gu

const semAcentoMinusculo = (t) => t.toLowerCase()
const ordenar = (lista) => ALERGENICOS.filter((a) => lista.has(a))

/**
 * D-771: "leite de soja" (ou de amêndoas, castanha, aveia, arroz, coco) não é leite, mas a soja, a castanha e a aveia
 * continuam; "manteiga de amendoim" é amendoim, não leite. Fica só a palavra da planta.
 */
const SO_A_PLANTA = [
  [/(?<![\p{L}\p{N}])(leite|leche|bebida) de (soja|am[eê]ndoas?|aveia|arroz|castanhas?|coco)(?![\p{L}\p{N}])/gu, '$2'],
  [/(?<![\p{L}\p{N}])(manteiga|pasta) de amendoim(?![\p{L}\p{N}])/gu, 'amendoim'],
]

function doTexto(texto, destino) {
  const limpo = SO_A_PLANTA.reduce((t, [re, por]) => t.replace(re, por), semAcentoMinusculo(texto).replace(NEGACAO, ' ')).replace(NAO_E, ' ')
  for (const [re, alergenicos] of DOS_INGREDIENTES) if (re.test(limpo)) for (const a of alergenicos) destino.add(a)
}

/**
 * D-761: os alergênicos do produto. "Contém": as tags do OFF (allergens) e as palavras dos ingredientes; "pode conter":
 * as traces e o trecho dos ingredientes depois de "pode conter". O produto "sem lactose" no nome não liga a lactose. Sem
 * tag, sem trace e sem ingredientes, o produto fica "sem informação".
 */
export function alergenicosDoRegistro(r) {
  const contem = new Set()
  const podeConter = new Set()
  const tags = (campo) => texto(r[campo]).split(',').map((t) => t.trim()).filter((t) => t !== '')
  for (const t of tags('allergens')) for (const a of DAS_TAGS[t] ?? []) contem.add(a)
  for (const t of tags('traces_tags')) for (const a of DAS_TAGS[t] ?? []) podeConter.add(a)
  const ingredientes = texto(r.ingredients_text)
  const minusculo = semAcentoMinusculo(ingredientes)
  const trechos = minusculo.match(PODE_CONTER) ?? []
  doTexto(minusculo.replace(PODE_CONTER, '. '), contem)
  if (trechos.length > 0) doTexto(trechos.join('. '), podeConter)
  if (/(sem|zero|0%|isento de) lactose|lactose free/i.test(texto(r.product_name))) contem.delete('lactose')
  for (const a of contem) podeConter.delete(a)
  return {
    contem: ordenar(contem),
    podeConter: ordenar(podeConter),
    semInformacao: tags('allergens').length === 0 && tags('traces_tags').length === 0 && ingredientes === '',
  }
}

/** A lista vira um número de bits, na ordem de ALERGENICOS (a forma compacta das fatias). */
export const mascara = (lista) => lista.reduce((m, a) => m | (1 << ALERGENICOS.indexOf(a)), 0)

/** CB-757: as colunas que o script lê e o cabeçalho do CSV não tem. */
export function colunasQueFaltam(cabecalho) {
  const tem = new Set(cabecalho)
  return COLUNAS.filter((c) => !tem.has(c))
}

/** Número do OFF; texto, negativo ou NaN viram nulo (o mesmo `numero` de `codigoBarras.ts`). */
function numero(v) {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : Number.NaN
  return Number.isFinite(n) && n >= 0 ? n : null
}

const arredondar = (v) => Math.round(v * 1000) / 1000

/** D-751: os valores por 100 g ou 100 ml, como `nutrientesPor100` de `codigoBarras.ts`. */
export function porCem(r) {
  const valor = (campo) => numero(r[`${campo}_100g`])
  const valores = {}
  const kcal = valor('energy-kcal')
  const kj = valor('energy')
  valores.energia_kcal = kcal ?? (kj === null ? null : arredondar(kj / 4.184))
  for (const { chave, off, fator } of TABELA) {
    const v = valor(off)
    valores[chave] = v === null ? null : arredondar(v * fator)
  }
  const sodio = valor('sodium')
  const sal = valor('salt')
  valores.sodio_mg = sodio !== null ? arredondar(sodio * 1000) : sal !== null ? arredondar((sal / 2.5) * 1000) : null
  return valores
}

/** D-752: a regra de Meus alimentos (D-384, `energiaIncoerente` de `produtos.ts`): mais de 20% e de 15 kcal. */
export function energiaIncoerente(v) {
  const { proteina_g: p, carboidrato_g: c, lipideos_g: g, energia_kcal: e } = v
  if (typeof p !== 'number' || typeof c !== 'number' || typeof g !== 'number' || typeof e !== 'number') return false
  const pelosMacros = 4 * p + 4 * c + 9 * g
  const diferenca = Math.abs(e - pelosMacros)
  return diferenca > 15 && diferenca > 0.2 * Math.max(e, pelosMacros)
}

/** O óleo, o mais energético dos alimentos, tem 884 kcal em 100 g (D-501). */
const ENERGIA_MAXIMA_KCAL = 900
const texto = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')

/** D-762: o teto da porção; molho e condimento se servem às colheres. */
const PORCAO_MAXIMA_G = 300
const PORCAO_MAXIMA_DO_MOLHO_G = 50
/** D-774: os tetos sem o peso da embalagem. */
const PORCAO_MAXIMA_DO_PO_G = 60
const PORCAO_MAXIMA_DO_PAO_G = 150
const EH_PAO_OU_BISCOITO = /(?<![\p{L}])(p[aã]o|p[aã]es|biscoitos?|bolachas?|torradas?|cookies?|wafers?|bisnaguinhas?|rosquinhas?)(?![\p{L}])/iu
/** D-763: o pó se mede em gramas. */
export const EH_PO = /(?<![\p{L}])(p[oó]|powder|whey|achocolatado|cappuccino|capuccino|nescau|toddy|prote[ií]na|protein|composto l[aá]cteo|f[oó]rmula infantil)(?![\p{L}])/iu
const EH_MOLHO =/(?<![\p{L}])(molho|shoyu|maionese|ketchup|catchup|mostarda|tempero|vinagre|barbecue)(?![\p{L}])/iu
const CATEGORIA_DE_MOLHO = /en:(sauces|condiments|mayonnaises|ketchup|mustards|soy-sauces|vinegars|seasonings|dressings)/

/**
 * D-762: a porção do rótulo, ou nulo quando ela não é porção: igual ou maior que a embalagem, acima de 300 g, ou molho e
 * condimento acima de 50 g ("Shoyu Light" com 500 g, "Maionese verde" com 872 g). Sem ela, o produto fica por 100 g.
 */
function porcaoQueVale(r) {
  const porcao = numero(r.serving_quantity)
  if (porcao === null || porcao <= 0) return null
  const embalagem = numero(r.product_quantity)
  const molho = EH_MOLHO.test(texto(r.product_name)) || CATEGORIA_DE_MOLHO.test(texto(r.categories_tags))
  if ((embalagem !== null && embalagem > 0 && porcao >= embalagem) || porcao > PORCAO_MAXIMA_G || (molho && porcao > PORCAO_MAXIMA_DO_MOLHO_G)) return null
  // D-774: sem o peso da embalagem, a porção que ainda é a embalagem inteira cai num teto menor por tipo.
  if (embalagem === null || embalagem <= 0) {
    const nome = texto(r.product_name)
    const categorias = texto(r.categories_tags)
    if ((EH_PO.test(nome) || /en:(dietary-supplements|protein-powders|bodybuilding-supplements)/.test(categorias)) && porcao > PORCAO_MAXIMA_DO_PO_G) return null
    if ((EH_PAO_OU_BISCOITO.test(nome) || /en:(breads|biscuits|crackers)/.test(categorias)) && porcao > PORCAO_MAXIMA_DO_PAO_G) return null
  }
  return Math.round(porcao * 10) / 10
}

/** O produto do catálogo, ou `{ descartado: motivo }` (D-752). */
export function produtoDoRegistro(r) {
  if (!texto(r.countries_tags).split(',').includes('en:brazil')) return { descartado: 'país' }
  const codigo = texto(r.code)
  if (!/^\d{8,14}$/.test(codigo)) return { descartado: 'código' }
  const nome = texto(r.product_name)
  if (nome === '') return { descartado: 'nome' }
  const valores = porCem(r)
  if (valores.energia_kcal === null || valores.energia_kcal > ENERGIA_MAXIMA_KCAL) return { descartado: 'energia' }
  const macros = [valores.proteina_g, valores.lipideos_g, valores.carboidrato_g]
  if (macros.some((m) => m === null || m > 100) || macros.reduce((a, m) => a + m, 0) > 105) return { descartado: 'macros' }
  if (energiaIncoerente(valores)) return { descartado: 'energia incoerente' }
  const porcao = porcaoQueVale(r)
  // "ml" quando a embalagem ou a porção é em ml ou litro, como `unidadeDo` de `codigoBarras.ts` (A23).
  // D-763: o pó (whey, achocolatado, cappuccino, leite em pó) é em gramas, mesmo com o preparo em ml no rótulo.
  const unidade = !EH_PO.test(nome) && /\d\s*(ml|l|litros?)\b/i.test(`${texto(r.quantity)} ${texto(r.serving_size)}`) ? 'ml' : 'g'
  return {
    codigo,
    nome,
    marca: texto(texto(r.brands).split(',')[0]),
    porcaoG: porcao,
    porcaoTexto: porcao !== null ? texto(r.serving_size) : '',
    unidade,
    valores,
    alergenicos: alergenicosDoRegistro(r),
  }
}

/** Monta o catálogo: os produtos que passam, pelo código, sem repetir (fica o de nome mais completo, CA-1754). */
export function montarCatalogo(registros) {
  const porCodigo = new Map()
  const descartados = {}
  let doBrasil = 0
  for (const r of registros) {
    const p = produtoDoRegistro(r)
    if (p.descartado === 'país') continue
    doBrasil += 1
    if ('descartado' in p) {
      descartados[p.descartado] = (descartados[p.descartado] ?? 0) + 1
      continue
    }
    const antes = porCodigo.get(p.codigo)
    if (!antes || p.nome.length > antes.nome.length || (p.nome.length === antes.nome.length && p.nome < antes.nome)) porCodigo.set(p.codigo, p)
  }
  const pelosCodigos = [...porCodigo.values()].sort((a, b) => (a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : 0))
  // D-764: o genérico sem marca com o mesmo nome e os mesmos nutrientes de outro produto não acrescenta nada.
  const igual = (p) => `${p.nome.toLowerCase()}|${JSON.stringify(CHAVES_DO_CATALOGO.map((c) => p.valores[c] ?? null))}`
  const comMarca = new Set(pelosCodigos.filter((p) => p.marca !== '').map(igual))
  const semMarca = new Set()
  const produtos = pelosCodigos.filter((p) => {
    if (p.marca !== '') return true
    const chave = igual(p)
    if (comMarca.has(chave) || semMarca.has(chave)) {
      descartados['genérico repetido'] = (descartados['genérico repetido'] ?? 0) + 1
      return false
    }
    semMarca.add(chave)
    return true
  })
  return { produtos, doBrasil, descartados }
}

/** Lê o CSV (gzip, tabulação) em stream e devolve os registros, só com as colunas que o script usa. */
export async function* registrosDoArquivo(caminho) {
  const linhas = createInterface({ input: createReadStream(caminho).pipe(createGunzip()), crlfDelay: Infinity })
  let posicoes = null
  for await (const linha of linhas) {
    const campos = linha.split('\t')
    if (!posicoes) {
      const faltam = colunasQueFaltam(campos)
      if (faltam.length > 0) throw new Error(`O CSV do OFF não tem as colunas ${faltam.join(', ')}.`)
      posicoes = COLUNAS.map((c) => [c, campos.indexOf(c)])
      continue
    }
    // Só o Brasil é lido por inteiro: o filtro barato vem antes.
    if (!linha.includes('en:brazil')) continue
    yield Object.fromEntries(posicoes.map(([c, i]) => [c, campos[i] ?? '']))
  }
}

async function sha256(caminho) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(caminho), hash)
  return hash.digest('hex')
}

const LICENCA = (versao) => `Catálogo de rótulos do MetaNutri: produtos do Brasil do Open Food Facts, versão ${versao}.

Dados do Open Food Facts (https://world.openfoodfacts.org), disponibilizados sob a Open Database License (ODbL) v1.0:
https://opendatacommons.org/licenses/odbl/1-0/. Os conteúdos individuais estão sob a Database Contents License (DbCL)
v1.0: https://opendatacommons.org/licenses/dbcl/1-0/.

Estes arquivos são um banco derivado (só os produtos com "en:brazil" em countries_tags, sem os que não têm energia ou
têm a tabela incoerente, com os nutrientes convertidos para a unidade da adequação) e são oferecidos sob a mesma licença
ODbL v1.0. Gerados por scripts/dados/importar-catalogo-off.mjs a partir de ${URL_DA_EXPORTACAO}.
Separados da TACO e do USDA FoodData Central, que têm licenças próprias.

Os arquivos deste banco (D-765), para baixar inteiros:
${[`${ENDERECO_PUBLICO}catalogo-off/${versao}/indice.json`, ...Array.from({ length: 100 }, (_, n) => `${ENDERECO_PUBLICO}catalogo-off/${versao}/fatias/${String(n).padStart(2, '0')}.json`)].join('\n')}
`

/** Grava a versão: o índice, as 100 fatias, o aviso de licença e o cabeçalho; apaga a versão anterior. */
export function gravarCatalogo({ produtos, doBrasil, descartados }, versao, sha, publico = PUBLICO, cabecalho = CABECALHO) {
  rmSync(publico, { recursive: true, force: true })
  const pasta = join(publico, versao)
  mkdirSync(join(pasta, 'fatias'), { recursive: true })
  const indice = produtos.map((p) => [p.codigo, p.nome, p.marca, p.porcaoG, p.porcaoTexto, p.unidade === 'ml' ? 1 : 0, Math.round(p.valores.energia_kcal)])
  // Um produto por linha: a diferença entre duas versões se lê por produto.
  writeFileSync(join(pasta, 'indice.json'), `{"versao":${JSON.stringify(versao)},"campos":["codigo","nome","marca","porcaoG","porcaoTexto","ml","kcal"],"produtos":[\n${indice.map((l) => JSON.stringify(l)).join(',\n')}\n]}\n`)
  for (let n = 0; n < 100; n += 1) {
    const fim = String(n).padStart(2, '0')
    const daFatia = produtos.filter((p) => p.codigo.endsWith(fim))
    // D-761: depois dos valores, "contém" e "pode conter" como bits na ordem de `alergenicos`, e 1 se o OFF não tem informação.
    const linhas = daFatia.map((p) => {
      const a = p.alergenicos ?? { contem: [], podeConter: [], semInformacao: true }
      return `${JSON.stringify(p.codigo)}:${JSON.stringify([...CHAVES_DO_CATALOGO.map((c) => p.valores[c] ?? null), mascara(a.contem), mascara(a.podeConter), a.semInformacao ? 1 : 0])}`
    })
    writeFileSync(join(pasta, 'fatias', `${fim}.json`), `{"chaves":${JSON.stringify(CHAVES_DO_CATALOGO)},"alergenicos":${JSON.stringify(ALERGENICOS)},"produtos":{\n${linhas.join(',\n')}\n}}\n`)
  }
  writeFileSync(join(pasta, 'LICENCA.txt'), LICENCA(versao))
  const fonte = {
    nome: 'Open Food Facts',
    licenca: 'Open Database License (ODbL) v1.0; conteúdos sob a Database Contents License (DbCL) v1.0',
    url: 'https://world.openfoodfacts.org',
    exportacao: URL_DA_EXPORTACAO,
    versao,
    sha256: sha,
    caminho: `catalogo-off/${versao}/`,
    doBrasil,
    produtos: produtos.length,
    descartados,
  }
  writeFileSync(cabecalho, `${JSON.stringify(fonte, null, 1)}\n`)
  return fonte
}

async function baixar(destino) {
  mkdirSync(dirname(destino), { recursive: true })
  const resposta = await fetch(URL_DA_EXPORTACAO)
  if (!resposta.ok || !resposta.body) throw new Error(`O OFF respondeu ${resposta.status} para ${URL_DA_EXPORTACAO}.`)
  await pipeline(Readable.fromWeb(resposta.body), createWriteStream(destino))
}

async function principal(argumentos) {
  const caminho = argumentos.find((a) => !a.startsWith('--')) ?? CACHE
  if (argumentos.includes('--baixar')) await baixar(caminho)
  if (!existsSync(caminho)) throw new Error(`Falta ${caminho}. Rode com --baixar ou baixe de ${URL_DA_EXPORTACAO}.`)
  // A versão é a data da exportação: a do arquivo baixado, ou a que se passa.
  const versao = argumentos.find((a) => a.startsWith('--versao='))?.slice('--versao='.length) ?? statSync(caminho).mtime.toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(versao)) throw new Error(`Versão "${versao}" fora do padrão AAAA-MM-DD.`)
  const registros = []
  for await (const r of registrosDoArquivo(caminho)) registros.push(r)
  const catalogo = montarCatalogo(registros)
  const fonte = gravarCatalogo(catalogo, versao, await sha256(caminho))
  console.log(`${fonte.produtos} produtos de ${fonte.doBrasil} do Brasil gravados em public/${fonte.caminho}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2)).catch((erro) => {
    console.error(`Catálogo recusado: ${erro.message}`)
    process.exit(1)
  })
}
