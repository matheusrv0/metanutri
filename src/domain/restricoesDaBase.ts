// O que cada restrição tira da base (spec ficha-unica, D-352 e Apêndice A). É dado, revisado alimento por alimento:
// pelo grupo (a categoria da TACO) e pelo ingrediente (a receita usual da preparação ou o rótulo usual do produto).
// Numa alergia, sobrar é mais seguro que faltar: produto industrializado entra quando costuma levar o ingrediente ou o
// aviso "pode conter". A parceira confere a lista (SPEC, seção 9).

/** As restrições que mexem na base. Glúten e Vegano são montadas a partir das outras. */
export type IdRestricaoDaBase =
  | 'leite'
  | 'lactose'
  | 'ovo'
  | 'trigo'
  | 'gluten'
  | 'soja'
  | 'amendoim'
  | 'castanhas'
  | 'peixe'
  | 'frutos-do-mar'
  | 'vegetariano'
  | 'vegano'

const intervalo = (de: number, ate: number): number[] => Array.from({ length: ate - de + 1 }, (_, i) => de + i)

/** Leite e derivados: tudo que tem a proteína do leite. */
const LEITE: readonly number[] = [
  // Biscoitos maisena, recheados, wafer e cream cracker; bolos; canjica com leite; mingau infantil; curau; farinha láctea.
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 23, 29, 30, 36,
  // Macarrão instantâneo (tempero), mingau tradicional, pamonha, pães de forma, de soja, de glúten, de milho e sovado.
  39, 46, 47, 48, 49, 50, 51, 52, 54,
  // Pastel de queijo, batata sauté (manteiga), biscoito de polvilho, pão de queijo.
  57, 58, 94, 99, 140, 141,
  // Manteigas e margarinas (soro de leite).
  261, 262, 263, 264, 265, 266,
  // Coxinha, croquetes e empadas (massa com leite ou manteiga).
  386, 387, 388, 389, 390,
  // A categoria Leite e derivados inteira.
  ...intervalo(446, 469),
  // Omelete de queijo; achocolatado, chocolates, cocada, doce de leite, quindim; capuccino; chantilly.
  484, 491, 495, 496, 497, 498, 499, 501, 509, 512, 522,
  // Bolinho de arroz, estrogonofes (creme de leite), tapioca com manteiga.
  530, 537, 538, 551,
]

/** Lactose: leite e laticínios frescos e o que leva esses ingredientes como parte principal. */
const LACTOSE: readonly number[] = [
  // Bolos, canjica com leite, mingau infantil, curau, farinha láctea, mingau tradicional, pão de queijo.
  14, 15, 16, 17, 18, 20, 23, 29, 30, 36, 46, 140, 141,
  // Bebida láctea, creme de leite, iogurtes, leite condensado, leites e leite fermentado.
  ...intervalo(446, 460),
  // Queijo minas frescal, pasteurizado, petit suisse, requeijão e ricota.
  461, 465, 466, 468, 469,
  // Chocolates ao leite, cocada branca, doce de leite, capuccino, bolinho de arroz e estrogonofes.
  495, 496, 497, 499, 501, 512, 530, 537, 538,
]

const OVO: readonly number[] = [
  // Bolos, lasanha de massa fresca, macarrão com ovos, pão sovado.
  14, 15, 16, 17, 18, 37, 38, 41, 54,
  // Biscoito de polvilho, nhoque, pão de queijo.
  99, 136, 140, 141,
  // Almôndegas, à milanesa, coxinha, croquetes e empadas.
  330, 331, 340, 386, 387, 388, 389, 390, 401,
  // Ovos e omelete.
  ...intervalo(484, 490),
  // Maria mole (clara), quindim (gema), maionese.
  504, 505, 509, 524,
  // Bife à cavalo, bolinho de arroz, cuscuz paulista, feijão tropeiro, saladas com maionese, salpicão, virado à paulista.
  529, 530, 534, 539, 545, 547, 555,
]

const TRIGO: readonly number[] = [
  // Biscoitos, bolos, mistura para vitamina, farinhas de rosca, de trigo e láctea.
  ...intervalo(8, 18), 24, 34, 35, 36,
  // Lasanhas, macarrões, pães, pastéis e torrada.
  ...intervalo(37, 41), ...intervalo(48, 60), 63,
  // Nhoque; peixes com farinha de trigo.
  136, 281, 299, 306,
  // Almôndegas, à milanesa, coxinha, croquetes, empadas e quibes (trigo para quibe).
  330, 331, 340, 386, 387, 388, 389, 390, 401, 440, 441, 442,
  // Achocolatado (pode conter), shoyu, bolinho de arroz, macarrão à bolonhesa, tabule, vatapá (pão) e yakisoba.
  491, 518, 530, 542, 549, 554, 556,
]

