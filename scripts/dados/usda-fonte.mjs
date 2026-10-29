// Leitura dos arquivos oficiais do USDA FoodData Central (spec base-ampliada, D-700 e D-701).
// Só o que o Node já tem: o zip é lido com o zlib, o CSV e o JSON sem biblioteca. Nenhum número é escrito à mão: tudo
// sai do arquivo da fonte, e a conversão de unidade fica aqui, num lugar só.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'

/** O SHA-256 do arquivo, para conferir que o cache é o arquivo oficial baixado. */
export function sha256(caminho) {
  return createHash('sha256').update(readFileSync(caminho)).digest('hex')
}

/**
 * Os arquivos de dentro de um zip, pelo nome. Lê o diretório central do fim do arquivo (sem ZIP64: os arquivos do USDA
 * têm menos de 4 GB) e descomprime cada entrada só quando pedida.
 */
export function lerZip(caminho) {
  const zip = readFileSync(caminho)
  let fim = -1
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      fim = i
      break
    }
  }
  if (fim < 0) throw new Error(`${caminho} não é um zip.`)
  const total = zip.readUInt16LE(fim + 10)
  let p = zip.readUInt32LE(fim + 16)
  const entradas = new Map()
  for (let n = 0; n < total; n++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error(`${caminho}: diretório central estragado.`)
    const metodo = zip.readUInt16LE(p + 10)
    const comprimido = zip.readUInt32LE(p + 20)
    const tamanhoNome = zip.readUInt16LE(p + 28)
    const extra = zip.readUInt16LE(p + 30)
    const comentario = zip.readUInt16LE(p + 32)
    const local = zip.readUInt32LE(p + 42)
    const nome = zip.subarray(p + 46, p + 46 + tamanhoNome).toString('utf8')
    entradas.set(nome, { metodo, comprimido, local })
    p += 46 + tamanhoNome + extra + comentario
  }
  return {
    nomes: () => [...entradas.keys()],
    ler(nome) {
      const e = entradas.get(nome)
      if (!e) throw new Error(`${caminho}: não tem ${nome}.`)
      const inicio = e.local + 30 + zip.readUInt16LE(e.local + 26) + zip.readUInt16LE(e.local + 28)
      const dados = zip.subarray(inicio, inicio + e.comprimido)
      if (e.metodo === 0) return Buffer.from(dados)
      if (e.metodo === 8) return inflateRawSync(dados)
      throw new Error(`${caminho}: método de compressão ${e.metodo} não suportado em ${nome}.`)
    },
  }
}

/** CSV com aspas duplas (o formato do USDA), em lista de objetos pelo cabeçalho. */
export function lerCsv(texto) {
  const linhas = []
  let campo = ''
  let linha = []
  let aspas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"'
          i++
        } else aspas = false
      } else campo += c
    } else if (c === '"') aspas = true
    else if (c === ',') {
      linha.push(campo)
      campo = ''
    } else if (c === '\n') {
      linha.push(campo)
      linhas.push(linha)
      linha = []
      campo = ''
    } else if (c !== '\r') campo += c
  }
  if (campo !== '' || linha.length > 0) {
    linha.push(campo)
    linhas.push(linha)
  }
  const [cabecalho, ...resto] = linhas
  return resto.filter((r) => r.length > 1 || r[0] !== '').map((r) => Object.fromEntries(cabecalho.map((h, j) => [h, r[j] ?? ''])))
}

/** Número do arquivo; vazio ou texto vira `null` (nunca zero). */
const numero = (texto) => {
  if (texto === undefined || texto === null || String(texto).trim() === '') return null
  const n = Number(texto)
  return Number.isFinite(n) ? n : null
}

/**
 * Os nutrientes do USDA que a base usa, pelo id do FoodData Central, com a unidade que o arquivo tem de trazer. A
 * conversão para a chave do MetaNutri fica em `valoresDoAlimento`.
 */
