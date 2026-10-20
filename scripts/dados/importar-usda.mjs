// Grava src/data/complemento-usda.json a partir da proposta revisada de equivalentes USDA (spec vitaminas-usda).
// Uso: node scripts/dados/importar-usda.mjs <proposta.json> [saída]
//
// A proposta (fora do repositório) foi montada em 20/10/2026 a partir dos CSVs oficiais do USDA FoodData Central:
// para cada alimento da TACO, o equivalente americano, o grau de confiança e os seis valores já com as regras
// aplicadas (fortificação americana fora, ajuste de densidade). Este script não refaz a escolha: só confere e copia.
//
// Regras:
// - entra só confiança "alta" e "media"; "baixa" e "sem" ficam fora (D-301)
// - valor ausente fica nulo, nunca zero; zero só quando o USDA publicou zero
// - nutriente que a proposta marcou como "não copiar" (fortificação americana, trans antiga) tem de vir nulo
// - qualquer problema para o script antes de gravar: nada é escrito pela metade
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DESTINO = join(raiz, 'src', 'data', 'complemento-usda.json')
const TACO = join(raiz, 'src', 'data', 'alimentos.json')
const USO = 'Uso: node scripts/dados/importar-usda.mjs <proposta.json> [saída]'

export const FONTE = {
  nome: 'USDA FoodData Central',
  autor: 'U.S. Department of Agriculture, Agricultural Research Service',
  citacao: 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019. fdc.nal.usda.gov.',
  licenca: 'CC0 1.0 Universal (domínio público)',
  url: 'https://fdc.nal.usda.gov/',
  baixadoEm: '2026-10-20',
  base: '100 g de parte comestível',
  conjuntos: [
    {
      nome: 'SR Legacy',
      versao: '2018-04',
      arquivo: 'FoodData_Central_sr_legacy_food_csv_2018-04.zip',
      url: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip',
      sha256: 'b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0',
    },
    {
      nome: 'Foundation Foods',
      versao: '2026-04',
      arquivo: 'FoodData_Central_foundation_food_csv_2026-04-30.zip',
      url: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_csv_2026-04-30.zip',
      sha256: '70457ee9d9342f43bda2010318c85f04210c689fdeb9cd2da4c513b0e8dbc655',
    },
  ],
  criterio:
    'Alimento equivalente ao da TACO, revisado à mão em 20/10/2026; só confiança alta ou média. Fortificação americana (leite, cereal, margarina) não é copiada; folato de farinha enriquecida fica, porque a farinha brasileira também é enriquecida por lei (RDC Anvisa 604/2022).',
}

/** Na ordem em que a ficha do alimento mostra. Faixa: o máximo plausível por 100 g. */
export const NUTRIENTES = [
  { chave: 'vitamina_d_mcg', unidade: 'µg', rotulo: 'Vitamina D', maximo: 50 },
  { chave: 'vitamina_e_mg', unidade: 'mg', rotulo: 'Vitamina E (alfa-tocoferol)', maximo: 50 },
  { chave: 'folato_dfe_mcg', unidade: 'µg', rotulo: 'Folato (DFE)', maximo: 1000 },
  { chave: 'vitamina_b12_mcg', unidade: 'µg', rotulo: 'Vitamina B12', maximo: 100 },
  { chave: 'selenio_mcg', unidade: 'µg', rotulo: 'Selênio', maximo: 2000 },
  { chave: 'gordura_trans_g', unidade: 'g', rotulo: 'Gordura trans', maximo: 5 },
]

/** Como a proposta escreve o conjunto do candidato. */
const CONJUNTOS = new Map([
  ['SR Legacy (abr/2018)', { conjunto: 'SR Legacy', versao: '2018-04' }],
  ['Foundation Foods (abr/2026)', { conjunto: 'Foundation Foods', versao: '2026-04' }],
])

const CONFIANCAS = new Set(['alta', 'media', 'baixa', 'sem'])
const ACEITAS = new Set(['alta', 'media'])

function falhar(mensagem) {
  throw new Error(mensagem)
}

