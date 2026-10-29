// Primeira peneira da base ampliada (spec base-ampliada, D-702): tira do USDA, por regra escrita, o que não serve ao
// Brasil, e grava a lista de candidatos que a curadoria (tradução, grupo, preparo, `sugerivel`) recebe.
// Uso: node scripts/dados/preselecionar-usda.mjs [pasta do cache]
//
// O que sai: <cache>/candidatos.json (todos os alimentos, com `motivo` nos tirados) e um resumo no terminal. A peneira
// não decide nome nem grupo: só tira marca, fast food, prato pronto americano, alimento infantil, caça, bebida
// alcoólica, fortificação americana e as duplicatas óbvias (com sal quando há sem sal; classificação de carne).
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { alimentosDaFoundation, alimentosDoSrLegacy, sha256 } from './usda-fonte.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const CACHE_PADRAO = join(raiz, 'dados-brutos', 'cache', 'usda')

/** Os arquivos oficiais da base ampliada, com o SHA-256 conferido no download de 29/10/2026. */
export const ARQUIVOS_USDA = {
  srLegacy: {
    nome: 'SR Legacy',
    versao: '2018-04',
    arquivo: 'FoodData_Central_sr_legacy_food_csv_2018-04.zip',
    url: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip',
    sha256: 'b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0',
  },
  foundation: {
    nome: 'Foundation Foods',
    versao: '2026-10',
    arquivo: 'FoodData_Central_foundation_food_json_2026-10-29.zip',
    url: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-10-29.zip',
    sha256: 'dd414cc9f1a132626bad354ef6655972c78b44aff14f16114dc899708663c579',
  },
}

/** Lê os dois conjuntos do cache, depois de conferir o SHA-256 de cada arquivo. */
export function carregarUsda(cache = CACHE_PADRAO) {
  for (const a of Object.values(ARQUIVOS_USDA)) {
    const caminho = join(cache, a.arquivo)
    let soma
    try {
      soma = sha256(caminho)
    } catch {
      throw new Error(`Falta ${a.arquivo} em ${cache}. Baixe de ${a.url}.`)
    }
    if (soma !== a.sha256) throw new Error(`${a.arquivo}: SHA-256 ${soma} diferente do esperado ${a.sha256}.`)
  }
  return [
    ...alimentosDaFoundation(join(cache, ARQUIVOS_USDA.foundation.arquivo), ARQUIVOS_USDA.foundation.versao),
    ...alimentosDoSrLegacy(join(cache, ARQUIVOS_USDA.srLegacy.arquivo)),
  ]
}

const CATEGORIAS_FORA = new Map([
  ['Baby Foods', 'alimento infantil'],
  ['Fast Foods', 'rede de fast food'],
  ['Restaurant Foods', 'prato de restaurante americano'],
  ['American Indian/Alaska Native Foods', 'alimento regional norte-americano'],
  ['Meals, Entrees, and Side Dishes', 'prato pronto americano'],
  ['Soups, Sauces, and Gravies', 'sopa, molho ou caldo industrializado'],
  ['Branded Food Products Database', 'produto de marca'],
  ['Quality Control Materials', 'material de controle de laboratório'],
])

/** Siglas que não são marca. */
const SIGLAS = new Set(['USDA', 'NFS', 'NLEA', 'UHT', 'RTE', 'II', 'III', 'KAMUT'])
const temMarca = (d) => [...d.matchAll(/\b[A-Z][A-Z'&.-]{2,}\b/g)].some((m) => !SIGLAS.has(m[0].replace(/('S?|[.-])$/, '')))

/**
 * Exceções conferidas à mão (D-702): alimento que uma regra tiraria, mas que é genérico, comum no Brasil e sem outro
 * igual no USDA. O motivo fica escrito.
 */
export const EXCECOES = new Map([
  [170904, 'kefir natural: o nome traz a marca, mas é o único kefir do USDA; a fortificação americana fica nula na curadoria'],
  [175303, 'cabrito: carne comum no Nordeste, que o USDA põe entre as de caça'],
  [175304, 'cabrito: carne comum no Nordeste, que o USDA põe entre as de caça'],
  [175140, 'sardinha em molho de tomate: a conserva de sardinha mais vendida no Brasil'],
  [173042, 'suco de uva integral: não há suco fresco no USDA para a regra do enlatado preferir'],
])