/** Glúten: o trigo e mais aveia, centeio e cevada (malte e cerveja). */
const SO_GLUTEN: readonly number[] = [7, 25, 26, 32, 474]

const SOJA: readonly number[] = [
  // Biscoitos recheados e wafer (lecitina), macarrão instantâneo, pão de soja.
  9, 10, 11, 12, 39, 49,
  // Margarinas (lecitina).
  263, 264, 265, 266,
  // Apresuntado, hambúrgueres e mortadela (proteína de soja).
  323, 415, 416, 417, 424,
  // Achocolatado e chocolates (lecitina), shoyu, yakisoba.
  491, 495, 496, 497, 498, 518, 556,
  // Farinha, extrato solúvel e tofu.
  581, 582, 583, 584,
]

const AMENDOIM: readonly number[] = [554, 557, 558, 579, 580]

/** Castanhas e nozes. O coco não é oleaginosa para alergia. */
const CASTANHAS: readonly number[] = [496, 554, 587, 588, 589, 597]

/** Os peixes da categoria Pescados e frutos do mar, e o cuscuz paulista (sardinha). */
const PEIXE: readonly number[] = [...intervalo(273, 283), ...intervalo(288, 322), 534]

/** Camarões e caranguejo, e os pratos com camarão (seco ou fresco). */
const FRUTOS_DO_MAR: readonly number[] = [284, 285, 286, 287, 525, 531, 535, 550, 554]

/** Carne, peixe e fruto do mar: as duas categorias inteiras e o que leva uma delas ou gelatina. */
const VEGETARIANO: readonly number[] = [
  ...intervalo(273, 322),
  ...intervalo(323, 445),
  // Pastel de carne.
  55, 56,
  // Geleia de mocotó, maria mole e gelatina (gelatina animal).
  502, 504, 505, 515,
  // Acarajé, arroz carreteiro, baião de dois (bacon ou carne de sol), barreado, bife à cavalo.
  525, 526, 527, 528, 529,
  // Camarão à baiana, charuto de repolho, cuscuz paulista, cuxá, dobradinha, estrogonofes, feijão tropeiro, feijoada.
  531, 532, 534, 535, 536, 537, 538, 539, 540,
  // Frango com açafrão, macarrão à bolonhesa, maniçoba, salpicão, sarapatel, tacacá.
  541, 542, 543, 547, 548, 550,
  // Vaca atolada, vatapá, virado à paulista, yakisoba.
  553, 554, 555, 556,
]

/** Mel de abelha: o único item de origem animal que não é carne, leite nem ovo. */
const MEL = 507

const semRepetir = (...listas: readonly (readonly number[])[]): readonly number[] => [...new Set(listas.flat())].sort((a, b) => a - b)

export const ALIMENTOS_POR_RESTRICAO: Readonly<Record<IdRestricaoDaBase, readonly number[]>> = {
  leite: semRepetir(LEITE),
  lactose: semRepetir(LACTOSE),
  ovo: semRepetir(OVO),
  trigo: semRepetir(TRIGO),
  gluten: semRepetir(TRIGO, SO_GLUTEN),
  soja: semRepetir(SOJA),
  amendoim: semRepetir(AMENDOIM),
  castanhas: semRepetir(CASTANHAS),
  peixe: semRepetir(PEIXE),
  'frutos-do-mar': semRepetir(FRUTOS_DO_MAR),
  vegetariano: semRepetir(VEGETARIANO),
  vegano: semRepetir(VEGETARIANO, LEITE, OVO, [MEL]),
}

const CONJUNTOS: ReadonlyMap<IdRestricaoDaBase, ReadonlySet<number>> = new Map(
  Object.entries(ALIMENTOS_POR_RESTRICAO).map(([id, lista]) => [id as IdRestricaoDaBase, new Set(lista)]),
)

/** Os ids da base que a restrição tira. */
export function idsDaRestricao(id: IdRestricaoDaBase): ReadonlySet<number> {
  return CONJUNTOS.get(id) ?? new Set()
}

/** O último id da TACO: acima dele, o alimento é próprio (rótulo) e é lido pelo nome. */
export const ULTIMO_ID_DA_BASE = 597

/** Preparações cujo nome lembra o trigo e que não o levam (o trecho sai do nome; o resto ainda é lido, D-716n). */
const EXCECOES_DO_TRIGO: readonly string[] = [
  'pao de queijo',
  // D-716t: o nome de polvilho e de tapioca que parece de trigo; "Tapioca com granola" continua pegando o glúten.
  'biscoito de polvilho',
  'biscoito polvilho',
  'pao de polvilho',
  'pao de tapioca',
  'bolo de tapioca',
  'panqueca de tapioca',
  'bolo de farinha de arroz',
  'pao de farinha de arroz',
  'panqueca de farinha de arroz',
  'massa de mandioca para pastel',
  'pastel de mandioca',
  'macarrao de arroz',
  'farinha de arroz',
  'fruta-pao',
  'fruta pao',
  'massa de mandioca',
  'massa de tapioca',
  // Spec base-ampliada, D-716l: massas e grãos sem trigo que o nome lembra.
  'macarrao de milho',
  'macarrao de feijao mungo',
  'harussame',
  'harusame',
  'biscoito de arroz',
  'trigo sarraceno',
]