export const NUTRIENTES_USDA = {
  1008: { nome: 'Energy', unidade: 'KCAL' },
  2047: { nome: 'Energy (Atwater General Factors)', unidade: 'KCAL' },
  2048: { nome: 'Energy (Atwater Specific Factors)', unidade: 'KCAL' },
  1003: { nome: 'Protein', unidade: 'G' },
  1004: { nome: 'Total lipid (fat)', unidade: 'G' },
  1085: { nome: 'Total fat (NLEA)', unidade: 'G' },
  1005: { nome: 'Carbohydrate, by difference', unidade: 'G' },
  1079: { nome: 'Fiber, total dietary', unidade: 'G' },
  2000: { nome: 'Sugars, Total', unidade: 'G' },
  1063: { nome: 'Sugars, Total NLEA', unidade: 'G' },
  1258: { nome: 'Fatty acids, total saturated', unidade: 'G' },
  1257: { nome: 'Fatty acids, total trans', unidade: 'G' },
  1253: { nome: 'Cholesterol', unidade: 'MG' },
  1087: { nome: 'Calcium, Ca', unidade: 'MG' },
  1090: { nome: 'Magnesium, Mg', unidade: 'MG' },
  1101: { nome: 'Manganese, Mn', unidade: 'MG' },
  1091: { nome: 'Phosphorus, P', unidade: 'MG' },
  1089: { nome: 'Iron, Fe', unidade: 'MG' },
  1093: { nome: 'Sodium, Na', unidade: 'MG' },
  1092: { nome: 'Potassium, K', unidade: 'MG' },
  1098: { nome: 'Copper, Cu', unidade: 'MG' },
  1095: { nome: 'Zinc, Zn', unidade: 'MG' },
  1103: { nome: 'Selenium, Se', unidade: 'UG' },
  1106: { nome: 'Vitamin A, RAE', unidade: 'UG' },
  1105: { nome: 'Retinol', unidade: 'UG' },
  1107: { nome: 'Carotene, beta', unidade: 'UG' },
  1108: { nome: 'Carotene, alpha', unidade: 'UG' },
  1120: { nome: 'Cryptoxanthin, beta', unidade: 'UG' },
  1165: { nome: 'Thiamin', unidade: 'MG' },
  1166: { nome: 'Riboflavin', unidade: 'MG' },
  1175: { nome: 'Vitamin B-6', unidade: 'MG' },
  1167: { nome: 'Niacin', unidade: 'MG' },
  1162: { nome: 'Vitamin C, total ascorbic acid', unidade: 'MG' },
  1114: { nome: 'Vitamin D (D2 + D3)', unidade: 'UG' },
  1110: { nome: 'Vitamin D (D2 + D3), International Units', unidade: 'IU' },
  1109: { nome: 'Vitamin E (alpha-tocopherol)', unidade: 'MG' },
  1190: { nome: 'Folate, DFE', unidade: 'UG' },
  1177: { nome: 'Folate, total', unidade: 'UG' },
  1186: { nome: 'Folic acid', unidade: 'UG' },
  1187: { nome: 'Folate, food', unidade: 'UG' },
  1178: { nome: 'Vitamin B-12', unidade: 'UG' },
}

/** Fator para levar a unidade do arquivo à unidade esperada; outra combinação para o script. */
const FATORES = { 'G>G': 1, 'MG>MG': 1, 'UG>UG': 1, 'KCAL>KCAL': 1, 'IU>IU': 1, 'MG>UG': 1000, 'UG>MG': 0.001, 'G>MG': 1000 }

/** O CSV escreve "UG"; o JSON da Foundation, "µg". */
const unidadeNormal = (u) => {
  const maiuscula = u.trim().toUpperCase()
  return maiuscula === 'µG' || maiuscula === 'ΜG' || maiuscula === 'MCG' ? 'UG' : maiuscula
}

function converter(valor, unidadeDoArquivo, id) {
  const esperada = NUTRIENTES_USDA[id].unidade
  const fator = FATORES[`${unidadeNormal(unidadeDoArquivo)}>${esperada}`]
  if (fator === undefined) throw new Error(`Nutriente ${id} veio em ${unidadeDoArquivo}, esperado ${esperada}.`)
  return valor * fator
}