/** Na ordem: a primeira que casa dá o motivo. Cada regra recebe o alimento e o conjunto de descrições existentes. */
const REGRAS = [
  { motivo: 'bebida alcoólica', casa: (a) => /alcoholic|\bbeer\b|\bwine\b|liqueur|whiskey|vodka|\brum\b|\bgin\b|cocktail mix|daiquiri|margarita|sake\b/i.test(a.descricao) },
  { motivo: 'alimento infantil', casa: (a) => /infant formula|babyfood|baby food|toddler|human milk|\bmilk, human\b/i.test(a.descricao) },
  { motivo: 'produto de marca', casa: (a) => temMarca(a.descricao) },
  {
    motivo: 'fortificação americana',
    casa: (a) => /(?<!not )fortified|\bwith added (vitamin|calcium|ascorbic|iron|nutrients|omega)|vitamin [ad] (fortified|added)|with vitamin [ad] added|enriched with/i.test(a.descricao),
  },
  { motivo: 'imitação ou substituto', casa: (a) => /imitation|substitute|\bartificial|analog|meatless|vegetarian (fillets|meatloaf|stew|chili)|veggie burger|soyburger/i.test(a.descricao) },
  {
    motivo: 'caça ou carne exótica',
    casa: (a) =>
      /^(Game meat|Bison|Buffalo|Beefalo|Emu|Ostrich|Turtle|Frog legs|Jellyfish|Squab|Pheasant|Guinea hen|Goose|Quail|Dove|Bear|Beaver|Moose|Elk|Deer|Caribou|Rabbit|Squirrel|Opossum|Raccoon|Muskrat|Seal|Whale|Walrus|Mollusks, (snail|whelk|conch|abalone)|Fish, (eel|gefiltefish|caviar|roe|burbot|cisco|sucker|sheepshead|spot|scup|cusk|ling|lingcod|pout|sablefish|smelt|shad|sunfish|whitefish|milkfish|pike|sturgeon|wolffish|roughy))/i.test(a.descricao),
  },
  {
    motivo: 'prato pronto, empanado ou mistura',
    casa: (a) =>
      /prepared from recipe|home recipe|homemade|from (dry )?mix|\bmix(es)?, dry|dry mix|powder mix|frozen meal|dinner|entree|sandwich|pizza|burrito|\btaco\b|nachos|hamburger|cheeseburger|hot dog|nugget|patty|patties|breaded|batter|fried, (flour|battered)|crab cakes|fish sticks|salad\b(?! or cooking)|coleslaw|succotash|au gratin|scalloped|o'brien|hash brown|french fried|french fries|potato puffs|onion rings|tater|stuffing|casserole|pot pie|lasagna|ravioli|chow mein|stew\b|chili con|\bdip\b/i.test(a.descricao),
  },
  {
    motivo: 'doce industrializado',
    casa: (a) =>
      /cand(y|ies)|chewing gum|frosting|icing|marshmallow|pudding|\bpies?\b|(?<!rice )\bcakes?\b|cookie|doughnut|danish|pastr(y|ies)|brownie|muffin|ice cream|frozen yogurt|sherbet|popsicle|fruit cocktail|fruit salad|smoothie|nectar\b|fruit punch|drink\b|beverage, .*powder|toaster|cheesecake|eclair|cream puff|strudel|turnover|sweet rolls|cinnamon|gelatin dessert|topping|whipped|eggnog|milk shake|dulce de leche/i.test(a.descricao) &&
      !/^Spices, cinnamon/i.test(a.descricao),
  },
  { motivo: 'molho, sopa, tempero pronto ou conserva', casa: (a) => /\bsauce\b|gravy|dressing|soup|bouillon|broth|pickle|relish|ketchup|catsup|mustard, prepared|vinegar|salsa\b|horseradish|\bspread\b|sandwich spread/i.test(a.descricao) },
  { motivo: 'fruta em calda, adoçada ou industrializada', casa: (a) => /heavy syrup|light syrup|extra (heavy|light) syrup|\bsyrup pack|juice pack|water pack|frozen, sweetened|sweetened, (frozen|canned)|canned, (sweetened|syrup)|applesauce|cranberry sauce|pie filling/i.test(a.descricao) },
  { motivo: 'queijo processado ou creme industrializado', casa: (a) => /pasteurized process|cheese (food|product|spread|sauce)|cream substitute|dessert topping|half and half|coffee cream|cream, (fluid|light|heavy|sour|whipped)|sour cream|filled, fluid/i.test(a.descricao) },
  { motivo: 'gordura industrial ou hidrogenada', casa: (a) => /industrial|hydrogenated|shortening|margarine|\bspread\b|vegetable oil-butter|frying|oil, ((partially )?hydrogenated|vegetable, (soybean|corn|sunflower), refined)/i.test(a.descricao) },
  { motivo: 'cereal matinal de marca ou fortificado', casa: (a) => a.categoria === 'Breakfast Cereals' && !/^Cereals, (oats|corn grits|farina|whole wheat hot|wheat, cream of)|granola|muesli/i.test(a.descricao) },
  { motivo: 'salgadinho', casa: (a) => a.categoria === 'Snacks' && !/popcorn, air-popped|rice cakes|trail mix/i.test(a.descricao) },
  { motivo: 'embutido ou frio americano', casa: (a) => a.categoria === 'Sausages and Luncheon Meats' && !/turkey breast|turkey, white|chicken breast, (deli|oven-roasted)/i.test(a.descricao) },
  {
    motivo: 'bebida industrializada',
    casa: (a) =>
      a.categoria === 'Beverages' &&
      !/^(Beverages, )?(tea, (green|black|herb|chamomile|hibiscus)|coffee, brewed|coffee, espresso|Tea, (green|black|herbal|hibiscus)|Coffee, brewed|coconut water|Water, (bottled|tap|municipal))/i.test(a.descricao),
  },
  { motivo: 'carne curada ou salgada', casa: (a) => /^Pork, cured|^Beef, cured|corned beef|cured, |\bsalted\b(?!, without)|smoked|kippered|jerky|dried and salted|dried, salted/i.test(a.descricao) && !/without salt/i.test(a.descricao) },
  { motivo: 'classificação americana de carne (fica "all grades")', casa: (a) => /\b(choice|select|prime)\b/i.test(a.descricao) && /^(Beef|Lamb|Veal)/i.test(a.descricao) },
  { motivo: 'aparo de gordura americano (fica o sem gordura aparente)', casa: (a) => /trimmed to (1\/8|1\/4|1\/2)"? ?fat/i.test(a.descricao) && /^(Beef|Pork|Lamb|Veal)/i.test(a.descricao) },
  { motivo: 'carne importada (fica a doméstica)', casa: (a) => /imported|New Zealand|Australian|Australia/i.test(a.descricao) && /^(Beef|Lamb|Veal)/i.test(a.descricao) },
  {
    motivo: 'magra com gordura (fica só a parte magra)',
    casa: (a, existentes) =>
      /separable lean and fat/i.test(a.descricao) && existentes.has(a.descricao.replace(/separable lean and fat/i, 'separable lean only').toLowerCase()),
  },
  { motivo: 'corte de ave pouco usado no Brasil', casa: (a) => /^Chicken, (roasting|stewing|capons|cornish)|light meat|dark meat|giblets|\bback\b|\bneck\b|meat and skin and giblets/i.test(a.descricao) },
  {
    motivo: 'versão com sal (fica a sem sal)',
    casa: (a, existentes) => {
      const d = a.descricao.toLowerCase()
      if (!/with salt/.test(d)) return false
      return existentes.has(d.replace(/with salt added/, 'without salt added')) || existentes.has(d.replace(/with salt/, 'without salt'))
    },
  },
  {
    motivo: 'congelado (fica o fresco)',
    casa: (a, _existentes, bases) =>
      /frozen/i.test(a.descricao) && ['Vegetables and Vegetable Products', 'Fruits and Fruit Juices'].includes(a.categoria) && (bases.get(base(a.descricao))?.fresco ?? false),
  },
  { motivo: 'enlatado (fica o fresco)', casa: (a, _existentes, bases) => /canned/i.test(a.descricao) && ['Vegetables and Vegetable Products', 'Fruits and Fruit Juices', 'Legumes and Legume Products'].includes(a.categoria) && (bases.get(base(a.descricao))?.fresco ?? false) },
  { motivo: 'enriquecido americano (fica o sem enriquecimento)', casa: (a, existentes) => /\benriched\b/i.test(a.descricao) && existentes.has(a.descricao.replace(/\benriched\b/i, 'unenriched').toLowerCase()) },
]

/** O nome base do USDA: a parte antes da primeira vírgula ("Broccoli", "Beans"). */
const base = (descricao) => descricao.split(',')[0].trim().toLowerCase()

export function preselecionar(alimentos) {
  const existentes = new Set(alimentos.map((a) => a.descricao.toLowerCase()))
  const bases = new Map()
  for (const a of alimentos) {
    const b = bases.get(base(a.descricao)) ?? { fresco: false }
    if (!/frozen|canned/i.test(a.descricao)) b.fresco = true
    bases.set(base(a.descricao), b)
  }
  return alimentos.map((a) => {
    const porCategoria = CATEGORIAS_FORA.get(a.categoria)
    const regra = porCategoria || EXCECOES.has(a.fdcId) ? null : REGRAS.find((r) => r.casa(a, existentes, bases))
    return { ...a, motivo: porCategoria ?? regra?.motivo ?? null }
  })
}

function principal(argumentos) {
  const [cache = CACHE_PADRAO] = argumentos
  const avaliados = preselecionar(carregarUsda(cache))
  const candidatos = avaliados.filter((a) => a.motivo === null)
  const porMotivo = new Map()
  for (const a of avaliados) if (a.motivo) porMotivo.set(a.motivo, (porMotivo.get(a.motivo) ?? 0) + 1)
  const porCategoria = new Map()
  for (const a of candidatos) porCategoria.set(a.categoria, (porCategoria.get(a.categoria) ?? 0) + 1)
  const saida = avaliados.map(({ fdcId, conjunto, versao, descricao, categoria, porcoes, motivo }) => ({ fdcId, conjunto, versao, descricao, categoria, porcoes, motivo }))
  writeFileSync(join(cache, 'candidatos.json'), `${JSON.stringify(saida, null, 1)}\n`)
  console.log(`${avaliados.length} alimentos lidos; ${candidatos.length} candidatos.`)
  console.log('Tirados por motivo:', Object.fromEntries([...porMotivo].sort((x, y) => y[1] - x[1])))
  console.log('Candidatos por categoria:', Object.fromEntries([...porCategoria].sort((x, y) => y[1] - x[1])))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal(process.argv.slice(2))