/**
 * O que vale para o nome inteiro: o que diz não ter glúten ou trigo. Tapioca e polvilho saíram daqui (D-716t): livravam
 * "Tapioca com granola" e "Biscoito de polvilho com farinha de trigo".
 */
const QUALIFICADORES_DO_TRIGO: readonly string[] = ['sem gluten', 'sem trigo']

/** Vegano no nome: o produto inteiro é feito para quem tem a restrição. */
const VEGANO: readonly string[] = ['vegano', 'vegana']

/**
 * D-492 (G1 da revisão da publicação 2): "vegetal" sozinho não tira o leite nem a carne do nome ("Requeijão cremoso com
 * gordura vegetal" tem leite); só o nome do produto vegetal inteiro.
 */
const VEGETAIS_SEM_LEITE: readonly string[] = ['leite vegetal', 'bebida vegetal', 'iogurte vegetal', 'queijo vegetal']

/**
 * Termos para alimento fora da base (alimento próprio, receita), lidos no nome sem acento. `*` no fim casa o começo
 * da palavra ("requeij*" pega "requeijão"); sem `*`, só a palavra inteira ("mel" não pega "melancia"); `^` no começo
 * só casa no início do nome ("^torrada*" pega "Torradas integrais", não "castanha torrada"). O alimento próprio também
 * é lido pelo grupo (`restricoes.ts`, D-492).
 */
export interface TermosDaRestricao {
  readonly termos: readonly string[]
  /**
   * D-716n (spec base-ampliada, segurança de alergia): o nome de alimento que lembra o termo e não o leva ("couve
   * manteiga", "macarrão de arroz"). O trecho sai do nome e os termos são procurados no resto: "Couve manteiga refogada
   * na manteiga" continua pegando leite.
   */
  readonly excecoes: readonly string[]
  /** O que vale para o nome inteiro ("sem lactose", "vegano"): o produto é feito para quem tem a restrição. */
  readonly qualificadores: readonly string[]
}

