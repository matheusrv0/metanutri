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

/** D-751: a tabela de conversão é a mesma da leitura ao vivo (`codigoBarras.ts`). */
const TABELA = JSON.parse(readFileSync(join(raiz, 'src', 'data', 'off-nutrientes.json'), 'utf8'))

/** As chaves gravadas em cada produto, na ordem das fatias. */
export const CHAVES_DO_CATALOGO = ['energia_kcal', ...TABELA.map((t) => t.chave), 'sodio_mg']

const COLUNAS = ['code', 'product_name', 'brands', 'countries_tags', 'quantity', 'serving_size', 'serving_quantity', 'energy-kcal_100g', 'energy_100g', 'sodium_100g', 'salt_100g', ...TABELA.map((t) => `${t.off}_100g`)]

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
  const porcao = numero(r.serving_quantity)
  // "ml" quando a embalagem ou a porção é em ml ou litro, como `unidadeDo` de `codigoBarras.ts` (A23).
  const unidade = /\d\s*(ml|l|litros?)\b/i.test(`${texto(r.quantity)} ${texto(r.serving_size)}`) ? 'ml' : 'g'
  return {
    codigo,
    nome,
    marca: texto(texto(r.brands).split(',')[0]),
    porcaoG: porcao !== null && porcao > 0 ? Math.round(porcao * 10) / 10 : null,
    porcaoTexto: porcao !== null && porcao > 0 ? texto(r.serving_size) : '',
    unidade,
    valores,
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
  const produtos = [...porCodigo.values()].sort((a, b) => (a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : 0))
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
    const linhas = daFatia.map((p) => `${JSON.stringify(p.codigo)}:${JSON.stringify(CHAVES_DO_CATALOGO.map((c) => p.valores[c] ?? null))}`)
    writeFileSync(join(pasta, 'fatias', `${fim}.json`), `{"chaves":${JSON.stringify(CHAVES_DO_CATALOGO)},"produtos":{\n${linhas.join(',\n')}\n}}\n`)
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