/** Porção do USDA: quantidade, nome da medida (unidade e modificador) e o peso em gramas. */
function porcao(quantidade, unidade, modificador, descricao, gramas, ordem) {
  return { quantidade: numero(quantidade), unidade: (unidade ?? '').trim(), modificador: (modificador ?? '').trim(), descricao: (descricao ?? '').trim(), gramas: numero(gramas), ordem: numero(ordem) ?? 0 }
}

/** Os alimentos do SR Legacy (CSV de abril de 2018), com os nutrientes da tabela acima e as porções. */
export function alimentosDoSrLegacy(caminhoZip) {
  const zip = lerZip(caminhoZip)
  const pasta = zip.nomes().find((n) => n.endsWith('/food.csv'))?.replace(/food\.csv$/, '')
  if (!pasta) throw new Error(`${caminhoZip}: sem food.csv.`)
  const csv = (nome) => lerCsv(zip.ler(pasta + nome).toString('utf8'))
  const categorias = new Map(csv('food_category.csv').map((c) => [c.id, c.description]))
  const unidadesDoNutriente = new Map(csv('nutrient.csv').map((n) => [Number(n.id), n.unit_name]))
  const unidadesDeMedida = new Map(csv('measure_unit.csv').map((u) => [u.id, u.name]))
  const alimentos = new Map()
  for (const f of csv('food.csv')) {
    alimentos.set(Number(f.fdc_id), {
      fdcId: Number(f.fdc_id),
      conjunto: 'SR Legacy',
      versao: '2018-04',
      descricao: f.description,
      categoria: categorias.get(f.food_category_id) ?? '',
      nutrientes: new Map(),
      porcoes: [],
    })
  }
  for (const n of csv('food_nutrient.csv')) {
    const id = Number(n.nutrient_id)
    if (!(id in NUTRIENTES_USDA)) continue
    const a = alimentos.get(Number(n.fdc_id))
    const valor = numero(n.amount)
    if (!a || valor === null) continue
    a.nutrientes.set(id, converter(valor, unidadesDoNutriente.get(id) ?? '', id))
  }
  for (const p of csv('food_portion.csv')) {
    const a = alimentos.get(Number(p.fdc_id))
    if (!a) continue
    const unidade = p.measure_unit_id === '9999' ? '' : (unidadesDeMedida.get(p.measure_unit_id) ?? '')
    a.porcoes.push(porcao(p.amount, unidade, p.modifier, p.portion_description, p.gram_weight, p.seq_num))
  }
  return [...alimentos.values()]
}

/** Os alimentos do Foundation Foods (JSON da versão de outubro de 2026), no mesmo formato. */
export function alimentosDaFoundation(caminhoZip, versao) {
  const zip = lerZip(caminhoZip)
  const nome = zip.nomes().find((n) => n.endsWith('.json'))
  if (!nome) throw new Error(`${caminhoZip}: sem o JSON.`)
  const lista = JSON.parse(zip.ler(nome).toString('utf8')).FoundationFoods
  if (!Array.isArray(lista)) throw new Error(`${caminhoZip}: sem FoundationFoods.`)
  return lista.map((f) => {
    const nutrientes = new Map()
    for (const fn of f.foodNutrients ?? []) {
      const id = fn.nutrient?.id
      if (!(id in NUTRIENTES_USDA)) continue
      const valor = numero(fn.amount)
      if (valor === null) continue
      nutrientes.set(id, converter(valor, fn.nutrient.unitName ?? '', id))
    }
    const porcoes = (f.foodPortions ?? []).map((p) =>
      porcao(p.amount ?? p.value, p.measureUnit?.name === 'undetermined' ? '' : (p.measureUnit?.name ?? ''), p.modifier, p.portionDescription, p.gramWeight, p.sequenceNumber),
    )
    return { fdcId: f.fdcId, conjunto: 'Foundation Foods', versao, descricao: f.description, categoria: f.foodCategory?.description ?? '', nutrientes, porcoes }
  })
}