export const TERMOS_POR_RESTRICAO: Readonly<Record<IdRestricaoDaBase, TermosDaRestricao>> = {
  leite: {
    termos: ['leite', 'leites', 'queijo*', 'iogurte*', 'requeij*', 'manteiga', 'creme de leite', 'nata', 'soro de leite', 'whey', 'caseina', 'ricota', 'coalhada', 'coalho', 'lacteo*', 'lactea*', 'chantilly', 'cream cheese', 'catupiry', 'muçarela', 'mucarela', 'mussarela', 'mozarela', 'parmesao', 'gorgonzola', 'kefir', 'petit suisse'],
    excecoes: ['leite de coco', 'leite de soja', 'leite de amendoa', 'leite de aveia', 'leite de arroz', 'leite de castanha', ...VEGETAIS_SEM_LEITE, 'queijo de soja', 'queijo vegano', 'manteiga de amendoim', 'manteiga de cacau', 'couve manteiga', 'couve-manteiga'],
    qualificadores: VEGANO,
  },
  lactose: {
    termos: ['leite', 'leites', 'iogurte*', 'requeij*', 'creme de leite', 'nata', 'ricota', 'coalhada', 'lacteo*', 'lactea*', 'doce de leite', 'leite condensado', 'minas frescal', 'petit suisse', 'cream cheese', 'catupiry', 'kefir', 'chantilly'],
    excecoes: ['leite de coco', 'leite de soja', 'leite de amendoa', 'leite de aveia', 'leite de arroz', 'leite de castanha', ...VEGETAIS_SEM_LEITE],
    qualificadores: ['sem lactose', 'zero lactose', '0% lactose', 'lactose free', ...VEGANO],
  },
  ovo: {
    termos: ['ovo', 'ovos', 'omelete', 'maionese', 'gema', 'gemas', 'clara', 'claras', 'quindim', 'suspiro', 'merengue'],
    excecoes: [],
    qualificadores: ['sem ovo', 'sem ovos', ...VEGANO],
  },
  // Espelta, triticale, kamut, farro, sêmola e semolina são trigo; tempeh e natto, soja (spec base-ampliada, D-717).
  trigo: {
    termos: ['trigo', 'pao', 'paes', 'macarrao', 'biscoito*', 'bolacha*', 'bolo', 'bolos', 'massa', 'lasanha', 'pizza', '^torrada*', 'farinha de rosca', 'empanad*', 'milanesa', 'pastel', 'pasteis', 'esfiha', 'esfirra', 'croissant', 'bulgur', 'quibe', 'kibe', 'nhoque', 'panqueca', 'wafer', 'cuscuz marroquino', 'seitan', 'shoyu', 'empada', 'coxinha', 'croquete', 'brownie', 'cookie*', 'espelta', 'triticale', 'kamut', 'farro', 'semola', 'semolina', 'farinha lactea'],
    excecoes: EXCECOES_DO_TRIGO,
    qualificadores: QUALIFICADORES_DO_TRIGO,
  },
  gluten: {
    termos: ['trigo', 'pao', 'paes', 'macarrao', 'biscoito*', 'bolacha*', 'bolo', 'bolos', 'massa', 'lasanha', 'pizza', '^torrada*', 'farinha de rosca', 'empanad*', 'milanesa', 'pastel', 'pasteis', 'esfiha', 'esfirra', 'croissant', 'bulgur', 'quibe', 'kibe', 'nhoque', 'panqueca', 'wafer', 'cuscuz marroquino', 'seitan', 'shoyu', 'empada', 'coxinha', 'croquete', 'brownie', 'cookie*', 'espelta', 'triticale', 'kamut', 'farro', 'semola', 'semolina', 'farinha lactea', 'centeio', 'cevada', 'aveia', 'malte', 'cerveja', 'granola'],
    excecoes: EXCECOES_DO_TRIGO,
    qualificadores: QUALIFICADORES_DO_TRIGO.filter((q) => q !== 'sem trigo'),
  },
  soja: {
    termos: ['soja', 'shoyu', 'tofu', 'edamame', 'misso', 'missô', 'lecitina de soja', 'tempeh', 'natto'],
    excecoes: ['oleo de soja'],
    qualificadores: [],
  },
  amendoim: {
    termos: ['amendoim', 'amendoins', 'pacoca', 'pe de moleque', 'pe-de-moleque'],
    excecoes: [],
    qualificadores: [],
  },
  castanhas: {
    termos: ['castanha*', 'amendoa*', 'noz', 'nozes', 'avela*', 'pistache*', 'macadamia', 'pinoli', 'nutella'],
    // A noz-moscada é semente de especiaria, não castanha (spec base-ampliada, D-716l).
    excecoes: ['castanha de cupuacu', 'noz moscada'],
    qualificadores: [],
  },
  peixe: {
    termos: ['peixe*', 'atum', 'sardinha*', 'salmao', 'bacalhau', 'tilapia', 'merluza', 'pescada', 'pescadinha', 'anchova', 'truta', 'linguado', 'robalo', 'corvina', 'pintado', 'tambaqui', 'pirarucu', 'surimi', 'manjuba', 'lambari', 'dourado', 'abadejo', 'tucunare', 'saint peter', 'badejo', 'namorado', 'cavala', 'arenque'],
    excecoes: [],
    qualificadores: [],
  },
  'frutos-do-mar': {
    termos: ['camarao', 'camaroes', 'caranguejo*', 'siri', 'lagosta*', 'lula', 'lulas', 'polvo', 'marisco*', 'mexilhao', 'mexilhoes', 'ostra*', 'vieira*', 'sururu', 'frutos do mar', 'kani', 'surimi'],
    excecoes: [],
    qualificadores: [],
  },
  // "Ovo de galinha" é ovo, não galinha (spec base-ampliada, D-716e).
  vegetariano: {
    termos: ['carne', 'carnes', 'frango', 'galinha', 'porco', 'suino*', 'bovino*', 'boi', 'presunto', 'bacon', 'linguica*', 'salsicha*', 'mortadela', 'salame', 'peito de peru', 'peru', 'hamburguer*', 'almondega*', 'charque', 'figado', 'toucinho', 'gelatina', 'mocoto', 'bife', 'costela', 'picanha', 'patinho', 'lombo', 'pernil', 'cordeiro', 'carneiro', 'pato', 'coxinha', 'atum', 'sardinha*', 'peixe*', 'salmao', 'bacalhau', 'tilapia', 'camarao', 'camaroes', 'frutos do mar', 'kani', 'surimi', 'caldo de carne', 'caldo de galinha'],
    excecoes: ['carne de soja', 'carne vegetal', 'proteina de soja', 'proteina vegetal', 'hamburguer vegetal', 'hamburguer de grao', 'hamburguer de soja', 'salsicha vegetal', 'linguica vegetal', 'ovo de galinha'],
    qualificadores: [...VEGANO, 'vegetariano', 'vegetariana', 'plant based'],
  },
  // Vegano é Vegetariano, Leite e derivados e Ovo pelos termos de cada um, e mais o mel (`restricoes.ts`).
  vegano: {
    termos: ['mel'],
    excecoes: [],
    qualificadores: VEGANO,
  },
}