function conferirValores(item) {
  const propostos = item.valoresPropostos
  if (typeof propostos !== 'object' || propostos === null) falhar(`TACO ${item.tacoId}: sem valoresPropostos.`)
  const valores = {}
  for (const { chave, maximo } of NUTRIENTES) {
    if (!(chave in propostos)) falhar(`TACO ${item.tacoId}: falta ${chave} em valoresPropostos.`)
    const v = propostos[chave]
    if (v !== null && (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > maximo)) {
      falhar(`TACO ${item.tacoId}: ${chave} = ${v} fora da faixa (0 a ${maximo}).`)
    }
    valores[chave] = v
  }
  if (NUTRIENTES.every(({ chave }) => valores[chave] === null)) falhar(`TACO ${item.tacoId}: todos os valores são nulos.`)
  return valores
}

/**
 * Confere a proposta inteira e devolve o complemento. `idsDaTaco` é o conjunto de ids de `alimentos.json`.
 * Lança erro no primeiro problema: o arquivo só é gravado quando tudo passa.
 */
export function montarComplemento(proposta, idsDaTaco) {
  if (!Array.isArray(proposta)) falhar('A proposta precisa ser uma lista de alimentos.')
  const vistos = new Set()
  const alimentos = []
  for (const item of proposta) {
    const id = item?.tacoId
    if (!Number.isInteger(id) || !idsDaTaco.has(id)) falhar(`Id ${id} não existe na TACO.`)
    if (vistos.has(id)) falhar(`Id ${id} aparece mais de uma vez.`)
    vistos.add(id)
    if (!CONFIANCAS.has(item.confianca)) falhar(`TACO ${id}: confiança desconhecida "${item.confianca}".`)
    if (!ACEITAS.has(item.confianca)) continue

    const escolhido = (item.candidatos ?? []).find((c) => c.fdcId === item.escolha)
    if (!escolhido || !Number.isInteger(escolhido.fdcId) || escolhido.fdcId <= 0) falhar(`TACO ${id}: a escolha ${item.escolha} não está entre os candidatos.`)
    const origem = CONJUNTOS.get(escolhido.dataset)
    if (!origem) falhar(`TACO ${id}: conjunto desconhecido "${escolhido.dataset}".`)
    const valores = conferirValores(item)
    for (const chave of escolhido.naoCopiar ?? []) {
      if (valores[chave] !== undefined && valores[chave] !== null) falhar(`TACO ${id}: ${chave} está marcado para não copiar e veio com valor.`)
    }

    const saida = { id, fdcId: escolhido.fdcId, conjunto: origem.conjunto, versao: origem.versao, confianca: item.confianca, valores }
    if (item.ajuste) {
      const { fator, base } = item.ajuste
      if (typeof fator !== 'number' || !(fator > 0) || (base !== 'energia' && base !== 'proteína')) falhar(`TACO ${id}: ajuste inválido.`)
      saida.ajuste = { fator, base }
    }
    alimentos.push(saida)
  }
  alimentos.sort((a, b) => a.id - b.id)
  return {
    fonte: FONTE,
    nutrientes: NUTRIENTES.map(({ chave, unidade, rotulo }) => ({ chave, unidade, rotulo })),
    alimentos,
  }
}

function principal(argumentos) {
  const [entrada, saida = DESTINO] = argumentos
  if (!entrada) {
    console.error(USO)
    process.exit(1)
  }
  let proposta
  try {
    proposta = JSON.parse(readFileSync(entrada, 'utf8'))
  } catch (erro) {
    console.error(`Não consegui ler a proposta (${erro.message}).\n${USO}`)
    process.exit(1)
  }
  const idsDaTaco = new Set(JSON.parse(readFileSync(TACO, 'utf8')).alimentos.map((a) => a.id))
  let complemento
  try {
    complemento = montarComplemento(proposta, idsDaTaco)
  } catch (erro) {
    console.error(`Proposta recusada: ${erro.message}`)
    process.exit(1)
  }
  writeFileSync(saida, `${JSON.stringify(complemento, null, 1)}\n`)
  console.log(`${complemento.alimentos.length} alimentos gravados em ${saida}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal(process.argv.slice(2))