const MARCA_DE_FORTIFICACAO = /fortified|enriched|with added|vitamin [a-z0-9 ]*added|added vitamin/i

/**
 * Os valores do alimento nas chaves do MetaNutri (`ChaveNutrienteAlimento`), por 100 g. Nutriente que o arquivo não
 * traz é `null`, nunca zero. As regras de conversão:
 * - energia: "Energy" (1008); sem ela, Atwater específico (2048) e, por último, o geral (2047);
 * - gordura total: 1004; sem ela, a NLEA (1085). Carboidrato só por diferença (1005), como a TACO;
 * - açúcares: 2000; sem ele, o NLEA (1063);
 * - vitamina A em RAE (1106); sem ela, a soma das partes em µg (retinol + betacaroteno ÷ 12 + alfacaroteno e
 *   betacriptoxantina ÷ 24), só com o retinol e o betacaroteno publicados. UI de vitamina A nunca é convertida, porque
 *   não diz quanto é retinol e quanto é caroteno;
 * - vitamina D em µg (1114); sem ela, as UI (1110) ÷ 40;
 * - folato em DFE (1190); sem ele, folato do alimento + 1,7 × ácido fólico; sem as partes, o folato total só quando o
 *   nome não diz enriquecido ou fortificado (no alimento sem adição, o total é o folato do alimento).
 */
export function valoresDoAlimento(bruto) {
  // Valor negativo publicado (o carboidrato "por diferença" da Foundation, com o erro da análise) não é dado: nulo.
  const n = (id) => (bruto.nutrientes.has(id) && bruto.nutrientes.get(id) >= 0 ? bruto.nutrientes.get(id) : null)
  const primeiro = (...ids) => {
    for (const id of ids) if (n(id) !== null) return n(id)
    return null
  }
  let vitaminaA = n(1106)
  if (vitaminaA === null && n(1105) !== null && n(1107) !== null) vitaminaA = n(1105) + n(1107) / 12 + (n(1108) ?? 0) / 24 + (n(1120) ?? 0) / 24
  let vitaminaD = n(1114)
  if (vitaminaD === null && n(1110) !== null) vitaminaD = n(1110) / 40
  let folato = n(1190)
  if (folato === null && n(1187) !== null) folato = n(1187) + 1.7 * (n(1186) ?? 0)
  if (folato === null && n(1177) !== null && n(1186) !== null) folato = n(1177) - n(1186) + 1.7 * n(1186)
  if (folato === null && n(1177) !== null && !MARCA_DE_FORTIFICACAO.test(bruto.descricao)) folato = n(1177)
  return {
    energia_kcal: primeiro(1008, 2048, 2047),
    proteina_g: n(1003),
    lipideos_g: primeiro(1004, 1085),
    carboidrato_g: n(1005),
    acucares_g: primeiro(2000, 1063),
    gordura_saturada_g: n(1258),
    fibra_g: n(1079),
    colesterol_mg: n(1253),
    calcio_mg: n(1087),
    magnesio_mg: n(1090),
    manganes_mg: n(1101),
    fosforo_mg: n(1091),
    ferro_mg: n(1089),
    sodio_mg: n(1093),
    potassio_mg: n(1092),
    cobre_mg: n(1098),
    zinco_mg: n(1095),
    vitamina_a_rae_mcg: vitaminaA,
    tiamina_mg: n(1165),
    riboflavina_mg: n(1166),
    piridoxina_mg: n(1175),
    niacina_mg: n(1167),
    vitamina_c_mg: n(1162),
    vitamina_d_mcg: vitaminaD,
    vitamina_e_mg: n(1109),
    folato_dfe_mcg: folato,
    vitamina_b12_mcg: n(1178),
    selenio_mcg: n(1103),
    gordura_trans_g: n(1257),
  }
}
